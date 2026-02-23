"""
学生能力画像服务
==================================================
核心功能：
1. 从简历/档案提取学生能力维度（7大维度）
2. AI智能评分（专业技能、证书、创新、学习、抗压、沟通、实习）
3. 生成完整度和竞争力评估
4. 个性化能力提升建议

对应命题要求：
- 通过大模型拆解简历数据为能力画像
- 完整度和竞争力评分
- 覆盖专业技能、证书、创新能力、学习能力、抗压能力、沟通能力、实习能力

对应API文档：
- 5.1 POST /student/ability-profile
- 5.2 POST /student/ai-generate-profile  
- 5.3 POST /student/update-profile
"""

import json
import os
import threading
from datetime import datetime
from typing import Dict, Optional, List, Any

from utils.logger_handler import logger
from utils.path_tool import get_abs_path
from model.factory import chat_model


# ============================================================
# 能力画像数据存储
# ============================================================

def _get_profiles_store_path() -> str:
    """获取能力画像存储路径"""
    return get_abs_path("data/student_profiles/ability_profiles.json")


def _load_profiles_store() -> dict:
    """加载能力画像存储"""
    path = _get_profiles_store_path()
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}


def _save_profiles_store(data: dict):
    """保存能力画像存储"""
    path = _get_profiles_store_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ============================================================
# 能力画像生成任务存储（异步任务）
# ============================================================

def _get_ability_task_store_path() -> str:
    return get_abs_path("data/student_profiles/ability_tasks.json")


def _load_ability_task_store() -> dict:
    path = _get_ability_task_store_path()
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_ability_task_store(data: dict):
    path = _get_ability_task_store_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ============================================================
# 核心算法：能力评分
# ============================================================

class AbilityScorer:
    """
    能力评分算法
    基于证据的量化评分体系
    """
    
    @staticmethod
    def score_professional_skills(skills_data: dict) -> dict:
        """
        专业技能评分
        
        评分维度：
        1. 技能数量（20%）
        2. 技能深度（30%）
        3. 证据充分性（30%）
        4. 技术栈现代性（20%）
        """
        total_skills = 0
        total_score = 0
        
        # 编程语言评分
        for lang in skills_data.get("programming_languages", []):
            level_score = {"精通": 100, "熟练": 85, "熟悉": 70, "了解": 50}.get(lang.get("level", "了解"), 50)
            evidence_score = min(len(lang.get("evidence", [])) * 10, 30)
            skill_score = level_score * 0.7 + evidence_score
            lang["score"] = int(skill_score)
            total_score += skill_score
            total_skills += 1
        
        # 框架工具评分
        for tool in skills_data.get("frameworks_tools", []):
            level_score = {"精通": 100, "熟练": 85, "熟悉": 70, "了解": 50}.get(tool.get("level", "了解"), 50)
            evidence_score = min(len(tool.get("evidence", [])) * 10, 30)
            skill_score = level_score * 0.7 + evidence_score
            tool["score"] = int(skill_score)
            total_score += skill_score
            total_skills += 1
        
        # 领域知识评分
        for domain in skills_data.get("domain_knowledge", []):
            level_score = {"精通": 100, "熟练": 85, "熟悉": 70, "了解": 50}.get(domain.get("level", "了解"), 50)
            evidence_score = min(len(domain.get("evidence", [])) * 10, 30)
            skill_score = level_score * 0.7 + evidence_score
            domain["score"] = int(skill_score)
            total_score += skill_score
            total_skills += 1
        
        overall_score = int(total_score / total_skills) if total_skills > 0 else 0
        skills_data["overall_score"] = overall_score
        
        return skills_data
    
    @staticmethod
    def score_certificates(certs_data: dict) -> dict:
        """
        证书资质评分
        
        评分标准：
        - 国际认证（AWS、Google等）：90-100分
        - 国家级证书（软考高级等）：80-90分
        - 行业证书（计算机二级等）：60-70分
        - 校级证书：40-50分
        """
        cert_scores = {
            "AWS": 95, "Google": 95, "Microsoft": 90,
            "软考高级": 85, "PMP": 85,
            "计算机二级": 65, "英语六级": 60,
            "计算机三级": 70, "英语四级": 50
        }
        
        total_score = 0
        count = 0
        
        for cert in certs_data.get("items", []):
            cert_name = cert.get("name", "")
            score = 50  # 默认分数
            
            # 匹配证书等级
            for key, value in cert_scores.items():
                if key in cert_name:
                    score = value
                    break
            
            total_score += score
            count += 1
        
        avg_score = int(total_score / count) if count > 0 else 0
        certs_data["score"] = avg_score
        
        # 竞争力等级
        if avg_score >= 85:
            certs_data["competitiveness"] = "优秀"
        elif avg_score >= 70:
            certs_data["competitiveness"] = "中上"
        elif avg_score >= 60:
            certs_data["competitiveness"] = "中等"
        else:
            certs_data["competitiveness"] = "待提升"
        
        return certs_data
    
    @staticmethod
    def score_innovation_ability(innovation_data: dict) -> dict:
        """
        创新能力评分
        
        评分维度：
        1. 项目创新点（40%）
        2. 竞赛获奖（40%）
        3. 影响力（20%）
        """
        score = 0
        
        # 项目创新
        projects = innovation_data.get("projects", [])
        if projects:
            for proj in projects:
                innovation_points = len(proj.get("innovation_points", []))
                score += min(innovation_points * 15, 40)
        
        # 竞赛获奖
        competitions = innovation_data.get("competitions", [])
        award_scores = {"国家级一等奖": 40, "国家级二等奖": 35, "省级一等奖": 30, "省级二等奖": 25, "校级": 15}
        for comp in competitions:
            award = comp.get("award", "")
            for key, value in award_scores.items():
                if key in award:
                    score += value
                    break
        
        score = min(int(score), 100)
        innovation_data["score"] = score
        
        if score >= 80:
            innovation_data["level"] = "优秀"
        elif score >= 65:
            innovation_data["level"] = "中上"
        else:
            innovation_data["level"] = "中等"
        
        return innovation_data
    
    @staticmethod
    def score_learning_ability(learning_data: dict) -> dict:
        """
        学习能力评分
        
        评分维度：
        1. GPA（50%）
        2. 自学能力（30%）
        3. 学习速度（20%）
        """
        score = 0
        
        for indicator in learning_data.get("indicators", []):
            if indicator.get("indicator") == "GPA":
                gpa_value = indicator.get("value", 0)
                gpa_score = min(int(gpa_value / 4.0 * 100), 100)
                score += gpa_score * 0.5
            elif indicator.get("indicator") == "自学新技术":
                evidence_count = len(indicator.get("evidence", []))
                score += min(evidence_count * 15, 30)
        
        score = int(score)
        learning_data["score"] = score
        
        if score >= 85:
            learning_data["level"] = "优秀"
        elif score >= 70:
            learning_data["level"] = "良好"
        else:
            learning_data["level"] = "中等"
        
        return learning_data
    
    @staticmethod
    def score_practical_experience(experience_data: dict) -> dict:
        """
        实习/项目经验评分
        
        评分维度：
        1. 实习时长和质量（50%）
        2. 项目复杂度（30%）
        3. 成果影响（20%）
        """
        score = 0
        
        # 实习评分
        for internship in experience_data.get("internships", []):
            duration = internship.get("duration", "")
            if "6个月" in duration or "半年" in duration:
                internship["score"] = 85
            elif "3个月" in duration:
                internship["score"] = 75
            else:
                internship["score"] = 60
            
            score += internship["score"] * 0.5
        
        # 项目评分
        for project in experience_data.get("projects", []):
            complexity = project.get("complexity", "中")
            complexity_score = {"高": 90, "中": 75, "低": 60}.get(complexity, 70)
            project["score"] = complexity_score
            score += complexity_score * 0.3
        
        experience_data["overall_score"] = int(score)
        return experience_data


# ============================================================
# AI能力画像生成器
# ============================================================

class AIAbilityProfileGenerator:
    """
    AI能力画像生成器
    基于LLM从简历/档案提取能力维度
    """
    
    def __init__(self):
        self.model = chat_model
        self.scorer = AbilityScorer()
    
    def generate_from_profile(self, user_id: int, profile_data: dict) -> dict:
        """
        从个人档案生成能力画像
        
        输入：Profile模块的用户档案（已适配格式）
        输出：7维度能力画像
        """
        logger.info(f"[AbilityProfile] 开始生成用户{user_id}的能力画像（数据源：档案）")
        
        # 构造Prompt
        prompt = self._build_generation_prompt(profile_data)
        
        # 调用LLM生成
        try:
            response = self.model.invoke(prompt)
            result_text = response.content if hasattr(response, 'content') else str(response)
            
            # 解析JSON
            ability_profile = self._parse_llm_response(result_text)
            
            # 评分
            ability_profile = self._score_profile(ability_profile)
            
            # 添加元数据
            ability_profile["user_id"] = user_id
            ability_profile["profile_id"] = f"profile_{user_id}"
            ability_profile["generated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            logger.info(f"[AbilityProfile] 用户{user_id}画像生成成功，总分：{ability_profile['overall_assessment']['total_score']}")
            
            return ability_profile
        
        except Exception as e:
            logger.error(f"[AbilityProfile] 生成失败: {e}")
            raise
    
    def generate_from_resume_text(self, user_id: int, resume_text: str) -> dict:
        """
        从简历文本生成能力画像
        
        输入：简历原始文本
        输出：7维度能力画像
        """
        logger.info(f"[AbilityProfile] 开始生成用户{user_id}的能力画像（数据源：简历）")
        
        prompt = self._build_resume_generation_prompt(resume_text)
        
        try:
            response = self.model.invoke(prompt)
            result_text = response.content if hasattr(response, 'content') else str(response)
            ability_profile = self._parse_llm_response(result_text)
            ability_profile = self._score_profile(ability_profile)
            ability_profile["user_id"] = user_id
            ability_profile["profile_id"] = f"profile_{user_id}"
            ability_profile["generated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            logger.info(f"[AbilityProfile] 用户{user_id}画像生成成功（简历）")
            return ability_profile
        except Exception as e:
            logger.error(f"[AbilityProfile] 从简历生成失败: {e}")
            raise
    
    def _build_resume_generation_prompt(self, resume_text: str) -> str:
        """构造从简历文本生成能力画像的 Prompt"""
        return f"""你是一位资深的HR和职业规划顾问。请根据以下学生简历，生成**学生就业能力画像**。

【简历内容】
{resume_text[:8000]}

请严格按以下JSON格式输出能力画像（只输出JSON，不要其他内容）：

{{
  "basic_info": {{
    "education": "本科/硕士/博士",
    "major": "专业名称",
    "school": "学校名称",
    "gpa": "X.X/4.0",
    "expected_graduation": "YYYY-MM"
  }},
  "professional_skills": {{
    "programming_languages": [
      {{ "skill": "技能名称", "level": "精通/熟练/熟悉/了解", "evidence": ["证据1", "证据2"] }}
    ],
    "frameworks_tools": [...],
    "domain_knowledge": [...]
  }},
  "certificates": {{ "items": [{{ "name": "证书名称", "level": "级别", "issue_date": "YYYY-MM" }}] }},
  "innovation_ability": {{
    "projects": [{{ "name": "项目名称", "innovation_points": ["创新点"], "impact": "影响" }}],
    "competitions": [{{ "name": "竞赛名称", "award": "获奖等级" }}]
  }},
  "learning_ability": {{
    "indicators": [
      {{ "indicator": "GPA", "value": 3.8, "percentile": 85 }},
      {{ "indicator": "自学新技术", "evidence": ["证据"] }}
    ]
  }},
  "pressure_resistance": {{ "evidence": ["抗压证据"] }},
  "communication_ability": {{
    "teamwork": {{ "evidence": ["团队协作证据"] }},
    "presentation": {{ "evidence": ["演讲展示证据"] }}
  }},
  "practical_experience": {{
    "internships": [{{ "company": "公司", "position": "职位", "duration": "X个月", "achievements": ["成就"] }}],
    "projects": [{{ "name": "项目", "role": "角色", "complexity": "高/中/低" }}]
  }}
}}

注意事项：只根据简历真实信息填写，没有的字段用"待补充"；证据必须来自简历。
"""
    
    def _build_generation_prompt(self, profile_data: dict) -> str:
        """构造生成Prompt"""
        return f"""你是一位资深的HR和职业规划顾问。请根据以下学生档案，生成**学生就业能力画像**。

【学生档案数据】
基本信息：
- 学历：{profile_data.get('basic_info', {}).get('education', '未填写')}
- 专业：{profile_data.get('basic_info', {}).get('major', '未填写')}
- 学校：{profile_data.get('basic_info', {}).get('school', '未填写')}
- GPA：{profile_data.get('basic_info', {}).get('gpa', '未填写')}

技能：
{json.dumps(profile_data.get('skills', []), ensure_ascii=False, indent=2)}

证书：
{json.dumps(profile_data.get('certificates', []), ensure_ascii=False, indent=2)}

项目经历：
{json.dumps(profile_data.get('projects', []), ensure_ascii=False, indent=2)}

实习经历：
{json.dumps(profile_data.get('internships', []), ensure_ascii=False, indent=2)}

请严格按以下JSON格式输出能力画像（只输出JSON，不要其他内容）：

{{
  "basic_info": {{
    "education": "本科/硕士/博士",
    "major": "专业名称",
    "school": "学校名称",
    "gpa": "X.X/4.0",
    "expected_graduation": "YYYY-MM"
  }},
  "professional_skills": {{
    "programming_languages": [
      {{
        "skill": "技能名称",
        "level": "精通/熟练/熟悉/了解",
        "evidence": ["证据1", "证据2"]
      }}
    ],
    "frameworks_tools": [...],
    "domain_knowledge": [...]
  }},
  "certificates": {{
    "items": [
      {{
        "name": "证书名称",
        "level": "级别",
        "issue_date": "YYYY-MM"
      }}
    ]
  }},
  "innovation_ability": {{
    "projects": [
      {{
        "name": "项目名称",
        "innovation_points": ["创新点1", "创新点2"],
        "impact": "影响描述"
      }}
    ],
    "competitions": [
      {{
        "name": "竞赛名称",
        "award": "获奖等级"
      }}
    ]
  }},
  "learning_ability": {{
    "indicators": [
      {{
        "indicator": "GPA",
        "value": 3.8,
        "percentile": 85
      }},
      {{
        "indicator": "自学新技术",
        "evidence": ["证据1", "证据2"]
      }}
    ]
  }},
  "pressure_resistance": {{
    "evidence": ["抗压证据1", "证据2"]
  }},
  "communication_ability": {{
    "teamwork": {{
      "evidence": ["团队协作证据1", "证据2"]
    }},
    "presentation": {{
      "evidence": ["演讲展示证据1", "证据2"]
    }}
  }},
  "practical_experience": {{
    "internships": [
      {{
        "company": "公司名称",
        "position": "职位",
        "duration": "X个月",
        "achievements": ["成就1", "成就2"]
      }}
    ],
    "projects": [
      {{
        "name": "项目名称",
        "role": "角色",
        "complexity": "高/中/低"
      }}
    ]
  }}
}}

注意事项：
1. 如果档案某个字段为空，不要编造，标记为"待补充"
2. 证据必须来自档案中的真实信息
3. 技能等级要客观评估（有项目 = 熟悉，多次使用 = 熟练，深度应用 = 精通）
4. 创新点要具体，不要泛泛而谈
"""
    
    def _parse_llm_response(self, response_text: str) -> dict:
        """解析LLM返回的JSON"""
        try:
            # 移除markdown代码块
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            return json.loads(text)
        except Exception as e:
            logger.error(f"[AbilityProfile] JSON解析失败: {e}")
            raise ValueError(f"LLM返回的不是有效JSON: {response_text[:200]}")
    
    def _score_profile(self, profile: dict) -> dict:
        """对画像进行评分"""
        # 1. 专业技能评分
        if "professional_skills" in profile:
            profile["professional_skills"] = self.scorer.score_professional_skills(
                profile["professional_skills"]
            )
        
        # 2. 证书评分
        if "certificates" in profile:
            profile["certificates"] = self.scorer.score_certificates(
                profile["certificates"]
            )
        
        # 3. 创新能力评分
        if "innovation_ability" in profile:
            profile["innovation_ability"] = self.scorer.score_innovation_ability(
                profile["innovation_ability"]
            )
        
        # 4. 学习能力评分
        if "learning_ability" in profile:
            profile["learning_ability"] = self.scorer.score_learning_ability(
                profile["learning_ability"]
            )
        
        # 5. 实习经验评分
        if "practical_experience" in profile:
            profile["practical_experience"] = self.scorer.score_practical_experience(
                profile["practical_experience"]
            )
        
        # 6. 抗压能力评分（基于测评问卷，这里默认值）
        if "pressure_resistance" in profile:
            profile["pressure_resistance"]["assessment_score"] = 75
            profile["pressure_resistance"]["level"] = "良好"
        
        # 7. 沟通能力评分
        if "communication_ability" in profile:
            teamwork_score = 70 if profile["communication_ability"].get("teamwork", {}).get("evidence") else 50
            presentation_score = 75 if profile["communication_ability"].get("presentation", {}).get("evidence") else 50
            profile["communication_ability"]["teamwork"]["score"] = teamwork_score
            profile["communication_ability"]["presentation"]["score"] = presentation_score
            profile["communication_ability"]["overall_score"] = int((teamwork_score + presentation_score) / 2)
            profile["communication_ability"]["level"] = "良好" if profile["communication_ability"]["overall_score"] >= 70 else "中等"
        
        # 8. 综合评分
        profile["overall_assessment"] = self._calculate_overall_assessment(profile)
        
        return profile
    
    def _calculate_overall_assessment(self, profile: dict) -> dict:
        """计算综合评估"""
        # 权重分配
        weights = {
            "professional_skills": 0.30,
            "practical_experience": 0.25,
            "learning_ability": 0.15,
            "innovation_ability": 0.10,
            "certificates": 0.08,
            "communication_ability": 0.07,
            "pressure_resistance": 0.05
        }
        
        total_score = 0
        for key, weight in weights.items():
            if key in profile:
                score = profile[key].get("score") or profile[key].get("overall_score") or profile[key].get("assessment_score", 0)
                total_score += score * weight
        
        total_score = int(total_score)
        
        # 完整度评估
        filled_fields = sum([1 for key in weights.keys() if key in profile and profile[key]])
        completeness = int((filled_fields / len(weights)) * 100)
        
        # 竞争力等级
        if total_score >= 80:
            competitiveness = "优秀"
        elif total_score >= 70:
            competitiveness = "中上"
        elif total_score >= 60:
            competitiveness = "中等"
        else:
            competitiveness = "待提升"
        
        # 优势分析
        strengths = []
        if profile.get("learning_ability", {}).get("score", 0) >= 80:
            strengths.append("学习能力强，GPA优秀")
        if profile.get("practical_experience", {}).get("overall_score", 0) >= 75:
            strengths.append("有完整的项目和实习经验")
        if profile.get("professional_skills", {}).get("overall_score", 0) >= 75:
            strengths.append("技术栈较为全面")
        if profile.get("innovation_ability", {}).get("score", 0) >= 70:
            strengths.append("具备一定创新能力")
        
        # 劣势分析
        weaknesses = []
        if profile.get("certificates", {}).get("score", 0) < 70:
            weaknesses.append("缺少高含金量证书")
        if profile.get("communication_ability", {}).get("overall_score", 0) < 70:
            weaknesses.append("沟通能力有提升空间")
        if profile.get("practical_experience", {}).get("overall_score", 0) < 70:
            weaknesses.append("实习经验需要积累")
        if profile.get("innovation_ability", {}).get("score", 0) < 60:
            weaknesses.append("创新项目影响力可以更大")
        
        return {
            "total_score": total_score,
            "percentile": min(total_score + 2, 100),  # 简化：总分+2作为百分位
            "completeness": completeness,
            "competitiveness": competitiveness,
            "strengths": strengths[:3],  # 最多3条
            "weaknesses": weaknesses[:3]  # 最多3条
        }


# ============================================================
# 对外服务类
# ============================================================

class StudentAbilityProfileService:
    """
    学生能力画像服务
    对应API文档第5章
    """
    
    def __init__(self):
        self.generator = AIAbilityProfileGenerator()
        self.profiles_store = _load_profiles_store()
        self.task_store = _load_ability_task_store()
    
    def get_ability_profile(self, user_id: int) -> Optional[dict]:
        """
        5.1 获取学生能力画像
        """
        profile_id = f"profile_{user_id}"
        
        if profile_id in self.profiles_store:
            logger.info(f"[AbilityProfile] 返回已存在的画像: {profile_id}")
            return self.profiles_store[profile_id]
        
        logger.warning(f"[AbilityProfile] 用户{user_id}的能力画像不存在")
        return None
    
    def start_ability_profile_generation(
        self, user_id: int, data_source: str = "profile",
        profile_data: Optional[dict] = None, resume_text: Optional[str] = None
    ) -> dict:
        """
        5.2 AI生成学生能力画像（异步）
        
        立即返回 task_id 和 status: processing，后台线程执行生成。
        生成完成后画像保存，可通过 get_ability_profile 获取。
        
        profile_data: 可选，由 Java 后端传入的档案数据，有则优先使用
        resume_text: 可选，由 Java 后端传入的简历文本，有则优先使用
        """
        task_id = f"stu_gen_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}"
        
        # 预检查并解析数据：resume 需有简历，profile 需有档案
        if data_source == "profile":
            if not profile_data:
                profile_data = self._get_user_profile_data(user_id)
            if not profile_data:
                raise ValueError(f"用户{user_id}的档案数据不存在，请先完善个人档案")
            resolved_profile = self._adapt_profile_for_generator(profile_data)
        else:  # resume
            if not resume_text:
                resume_text = self._get_user_resume_text(user_id)
            if not resume_text or len(str(resume_text).strip()) < 50:
                raise ValueError(f"用户{user_id}的简历不存在或内容过少，请先上传简历")
            resolved_profile = None
        
        # 初始化任务状态
        self.task_store[task_id] = {
            "status": "processing",
            "user_id": user_id,
            "data_source": data_source,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "error": None
        }
        _save_ability_task_store(self.task_store)
        
        def _run():
            try:
                if data_source == "profile":
                    ability_profile = self.generator.generate_from_profile(user_id, resolved_profile)
                else:
                    ability_profile = self.generator.generate_from_resume_text(user_id, resume_text)
                
                profile_id = f"profile_{user_id}"
                self.profiles_store[profile_id] = ability_profile
                _save_profiles_store(self.profiles_store)
                
                self.task_store[task_id]["status"] = "completed"
                logger.info(f"[AbilityProfile] 任务完成: {task_id}")
            except Exception as e:
                logger.error(f"[AbilityProfile] 生成失败 task_id={task_id}: {e}", exc_info=True)
                self.task_store[task_id]["status"] = "failed"
                self.task_store[task_id]["error"] = str(e)
            finally:
                _save_ability_task_store(self.task_store)
        
        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        
        return {"task_id": task_id}
    
    def update_ability_profile(self, user_id: int, updates: dict) -> dict:
        """
        5.3 更新能力画像
        支持深度合并：数组类字段（如 programming_languages、items）为追加，对象为递归合并。
        """
        profile_id = f"profile_{user_id}"
        
        if profile_id not in self.profiles_store:
            raise ValueError(f"用户{user_id}的能力画像不存在，请先生成")
        
        profile = self.profiles_store[profile_id]
        old_score = profile["overall_assessment"]["total_score"]
        
        # 深度合并 updates
        self._deep_merge(profile, updates)
        
        # 重新评分
        profile = self.generator._score_profile(profile)
        profile["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        new_score = profile["overall_assessment"]["total_score"]
        score_change = new_score - old_score
        
        # 保存
        self.profiles_store[profile_id] = profile
        _save_profiles_store(self.profiles_store)
        
        logger.info(f"[AbilityProfile] 用户{user_id}画像更新成功，分数变化: {score_change:+d}")
        
        return {
            "updated_at": profile["updated_at"],
            "new_total_score": new_score,
            "score_change": score_change
        }
    
    def _deep_merge(self, base: dict, updates: dict):
        """
        深度合并：对象递归合并，数组（list）追加新元素。
        """
        for key, value in updates.items():
            if key not in base:
                base[key] = value
                continue
            base_val = base[key]
            if isinstance(value, list) and isinstance(base_val, list):
                base[key] = base_val + value
            elif isinstance(value, dict) and isinstance(base_val, dict):
                self._deep_merge(base_val, value)
            else:
                base[key] = value
    
    def _get_user_profile_data(self, user_id: int) -> Optional[dict]:
        """从Profile模块获取用户档案，并适配为能力画像生成器所需格式"""
        try:
            from profile.profile_service import ProfileService
            import yaml
            profile_service = ProfileService()
            raw = profile_service.get_profile(user_id)
            if not raw:
                return None
            return self._adapt_profile_for_generator(raw)
        except Exception as e:
            logger.warning(f"[AbilityProfile] Profile模块不可用: {e}，返回None要求用户先完善档案")
            # 不再返回模拟数据，要求用户必须先完善档案或上传简历
            return None
    
    def _adapt_profile_for_generator(self, profile: dict) -> dict:
        """将 Profile 模块的档案格式适配为能力画像生成器所需格式"""
        bi = profile.get("basic_info") or {}
        ei = profile.get("education_info") or {}
        # 合并 basic_info：education_info 覆盖 basic_info 中教育相关字段
        basic_info = {
            "education": ei.get("degree") or bi.get("education") or "待补充",
            "major": ei.get("major") or bi.get("major") or "待补充",
            "school": ei.get("school") or bi.get("school") or "待补充",
            "gpa": ei.get("gpa") or bi.get("gpa") or "待补充",
            "expected_graduation": ei.get("expected_graduation") or bi.get("expected_graduation") or "待补充"
        }
        skills = profile.get("skills") or []
        # 确保 skills 为列表，支持 {category, items} 或 简单列表
        if skills and isinstance(skills[0], dict):
            pass  # 已是 {category, items} 格式
        elif skills and isinstance(skills[0], str):
            skills = [{"category": "技能", "items": skills}]
        return {
            "basic_info": basic_info,
            "skills": skills,
            "certificates": profile.get("certificates") or [],
            "projects": profile.get("projects") or [],
            "internships": profile.get("internships") or []
        }
    
    def _get_user_resume_text(self, user_id: int) -> Optional[str]:
        """获取用户最新上传的简历文本"""
        try:
            import glob
            import yaml
            config_path = get_abs_path("config/profile.yml")
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f)
            upload_dir = get_abs_path(cfg.get("resume_upload_dir", "data/profiles/resumes/"))
            if not os.path.isdir(upload_dir):
                return None
            pattern = os.path.join(upload_dir, f"{user_id}_*")
            files = glob.glob(pattern)
            if not files:
                return None
            latest = max(files, key=os.path.getmtime)
            ext = os.path.splitext(latest)[1].lower()
            if ext == ".pdf":
                try:
                    import fitz
                    doc = fitz.open(latest)
                    text = "\n".join(page.get_text("text") for page in doc)
                    doc.close()
                    return text
                except ImportError:
                    try:
                        import pdfplumber
                        with pdfplumber.open(latest) as pdf:
                            return "\n".join((p.extract_text() or "") for p in pdf.pages)
                    except Exception:
                        pass
            elif ext in (".txt",):
                with open(latest, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
            return None
        except Exception as e:
            logger.warning(f"[AbilityProfile] 读取简历失败: {e}")
            return None


# ============================================================
# 单例获取
# ============================================================

_service_instance = None

def get_student_ability_service() -> StudentAbilityProfileService:
    global _service_instance
    if _service_instance is None:
        _service_instance = StudentAbilityProfileService()
    return _service_instance
