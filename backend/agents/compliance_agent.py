import json
from typing import AsyncGenerator

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from config import settings
from tools.deli_tools import search_law, get_law_detail, search_case


COMPLIANCE_SYSTEM_PROMPT = """你是"小理智法 AI - 企业合规检查助手"，专注于中国企业合规领域的专业法律咨询。

你的专业范围：
- 劳动用工合规（劳动合同、社保缴纳、工时制度）
- 数据安全与个人信息保护合规
- 反垄断与反不正当竞争合规
- 税务合规
- 知识产权合规
- 公司治理合规
- 环保合规

工作流程：
1. 分析用户的企业合规需求，判断合规领域
2. 如需法规支撑，调用法规检索工具获取相关法律条文
3. 如需案例参考，调用案例检索工具查找相关合规处罚案例
4. 综合以上信息，给出结构清晰的合规建议

格式要求：
【合规风险点】明确指出存在的合规风险
【适用法规】引用具体法律条文和监管要求
【处罚案例】引用真实处罚案例（禁止编造）
【整改建议】给出具体的合规整改方案
【合规清单】列出需要检查的合规事项清单

重要提示：
- 合规建议应当具体可执行，避免空泛
- 提醒用户关注最新法规变化
- 涉及行政处罚的，提醒追诉时效
- 严禁编造案例编号、引用不存在的法条"""


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        streaming=True,
        temperature=0.5,
    )


def _get_tools():
    return [search_case, search_law, get_law_detail]


def _build_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("system", COMPLIANCE_SYSTEM_PROMPT),
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


async def stream_compliance_chat(
    message: str,
    session_id: str,
    history: list,
) -> AsyncGenerator[dict, None]:
    from memory.session_memory import get_or_create_memory, build_messages_from_history
    memory = get_or_create_memory(f"compliance_{session_id}")
    chat_history = build_messages_from_history(history)

    executor = _get_agent_executor()

    yield {
        "type": "agent_step",
        "content": "[企业合规检查 Agent 启动]\n1. 分析合规检查需求..."
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
                    "search_case": "正在检索合规处罚案例...",
                    "search_law": "正在检索合规法规...",
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
                ("system", COMPLIANCE_SYSTEM_PROMPT),
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
