import os
import json
import asyncio
import re
from typing import List, Dict

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings


KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "data")
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
INDEX_FILE = os.path.join(KNOWLEDGE_DIR, "index.json")

CHROMADB_AVAILABLE = False
try:
    import chromadb
    CHROMADB_AVAILABLE = True
except ImportError:
    pass


def get_embedding_function():
    if not CHROMADB_AVAILABLE:
        return None
    try:
        from chromadb.utils import embedding_functions
        return embedding_functions.OpenAIEmbeddingFunction(
            api_key=settings.get_active_api_key(),
            api_base=settings.get_active_base_url(),
            model_name="text-embedding-v3",
        )
    except Exception:
        try:
            from chromadb.utils import embedding_functions
            return embedding_functions.DefaultEmbeddingFunction()
        except Exception:
            return None


def _create_sample_data():
    return [
        {
            "id": "law_contract_001",
            "text": "《中华人民共和国民法典》第四百六十九条：当事人订立合同，可以采用书面形式、口头形式或者其他形式。书面形式是合同书、信件、电报、电传、传真等可以有形地表现所载内容的形式。以电子数据交换、电子邮件等方式能够有形地表现所载内容，并可以随时调取查用的数据电文，视为书面形式。",
            "metadata": {"source": "民法典", "type": "法规", "article": "第四百六十九条"}
        },
        {
            "id": "law_contract_002",
            "text": "《中华人民共和国民法典》第四百七十条：合同的内容由当事人约定，一般包括下列条款：（一）当事人的姓名或者名称和住所；（二）标的；（三）数量；（四）质量；（五）价款或者报酬；（六）履行期限、地点和方式；（七）违约责任；（八）解决争议的方法。当事人可以参照各类合同的示范文本订立合同。",
            "metadata": {"source": "民法典", "type": "法规", "article": "第四百七十条"}
        },
        {
            "id": "law_contract_003",
            "text": "《中华人民共和国民法典》第五百零九条：当事人应当按照约定全面履行自己的义务。当事人应当遵循诚信原则，根据合同的性质、目的和交易习惯履行通知、协助、保密等义务。当事人在履行合同过程中，应当避免浪费资源、污染环境和破坏生态。",
            "metadata": {"source": "民法典", "type": "法规", "article": "第五百零九条"}
        },
        {
            "id": "law_contract_004",
            "text": "《中华人民共和国民法典》第五百七十七条：当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
            "metadata": {"source": "民法典", "type": "法规", "article": "第五百七十七条"}
        },
        {
            "id": "law_contract_005",
            "text": "《中华人民共和国民法典》第五百八十五条：当事人可以约定一方违约时应当根据违约情况向对方支付一定数额的违约金，也可以约定因违约产生的损失赔偿额的计算方法。约定的违约金低于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以增加；约定的违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。",
            "metadata": {"source": "民法典", "type": "法规", "article": "第五百八十五条"}
        },
        {
            "id": "law_labor_001",
            "text": "《中华人民共和国劳动合同法》第十条：建立劳动关系，应当订立书面劳动合同。已建立劳动关系，未同时订立书面劳动合同的，应当自用工之日起一个月内订立书面劳动合同。用人单位与劳动者在用工前订立劳动合同的，劳动关系自用工之日起建立。",
            "metadata": {"source": "劳动合同法", "type": "法规", "article": "第十条"}
        },
        {
            "id": "law_labor_002",
            "text": "《中华人民共和国劳动合同法》第四十七条：经济补偿按劳动者在本单位工作的年限，每满一年支付一个月工资的标准向劳动者支付。六个月以上不满一年的，按一年计算；不满六个月的，向劳动者支付半个月工资的经济补偿。",
            "metadata": {"source": "劳动合同法", "type": "法规", "article": "第四十七条"}
        },
        {
            "id": "law_labor_003",
            "text": "《中华人民共和国劳动合同法》第八十二条：用人单位自用工之日起超过一个月不满一年未与劳动者订立书面劳动合同的，应当向劳动者每月支付二倍的工资。用人单位违反本法规定不与劳动者订立无固定期限劳动合同的，自应当订立无固定期限劳动合同之日起向劳动者每月支付二倍的工资。",
            "metadata": {"source": "劳动合同法", "type": "法规", "article": "第八十二条"}
        },
        {
            "id": "law_marriage_001",
            "text": "《中华人民共和国民法典》第一千零六十二条：夫妻在婚姻关系存续期间所得的下列财产，为夫妻的共同财产，归夫妻共同所有：（一）工资、奖金、劳务报酬；（二）生产、经营、投资的收益；（三）知识产权的收益；（四）继承或者受赠的财产，但是本法第一千零六十三条第三项规定的除外；（五）其他应当归共同所有的财产。夫妻对共同财产，有平等的处理权。",
            "metadata": {"source": "民法典", "type": "法规", "article": "第一千零六十二条"}
        },
        {
            "id": "law_marriage_002",
            "text": "《中华人民共和国民法典》第一千零七十六条：夫妻双方自愿离婚的，应当签订书面离婚协议，并亲自到婚姻登记机关申请离婚登记。离婚协议应当载明双方自愿离婚的意思表示和对子女抚养、财产以及债务处理等事项协商一致的意见。",
            "metadata": {"source": "民法典", "type": "法规", "article": "第一千零七十六条"}
        },
    ]


def _load_all_docs() -> List[Dict]:
    """从 data/ 目录加载所有 JSON 文档"""
    all_docs = []
    if not os.path.exists(KNOWLEDGE_DIR):
        return all_docs
    for filename in os.listdir(KNOWLEDGE_DIR):
        if not filename.endswith(".json"):
            continue
        filepath = os.path.join(KNOWLEDGE_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            docs = json.load(f)
        if isinstance(docs, list):
            all_docs.extend(docs)
    return all_docs


def _save_index(docs: List[Dict]):
    """保存索引文件（JSON 后备方案）"""
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(docs, f, ensure_ascii=False, indent=2)


def _load_index() -> List[Dict]:
    """加载索引文件"""
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def build_knowledge_base():
    os.makedirs(KNOWLEDGE_DIR, exist_ok=True)

    # 创建示例数据
    sample_path = os.path.join(KNOWLEDGE_DIR, "sample_laws.json")
    if not os.path.exists(sample_path):
        sample_data = _create_sample_data()
        with open(sample_path, "w", encoding="utf-8") as f:
            json.dump(sample_data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ 已创建示例数据: {sample_path}")

    # 加载所有文档
    all_docs = _load_all_docs()
    print(f"  ✓ 加载了 {len(all_docs)} 条文档")

    if CHROMADB_AVAILABLE:
        # Chroma 向量数据库模式
        print("初始化 Chroma 向量数据库...")
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        embedding_fn = get_embedding_function()
        kwargs = {"name": "legal_knowledge"}
        if embedding_fn:
            kwargs["embedding_function"] = embedding_fn
        collection = client.get_or_create_collection(**kwargs)
        print(f"  ✓ 集合 'legal_knowledge' 就绪，当前 {collection.count()} 条记录")

        # 添加新文档
        existing = collection.get()
        existing_ids = set(existing["ids"]) if existing and existing.get("ids") else set()
        new_docs = [d for d in all_docs if d["id"] not in existing_ids]

        if new_docs:
            ids = [d["id"] for d in new_docs]
            texts = [d["text"] for d in new_docs]
            metadatas = [d.get("metadata", {}) for d in new_docs]
            batch_size = 100
            for start in range(0, len(ids), batch_size):
                end = min(start + batch_size, len(ids))
                collection.add(
                    ids=ids[start:end],
                    documents=texts[start:end],
                    metadatas=metadatas[start:end],
                )
            print(f"  ✓ 添加了 {len(new_docs)} 条新记录到 Chroma")
        else:
            print(f"  - 无新记录需要添加")

        print(f"\n知识库构建完成！Chroma 共 {collection.count()} 条记录")
    else:
        # JSON 文件后备模式
        print("chromadb 未安装，使用 JSON 文件索引模式")
        _save_index(all_docs)
        print(f"\n知识库构建完成！JSON 索引共 {len(all_docs)} 条记录")

    print(f"存储路径: {KNOWLEDGE_DIR}")


async def build_from_deli_api(keywords: List[str] = None):
    from tools.deli_tools import search_law, get_law_detail

    if keywords is None:
        keywords = [
            "民法典合同编", "劳动合同法", "婚姻法", "公司法",
            "知识产权法", "反垄断法", "数据安全法",
        ]

    added = 0
    new_docs = []

    for keyword in keywords:
        try:
            result = await search_law.ainvoke({"keyword": keyword})
            if not result or "不可用" in result or "未找到" in result:
                print(f"  - {keyword}: 无结果")
                continue

            law_ids = re.findall(r'lawId:\s*(\S+)', result)
            for law_id in law_ids[:3]:
                try:
                    detail = await get_law_detail.ainvoke({"law_id": law_id})
                    if detail and "不可用" not in detail:
                        doc = {
                            "id": f"deli_{law_id}",
                            "text": detail[:2000],
                            "metadata": {"source": "得理API", "type": "法规全文", "keyword": keyword},
                        }
                        new_docs.append(doc)
                        added += 1
                except Exception:
                    pass
            print(f"  ✓ {keyword}: 处理完成")
        except Exception as e:
            print(f"  ✗ {keyword}: {str(e)[:100]}")

    if new_docs:
        # 保存到 JSON 文件
        api_data_path = os.path.join(KNOWLEDGE_DIR, "deli_api_data.json")
        existing = []
        if os.path.exists(api_data_path):
            with open(api_data_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        existing_ids = {d["id"] for d in existing}
        for doc in new_docs:
            if doc["id"] not in existing_ids:
                existing.append(doc)
        with open(api_data_path, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)

        # 同时添加到 Chroma（如果可用）
        if CHROMADB_AVAILABLE:
            client = chromadb.PersistentClient(path=CHROMA_DIR)
            embedding_fn = get_embedding_function()
            kwargs = {"name": "legal_knowledge"}
            if embedding_fn:
                kwargs["embedding_function"] = embedding_fn
            collection = client.get_or_create_collection(**kwargs)
            for doc in new_docs:
                try:
                    collection.add(
                        ids=[doc["id"]],
                        documents=[doc["text"]],
                        metadatas=[doc["metadata"]],
                    )
                except Exception:
                    pass

    print(f"\n从得理API添加了 {added} 条记录")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--from-api":
        asyncio.run(build_from_deli_api())
    else:
        build_knowledge_base()
