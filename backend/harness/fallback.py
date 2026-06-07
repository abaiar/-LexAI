from typing import AsyncGenerator, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

from config import settings
from harness.trace import trace_manager


async def fallback_chat(
    message: str,
    system_prompt: str,
    chat_history: List = None,
    session_id: str = "",
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    llm = ChatOpenAI(
        model=settings.get_active_model(),
        openai_api_key=settings.get_active_api_key(),
        openai_api_base=settings.get_active_base_url(),
        streaming=True,
        temperature=temperature,
    )
    fallback_prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder("chat_history", optional=True),
        ("human", "{input}"),
    ])
    all_messages = fallback_prompt.format_messages(
        input=message,
        chat_history=chat_history or [],
    )
    collected = ""
    async for chunk in llm.astream(all_messages):
        if chunk.content:
            collected += chunk.content
            yield chunk.content

    if session_id:
        trace_manager.add_step(session_id, "output", f"[fallback] {collected[:200]}")


def is_tool_call_error(error: Exception) -> bool:
    error_str = str(error).lower()
    return any(kw in error_str for kw in ["tool_call", "function_call", "authentication", "not supported"])
