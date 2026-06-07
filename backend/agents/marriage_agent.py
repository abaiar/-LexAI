import json
from typing import AsyncGenerator

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from config import settings
from tools.deli_tools import search_law, get_law_detail, search_case


MARRIAGE_SYSTEM_PROMPT = """你是"小理智法 AI - 婚姻与财产分割助手"，专注于中国婚姻家庭法领域的专业法律咨询。

你的专业范围：
- 离婚方式选择（协议离婚/诉讼离婚）
- 夫妻共同财产认定与分割
- 个人财产与共同财产区分
- 婚前/婚后财产协议
- 子女抚养权与探望权
- 抚养费计算与变更
- 家暴维权与人身保护令
- 彩礼返还纠纷

工作流程：
1. 分析用户的婚姻家庭纠纷情况，判断争议焦点
2. 如需案例支撑，调用案例检索工具查找相似家事案例
3. 如需法条依据，调用法规检索工具获取《民法典》婚姻家庭编等条文
4. 综合以上信息，给出结构清晰的法律建议

格式要求：
【争议焦点】明确核心争议问题
【适用法规】引用具体法律条文
【相似类案】引用真实案例（禁止编造）
【财产分析】如涉及财产分割，分析财产性质和分割方案
【法律建议】包括证据收集、维权策略、风险提示
【情感提示】适当给予情感关怀，但保持专业客观

重要提示：
- 2021年《民法典》实施后，婚姻法已并入民法典
- 协议离婚有30天冷静期，务必提醒
- 涉及家暴的，建议优先申请人身安全保护令
- 严禁编造案例编号、引用不存在的法条
- 涉及未成年人利益的，应以子女利益为首要考虑"""


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        streaming=True,
        temperature=0.7,
    )


def _get_tools():
    return [search_case, search_law, get_law_detail]


def _build_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("system", MARRIAGE_SYSTEM_PROMPT),
        MessagesPlaceholder("chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])


def _get_agent_executor() -> AgentExecutor:
    llm = _get_llm()
    tools = _get_tools()
    prompt = _build_prompt()
    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        max_iterations=5,
        handle_parsing_errors=True,
    )


async def stream_marriage_chat(
    message: str,
    session_id: str,
    history: list,
) -> AsyncGenerator[dict, None]:
    from memory.session_memory import get_or_create_memory, build_messages_from_history
    memory = get_or_create_memory(f"marriage_{session_id}")
    chat_history = build_messages_from_history(history)

    executor = _get_agent_executor()

    yield {
        "type": "agent_step",
        "content": "[婚姻与财产分割 Agent 启动]\n1. 分析婚姻家庭纠纷..."
    }

    if not settings.is_api_key_configured():
        yield {
            "type": "error",
            "content": "API Key 未配置。请先前往「账户设置」配置大模型 API Key 后再使用。"
        }
        yield {"type": "done", "content": ""}
        return

    try:
        collected_content = ""
        current_step = 1

        async for event in executor.astream_events(
            {"input": message, "chat_history": chat_history},
            version="v1",
        ):
            kind = event.get("event", "")

            if kind == "on_tool_start":
                tool_name = event.get("name", "未知工具")
                current_step += 1
                step_map = {
                    "search_case": "正在检索家事纠纷案例...",
                    "search_law": "正在检索婚姻家庭法规...",
                    "get_law_detail": "正在获取法规全文...",
                }
                yield {
                    "type": "agent_step",
                    "content": f"{current_step}. {step_map.get(tool_name, f'调用工具: {tool_name}')}"
                }

            elif kind == "on_tool_end":
                current_step += 1
                yield {
                    "type": "agent_step",
                    "content": f"{current_step}. 综合分析检索结果..."
                }

            elif kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    token = chunk.content
                    if isinstance(token, str) and token:
                        collected_content += token
                        yield {"type": "token", "content": token}

        memory.chat_memory.add_user_message(message)
        if collected_content:
            memory.chat_memory.add_ai_message(collected_content)

    except Exception as e:
        try:
            llm = _get_llm()
            fallback_prompt = ChatPromptTemplate.from_messages([
                ("system", MARRIAGE_SYSTEM_PROMPT),
                MessagesPlaceholder("chat_history", optional=True),
                ("human", "{input}"),
            ])
            all_messages = fallback_prompt.format_messages(
                input=message, chat_history=chat_history,
            )
            collected_content = ""
            async for chunk in llm.astream(all_messages):
                if chunk.content:
                    collected_content += chunk.content
                    yield {"type": "token", "content": chunk.content}
            memory.chat_memory.add_user_message(message)
            if collected_content:
                memory.chat_memory.add_ai_message(collected_content)
        except Exception as fallback_err:
            yield {"type": "error", "content": f"处理错误: {str(fallback_err)}"}

    yield {"type": "done", "content": ""}
