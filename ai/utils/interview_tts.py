"""
Mock interview: short TTS segments for streaming playback (DashScope speech stack).
Used with multimodal pipeline: ASR (realtime) + LLM + TTS.
"""

from __future__ import annotations

import base64
import logging
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

# Prefer CosyVoice; fall back to legacy sambert if account has no access.
_MODEL_CANDIDATES = ("cosyvoice-v1", "sambert-zhichu-v1")


def extract_tts_segments(buffer: str, max_flush: int = 72) -> Tuple[List[str], str]:
    """
    Split buffer into segments ending at punctuation, or force-split long runs.
    Returns (segments_to_synthesize, remaining_buffer).
    """
    delims = "。！？.!?；;\n"
    segments: List[str] = []
    buf = buffer
    while buf:
        best = -1
        best_d = ""
        for d in delims:
            p = buf.find(d)
            if p >= 0 and (best < 0 or p < best):
                best = p
                best_d = d
        if best < 0:
            if len(buf) >= max_flush:
                segments.append(buf[:max_flush].strip())
                buf = buf[max_flush:].lstrip()
                continue
            break
        seg = buf[: best + len(best_d)].strip()
        buf = buf[best + len(best_d) :].lstrip()
        if seg:
            segments.append(seg)
    return segments, buf


def synthesize_speech_mp3_base64(text: str, api_key: Optional[str]) -> Optional[str]:
    """Return base64-encoded MP3 bytes, or None on failure / empty text."""
    text = (text or "").strip()
    if not text or len(text) > 600:
        return None
    if not api_key:
        return None
    try:
        import dashscope
        from dashscope.audio.tts import SpeechSynthesizer

        dashscope.api_key = api_key
    except ImportError:
        logger.warning("[InterviewTTS] dashscope not installed")
        return None

    last_err: Optional[Exception] = None
    for model in _MODEL_CANDIDATES:
        try:
            result = SpeechSynthesizer.call(
                model=model,
                text=text[:600],
                format="mp3",
                sample_rate=24000,
            )
            if result is None:
                continue
            audio = result.get_audio_data()
            if audio and len(audio) > 0:
                return base64.b64encode(bytes(audio)).decode("ascii")
        except Exception as e:
            last_err = e
            logger.debug("[InterviewTTS] model %s failed: %s", model, e)
    if last_err:
        logger.warning("[InterviewTTS] all models failed: %s", last_err)
    return None
