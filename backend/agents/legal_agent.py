from typing import AsyncGenerator, Optional
from agents.base_agent import BaseAgent


class LegalAgent(BaseAgent):
    agent_id = "legal_agent"
    skill_id = "legal_consultation"
    temperature = 0.7
    max_iterations = 5

    async def stream_chat_with_skill(
        self,
        message: str,
        session_id: str,
        history: list,
        skill_id: str = "legal_consultation",
    ) -> AsyncGenerator[dict, None]:
        self.skill_id = skill_id

        skill_labels = {
            "legal_consultation": "",
            "labor_dispute": "[劳动纠纷维权 Agent 启动]\n1. 分析劳动争议类型...",
            "corporate_compliance": "[企业合规检查 Agent 启动]\n1. 分析合规检查需求...",
            "marriage_property": "[婚姻与财产分割 Agent 启动]\n1. 分析婚姻家庭纠纷...",
        }
        step_prefix = skill_labels.get(skill_id, "")

        from skills.skill_loader import get_skill
        skill = get_skill(skill_id)
        system_prompt = skill.system_prompt if skill and skill.system_prompt else None

        async for chunk in self.stream_chat(
            message=message,
            session_id=session_id,
            history=history,
            system_prompt=system_prompt,
            step_prefix=step_prefix,
        ):
            yield chunk


legal_agent = LegalAgent()


async def stream_legal_chat(
    message: str,
    session_id: str,
    history: list,
    skill_id: str = "legal_consultation",
) -> AsyncGenerator[dict, None]:
    async for chunk in legal_agent.stream_chat_with_skill(
        message=message,
        session_id=session_id,
        history=history,
        skill_id=skill_id,
    ):
        yield chunk
