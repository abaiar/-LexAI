import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, execute_query


async def migrate():
    print("初始化数据库连接...")
    await init_db()

    print("创建 user_memory 表...")
    await execute_query("""
        CREATE TABLE IF NOT EXISTS user_memory (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            memory_key VARCHAR(200) NOT NULL,
            memory_value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user_key (user_id, memory_key),
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    print("  ✓ user_memory 表创建成功")

    print("创建 review_history 表...")
    await execute_query("""
        CREATE TABLE IF NOT EXISTS review_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            contract_type VARCHAR(100),
            score INT,
            risk_count INT,
            summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    print("  ✓ review_history 表创建成功")

    print("\n数据库迁移完成！")


if __name__ == "__main__":
    asyncio.run(migrate())
