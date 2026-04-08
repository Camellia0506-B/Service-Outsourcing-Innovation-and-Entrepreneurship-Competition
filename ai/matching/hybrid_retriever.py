"""
Hybrid 检索与推荐组件（岗位匹配模块专用）
================================================
目标：解决“搜索/推荐/分析都很像”的同质化问题。

实现：Hybrid（BM25/关键词 + 双塔向量召回）→（可选）Cross-Encoder 精排→ MMR 多样性重排

说明：
- 该文件只依赖标准库；若环境安装了 rank_bm25 / numpy / faiss / sentence-transformers，将自动启用更强能力。
- 未安装依赖时会自动降级，不影响服务可用性。
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple

from utils.logger_handler import logger

try:
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover
    np = None  # type: ignore

try:
    import faiss  # type: ignore
    _FAISS_AVAILABLE = True
except Exception:  # pragma: no cover
    faiss = None  # type: ignore
    _FAISS_AVAILABLE = False

try:
    import hnswlib  # type: ignore
    _HNSW_AVAILABLE = True
except Exception:  # pragma: no cover
    hnswlib = None  # type: ignore
    _HNSW_AVAILABLE = False

try:
    from rank_bm25 import BM25Okapi  # type: ignore
    _BM25_AVAILABLE = True
except Exception:  # pragma: no cover
    BM25Okapi = None  # type: ignore
    _BM25_AVAILABLE = False

try:
    # sentence-transformers 也可能提供 CrossEncoder
    from sentence_transformers import CrossEncoder  # type: ignore
    _CROSS_ENCODER_AVAILABLE = True
except Exception:  # pragma: no cover
    CrossEncoder = None  # type: ignore
    _CROSS_ENCODER_AVAILABLE = False


_TOKEN_SPLIT_RE = re.compile(r"[\s,，;；/\\|]+")


def _tokenize(text: str) -> List[str]:
    text = (text or "").strip().lower()
    if not text:
        return []
    # 简单分词：英文按空白/标点分；中文保留 2-gram + 3-gram 提升 BM25 区分度
    parts = [p for p in _TOKEN_SPLIT_RE.split(text) if p]
    grams: List[str] = []
    zh = re.sub(r"[^\u4e00-\u9fff]+", "", text)
    if len(zh) >= 2:
        grams.extend([zh[i:i + 2] for i in range(len(zh) - 1)])
    if len(zh) >= 3:
        grams.extend([zh[i:i + 3] for i in range(len(zh) - 2)])
    return parts + grams


def _minmax_norm(scores: Dict[str, float]) -> Dict[str, float]:
    if not scores:
        return {}
    vals = list(scores.values())
    mn, mx = min(vals), max(vals)
    if mx - mn < 1e-9:
        return {k: 0.0 for k in scores}
    return {k: (v - mn) / (mx - mn) for k, v in scores.items()}


def _cosine_sim(a, b) -> float:
    if np is None:
        return 0.0
    denom = float(np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0


@dataclass
class HybridCandidate:
    job_id: str
    score: float
    bm25_score: float
    vec_score: float
    rerank_score: Optional[float] = None


class _FallbackBM25:
    """
    无 rank_bm25 时的轻量 BM25-ish 实现（避免引入强依赖）。
    仅用于兜底，不追求完全对齐 BM25Okapi。
    """

    def __init__(self, corpus_tokens: List[List[str]]):
        self.corpus_tokens = corpus_tokens
        self.N = len(corpus_tokens)
        self.df: Dict[str, int] = {}
        self.avgdl = 0.0
        for doc in corpus_tokens:
            seen = set(doc)
            for t in seen:
                self.df[t] = self.df.get(t, 0) + 1
        self.avgdl = (sum(len(d) for d in corpus_tokens) / self.N) if self.N else 0.0

    def get_scores(self, query_tokens: List[str]) -> List[float]:
        k1 = 1.2
        b = 0.75
        q = query_tokens or []
        scores = []
        for doc in self.corpus_tokens:
            dl = len(doc) or 1
            tf: Dict[str, int] = {}
            for t in doc:
                tf[t] = tf.get(t, 0) + 1
            s = 0.0
            for t in q:
                df = self.df.get(t, 0)
                if df <= 0:
                    continue
                # idf（带平滑）
                idf = math.log(1.0 + (self.N - df + 0.5) / (df + 0.5))
                f = tf.get(t, 0)
                if f <= 0:
                    continue
                denom = f + k1 * (1 - b + b * dl / (self.avgdl or 1.0))
                s += idf * (f * (k1 + 1) / (denom + 1e-9))
            scores.append(s)
        return scores


class HybridRetriever:
    """
    Hybrid 检索器：
    - BM25（关键词/短语）
    - 双塔向量相似度（query/doc 各自编码）
    - （可选）Cross-Encoder 精排
    - MMR 多样性重排
    """

    def __init__(
        self,
        job_texts: Dict[str, str],
        embed_fn: Callable[[str], Optional[object]],
        *,
        enable_faiss: bool = True,
        enable_bm25: bool = True,
    ):
        self.job_texts = job_texts
        self.embed_fn = embed_fn
        self.enable_bm25 = enable_bm25
        self.enable_faiss = enable_faiss and _FAISS_AVAILABLE and np is not None
        self.enable_hnsw = (np is not None) and _HNSW_AVAILABLE and not self.enable_faiss

        self._job_ids: List[str] = []
        self._tokens: List[List[str]] = []
        self._bm25 = None

        self._emb_mat = None
        self._faiss = None
        self._hnsw = None

        self._cross = None

        self._build()

    def _build(self) -> None:
        self._job_ids = list(self.job_texts.keys())
        texts = [self.job_texts[jid] for jid in self._job_ids]

        # BM25
        if self.enable_bm25:
            self._tokens = [_tokenize(t) for t in texts]
            if _BM25_AVAILABLE and BM25Okapi is not None:
                try:
                    self._bm25 = BM25Okapi(self._tokens)
                    logger.info("[Hybrid] BM25Okapi 已启用")
                except Exception as e:
                    logger.warning(f"[Hybrid] BM25Okapi 初始化失败，回退到简易BM25: {e}")
                    self._bm25 = _FallbackBM25(self._tokens)
            else:
                self._bm25 = _FallbackBM25(self._tokens)
                logger.info("[Hybrid] rank_bm25 未安装，使用简易BM25兜底")

        # 向量索引（FAISS 优先，其次 HNSW）
        if self.enable_faiss or self.enable_hnsw:
            vecs = []
            keep_ids = []
            for jid, t in zip(self._job_ids, texts):
                v = self.embed_fn(t)
                if v is None:
                    continue
                vecs.append(np.asarray(v, dtype="float32") if np is not None else v)
                keep_ids.append(jid)
            if vecs:
                mat = np.vstack([np.asarray(v, dtype="float32") for v in vecs]).astype("float32")
                # 统一归一化，方便 cosine / inner-product
                norms = np.linalg.norm(mat, axis=1, keepdims=True) + 1e-9
                mat = mat / norms
                dim = mat.shape[1]
                self._emb_mat = mat
                if self.enable_faiss:
                    faiss.normalize_L2(mat)
                    index = faiss.IndexFlatIP(dim)
                    index.add(mat)
                    self._faiss = (index, keep_ids)
                    logger.info(f"[Hybrid] FAISS 向量索引已构建，共 {len(keep_ids)} 条岗位")
                elif self.enable_hnsw:
                    # HNSW cosine：距离为 1 - cosine_sim
                    index = hnswlib.Index(space="cosine", dim=dim)
                    index.init_index(max_elements=len(keep_ids), ef_construction=200, M=16)
                    index.add_items(mat, list(range(len(keep_ids))))
                    index.set_ef(64)
                    self._hnsw = (index, keep_ids)
                    logger.info(f"[Hybrid] HNSW 向量索引已构建，共 {len(keep_ids)} 条岗位")
            else:
                logger.warning("[Hybrid] 向量构建为空，将仅使用BM25/规则召回")

    def enable_cross_encoder(self, model_name: str = "BAAI/bge-reranker-base") -> bool:
        if not _CROSS_ENCODER_AVAILABLE or CrossEncoder is None:
            logger.warning("[Hybrid] CrossEncoder 不可用（缺少 sentence-transformers CrossEncoder）")
            return False
        try:
            self._cross = CrossEncoder(model_name)
            logger.info(f"[Hybrid] CrossEncoder 已启用: {model_name}")
            return True
        except Exception as e:
            logger.warning(f"[Hybrid] CrossEncoder 初始化失败: {e}")
            self._cross = None
            return False

    def _bm25_scores(self, query: str) -> Dict[str, float]:
        if not self._bm25:
            return {}
        q = _tokenize(query)
        raw = self._bm25.get_scores(q)
        return {jid: float(s) for jid, s in zip(self._job_ids, raw)}

    def _vec_scores(self, query: str, top_k: int) -> Dict[str, float]:
        if np is None:
            return {}
        qv = self.embed_fn(query)
        if qv is None:
            return {}
        q = np.asarray([np.asarray(qv, dtype="float32")], dtype="float32")
        q = q / (np.linalg.norm(q, axis=1, keepdims=True) + 1e-9)

        # FAISS
        if self._faiss is not None and self.enable_faiss:
            index, keep_ids = self._faiss
            faiss.normalize_L2(q)
            scores, idxs = index.search(q, top_k)
            out: Dict[str, float] = {}
            for idx, score in zip(idxs[0], scores[0]):
                if idx < 0:
                    continue
                out[keep_ids[int(idx)]] = float(score)
            return out

        # HNSW
        if self._hnsw is not None and self.enable_hnsw:
            index, keep_ids = self._hnsw
            labels, distances = index.knn_query(q, k=top_k)
            out: Dict[str, float] = {}
            for lab, dist in zip(labels[0], distances[0]):
                if lab < 0:
                    continue
                # cosine distance -> similarity
                out[keep_ids[int(lab)]] = float(1.0 - dist)
            return out

        return {}

    def retrieve(
        self,
        query: str,
        *,
        top_k: int = 200,
        alpha: float = 0.35,
        vec_top_k: int = 300,
    ) -> List[HybridCandidate]:
        """
        Hybrid 召回：
        - score = alpha * bm25_norm + (1-alpha) * vec_norm
        """
        query = (query or "").strip()
        if not query:
            return []

        bm25 = self._bm25_scores(query) if self.enable_bm25 else {}
        vec = self._vec_scores(query, top_k=vec_top_k)

        # 若 BM25 与向量都没有任何有效信号，直接返回空（交由上层回退到旧逻辑）
        max_bm25 = max(bm25.values()) if bm25 else 0.0
        if max_bm25 <= 1e-12 and not vec:
            return []

        bm25n = _minmax_norm(bm25)
        vecn = _minmax_norm(vec)

        all_ids = set(bm25.keys()) | set(vec.keys())
        candidates: List[HybridCandidate] = []
        for jid in all_ids:
            b = bm25n.get(jid, 0.0)
            v = vecn.get(jid, 0.0)
            s = alpha * b + (1.0 - alpha) * v
            candidates.append(HybridCandidate(job_id=jid, score=float(s), bm25_score=float(b), vec_score=float(v)))

        candidates.sort(key=lambda x: x.score, reverse=True)
        # 若归一化后仍全部为 0，说明缺少匹配信号（常见于查询词完全不在语料中）
        if not candidates or (candidates[0].score <= 1e-12 and all(c.score <= 1e-12 for c in candidates[: min(len(candidates), 20)])):
            return []
        return candidates[:top_k]

    def cross_rerank(self, query: str, candidates: List[HybridCandidate], *, top_k: int = 50) -> List[HybridCandidate]:
        """
        Cross-Encoder 精排（可选）：
        - 仅对前 top_k 做 rerank，避免成本过高
        """
        if not self._cross or not candidates:
            return candidates
        top = candidates[:top_k]
        pairs = [(query, self.job_texts.get(c.job_id, "")) for c in top]
        try:
            scores = self._cross.predict(pairs)
            for c, s in zip(top, scores):
                c.rerank_score = float(s)
            top.sort(key=lambda x: (x.rerank_score if x.rerank_score is not None else x.score), reverse=True)
            return top + candidates[top_k:]
        except Exception as e:
            logger.warning(f"[Hybrid] CrossEncoder rerank 失败，跳过: {e}")
            return candidates

    def mmr_rerank(
        self,
        query: str,
        candidates: List[HybridCandidate],
        *,
        top_n: int = 20,
        lambda_diversity: float = 0.7,
    ) -> List[HybridCandidate]:
        """
        MMR 多样性重排：
        - 选择既相关又与已选结果不重复的岗位
        """
        if np is None or not candidates:
            return candidates[:top_n]
        # 需要向量支持（embed_fn）
        qv = self.embed_fn(query)
        if qv is None:
            return candidates[:top_n]

        # 预计算候选向量
        cand_vecs: Dict[str, object] = {}
        for c in candidates[: max(top_n * 10, 50)]:
            t = self.job_texts.get(c.job_id, "")
            v = self.embed_fn(t)
            if v is not None:
                cand_vecs[c.job_id] = v

        selected: List[HybridCandidate] = []
        selected_ids: List[str] = []

        # relevance 取 rerank_score（若有）否则取 hybrid score
        rel: Dict[str, float] = {c.job_id: float(c.rerank_score if c.rerank_score is not None else c.score) for c in candidates}

        def diversity_penalty(jid: str) -> float:
            if not selected_ids:
                return 0.0
            v = cand_vecs.get(jid)
            if v is None:
                return 0.0
            return max(_cosine_sim(v, cand_vecs.get(sid)) for sid in selected_ids if cand_vecs.get(sid) is not None)

        pool = [c for c in candidates if c.job_id in cand_vecs]
        used = set()
        while len(selected) < top_n and pool:
            best = None
            best_score = -1e9
            for c in pool:
                if c.job_id in used:
                    continue
                r = rel.get(c.job_id, c.score)
                d = diversity_penalty(c.job_id)
                mmr = lambda_diversity * r - (1.0 - lambda_diversity) * d
                if mmr > best_score:
                    best_score = mmr
                    best = c
            if best is None:
                break
            used.add(best.job_id)
            selected.append(best)
            selected_ids.append(best.job_id)

        if len(selected) < top_n:
            # 补齐
            for c in candidates:
                if c.job_id not in {x.job_id for x in selected}:
                    selected.append(c)
                if len(selected) >= top_n:
                    break
        return selected[:top_n]

