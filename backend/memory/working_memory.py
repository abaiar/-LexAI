from typing import List, Optional
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage


def estimate_tokens(messages: List) -> int:
    total = 0
    for msg in messages:
        if hasattr(msg, "content") and msg.content:
            total += len(msg.content)
    return total


def compact_messages(
    messages: List,
    max_tokens: int = 4000,
    keep_recent: int = 3,
) -> List:
    if estimate_tokens(messages) <= max_tokens:
        return messages

    if len(messages) <= keep_recent:
        return messages

    older = messages[:-keep_recent]
    recent = messages[-keep_recent:]

    older_text = []
    for msg in older:
        role = "用户" if isinstance(msg, HumanMessage) else "AI"
        older_text.append(f"{role}: {msg.content}")

    summary = f"[历史对话摘要] " + " | ".join(
        t[:100] for t in older_text[-5:]
    )

    return [SystemMessage(content=summary)] + recent
