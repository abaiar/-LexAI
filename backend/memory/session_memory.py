from langchain.memory import ConversationBufferWindowMemory
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from typing import Dict, List


_session_memories: Dict[str, ConversationBufferWindowMemory] = {}


def get_or_create_memory(session_id: str) -> ConversationBufferWindowMemory:
    if session_id not in _session_memories:
        _session_memories[session_id] = ConversationBufferWindowMemory(
            k=10,
            return_messages=True,
            memory_key="chat_history",
            output_key="output",
        )
    return _session_memories[session_id]


def add_user_message(session_id: str, message: str):
    memory = get_or_create_memory(session_id)
    memory.chat_memory.add_user_message(message)


def add_ai_message(session_id: str, message: str):
    memory = get_or_create_memory(session_id)
    memory.chat_memory.add_ai_message(message)


def get_chat_history(session_id: str) -> List:
    memory = get_or_create_memory(session_id)
    return memory.load_memory_variables({}).get("chat_history", [])


def clear_memory(session_id: str):
    if session_id in _session_memories:
        del _session_memories[session_id]


def build_messages_from_history(history: List[dict]) -> List:
    messages = []
    for msg in history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))
    return messages
