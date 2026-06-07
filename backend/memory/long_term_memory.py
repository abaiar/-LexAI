import json
from typing import Dict, List, Optional
from datetime import datetime

from database import execute_query


async def save_user_preference(user_id: str, key: str, value: str):
    now = datetime.now()
    await execute_query(
        """INSERT INTO user_memory (user_id, memory_key, memory_value, updated_at)
           VALUES (%s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE memory_value = %s, updated_at = %s""",
        (user_id, key, value, now, value, now),
    )


async def get_user_preference(user_id: str, key: str) -> Optional[str]:
    row = await execute_query(
        "SELECT memory_value FROM user_memory WHERE user_id = %s AND memory_key = %s",
        (user_id, key),
        fetch="one",
    )
    return row["memory_value"] if row else None


async def save_review_history(user_id: str, contract_type: str, score: int, risk_count: int, summary: str):
    await execute_query(
        """INSERT INTO review_history (user_id, contract_type, score, risk_count, summary, created_at)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (user_id, contract_type, score, risk_count, summary, datetime.now()),
    )


async def get_user_profile(user_id: str) -> Dict:
    rows = await execute_query(
        "SELECT memory_key, memory_value FROM user_memory WHERE user_id = %s",
        (user_id,),
        fetch="all",
    )
    profile = {}
    if rows:
        for row in rows:
            try:
                profile[row["memory_key"]] = json.loads(row["memory_value"])
            except (json.JSONDecodeError, TypeError):
                profile[row["memory_key"]] = row["memory_value"]
    return profile


async def get_recent_reviews(user_id: str, limit: int = 5) -> List[Dict]:
    rows = await execute_query(
        "SELECT contract_type, score, risk_count, summary, created_at FROM review_history WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
        (user_id, limit),
        fetch="all",
    )
    if not rows:
        return []
    return [
        {
            "contract_type": row["contract_type"],
            "score": row["score"],
            "risk_count": row["risk_count"],
            "summary": row["summary"],
            "created_at": str(row["created_at"]),
        }
        for row in rows
    ]
