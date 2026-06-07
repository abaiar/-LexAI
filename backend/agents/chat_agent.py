import json
from typing import AsyncGenerator

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

from config import settings
from memory.session_memory import get_or_create_memory, build_messages_from_history
from tools.deli_tools import search_law, get_law_detail, search_case


SYSTEM_PROMPT = """你是"小理智法 AI"，一个基于中国法律的专业法律咨询助手。你的工作流程：
1. 分析用户问题，判断是否需要检索案例或法规
2. 如需案例支撑，调用案例检索工具并引用真实案例（禁止编造）
3. 如需法条依据，调用法规检索工具获取相关法律条文
4. 综合以上信息，给出结构清晰的法律分析报告

格式要求：总分总结构，包含【适用法规】【相似类案】【法律建议】三个部分。
严禁：编造案例编号、引用不存在的法条、提供非中国法律的回答。

重要规则：
- 如果用户的问题属于通用法律咨询，不需要调用工具，直接回答即可
- 只有当需要查找具体案例或法条时才调用工具
- 回答要专业、准确、有条理"""


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
        ("system", SYSTEM_PROMPT),
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


async def stream_chat(
    message: str,
    session_id: str,
    history: list,
) -> AsyncGenerator[dict, None]:
    if not settings.is_api_key_configured():
        yield {
            "type": "error",
            "content": "API Key 未配置。请先前往「账户设置」配置大模型 API Key 后再使用。"
        }
        yield {"type": "done", "content": ""}
        return

    memory = get_or_create_memory(session_id)
    chat_history = build_messages_from_history(history)

    executor = _get_agent_executor()

    yield {
        "type": "agent_step",
        "content": "意图识别中..."
    }

    try:
        collected_content = ""
        current_step = 1

        async for event in executor.astream_events(
            {
                "input": message,
                "chat_history": chat_history,
            },
            version="v1",
        ):
            kind = event.get("event", "")

            if kind == "on_tool_start":
                tool_name = event.get("name", "未知工具")
                current_step += 1
                step_map = {
                    "search_case": "案例检索: 正在查询相似案例...",
                    "search_law": "法规检索: 正在查询相关法规...",
                    "get_law_detail": "法规详情: 正在获取法规全文...",
                }
                step_content = step_map.get(tool_name, f"调用工具: {tool_name}")
                yield {
                    "type": "agent_step",
                    "content": f"{current_step}. {step_content}"
                }

            elif kind == "on_tool_end":
                current_step += 1
                yield {
                    "type": "agent_step",
                    "content": f"{current_step}. 综合评估检索结果..."
                }

            elif kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    token = chunk.content
                    if isinstance(token, str) and token:
                        collected_content += token
                        yield {
                            "type": "token",
                            "content": token
                        }

            elif kind == "on_chain_error":
                yield {
                    "type": "agent_step",
                    "content": "工具调用异常，切换纯AI分析..."
                }

        memory.chat_memory.add_user_message(message)
        if collected_content:
            memory.chat_memory.add_ai_message(collected_content)

    except Exception as e:
        error_str = str(e)
        if "tool_call" in error_str.lower() or "function_call" in error_str.lower() or "authentication" in error_str.lower():
            try:
                llm = _get_llm()
                fallback_prompt = ChatPromptTemplate.from_messages([
                    ("system", SYSTEM_PROMPT),
                    MessagesPlaceholder("chat_history", optional=True),
                    ("human", "{input}"),
                ])
                all_messages = fallback_prompt.format_messages(
                    input=message,
                    chat_history=chat_history,
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
                err_msg = str(fallback_err)
                if "auth" in err_msg.lower() or "key" in err_msg.lower() or "401" in err_msg:
                    yield {
                        "type": "error",
                        "content": "API Key 无效或已过期，请前往「账户设置」重新配置。"
                    }
                else:
                    yield {
                        "type": "error",
                        "content": f"处理错误: {err_msg}"
                    }
        else:
            if "auth" in error_str.lower() or "key" in error_str.lower() or "401" in error_str:
                yield {
                    "type": "error",
                    "content": "API Key 无效或已过期，请前往「账户设置」重新配置。"
                }
            else:
                yield {
                    "type": "error",
                    "content": f"处理错误: {error_str}"
                }

    yield {"type": "done", "content": ""}
