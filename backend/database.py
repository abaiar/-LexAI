import os
import aiomysql
from typing import Optional
from config import settings


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "db": os.getenv("DB_NAME", "lax_user_db"),
    "charset": "utf8mb4",
    "autocommit": True,
}

_pool: Optional[aiomysql.Pool] = None


async def init_db():
    global _pool

    try:
        temp_pool = await aiomysql.create_pool(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            charset="utf8mb4",
            autocommit=True,
        )
        async with temp_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{DB_CONFIG['db']}` "
                    f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
        temp_pool.close()
        await temp_pool.wait_closed()
    except Exception as e:
        print(f"[DB] 创建数据库失败，将使用内存模式: {e}")
        _pool = None
        return

    try:
        _pool = await aiomysql.create_pool(**DB_CONFIG)
        async with _pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        plan VARCHAR(50) DEFAULT '免费版',
                        api_key VARCHAR(500) DEFAULT '',
                        model_name VARCHAR(100) DEFAULT '',
                        is_active TINYINT(1) DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_email (email)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """)
        print("[DB] MySQL 数据库初始化成功")
    except Exception as e:
        print(f"[DB] MySQL 连接失败，将使用内存模式: {e}")
        _pool = None


async def get_pool() -> Optional[aiomysql.Pool]:
    return _pool


async def close_db():
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
        _pool = None


async def execute_query(sql: str, params: tuple = None, fetch: str = "none"):
    if _pool is None:
        return None

    async with _pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, params)
            if fetch == "one":
                return await cur.fetchone()
            elif fetch == "all":
                return await cur.fetchall()
            elif fetch == "lastid":
                await conn.commit()
                return cur.lastrowid
            else:
                await conn.commit()
                return cur.rowcount
