import json
from typing import Dict, List, Optional

from memory.session_memory import get_or_create_memory, build_messages_from_history, add_user_message, add_ai_message
from memory.working_memory import compact_messages, estimate_tokens
from memory.long_term_memory import save_user_preference, get_user_preference, get_user_profile, save_review_history, get_recent_reviews


class MemoryAgent:
    def __init__(self, user_id: str = "", session_id: str = ""):
        self.user_id = user_id
        self.session_id = session_id

    def get_session_memory(self):
        return get_or_create_memory(self.session_id)

    def add_exchange(self, user_msg: str, ai_msg: str):
        add_user_message(self.session_id, user_msg)
        if ai_msg:
            add_ai_message(self.session_id, ai_msg)

    def get_compact_history(self, max_tokens: int = 4000) -> List:
        messages = build_messages_from_history(
            self.get_session_memory().load_memory_variables({}).get("chat_history", [])
        )
        return compact_messages(messages, max_tokens=max_tokens)

    async def save_preference(self, key: str, value):
        if self.user_id:
            await save_user_preference(self.user_id, key, json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else value)

    async def load_preference(self, key: str) -> Optional[str]:
        if self.user_id:
            return await get_user_preference(self.user_id, key)
        return None

    async def get_profile(self) -> Dict:
        if self.user_id:
            return await get_user_profile(self.user_id)
        return {}

    async def save_review(self, contract_type: str, score: int, risk_count: int, summary: str):
        if self.user_id:
            await save_review_history(self.user_id, contract_type, score, risk_count, summary)

    async def get_history_reviews(self, limit: int = 5) -> List[Dict]:
        if self.user_id:
            return await get_recent_reviews(self.user_id, limit)
        return []
