import os
import json
import asyncio
from langchain_core.tools import tool
from harness.registry import registry


KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge", "data")
INDEX_FILE = os.path.join(KNOWLEDGE_DIR, "index.json")
CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge", "chroma_db")

CHROMADB_AVAILABLE = False
try:
    import chromadb
    CHROMADB_AVAILABLE = True
except ImportError:
    pass


def _search_json_index(query: str, top_k: int = 5) -> str:
    """JSON 文件后备检索：基于关键词匹配"""
    if not os.path.exists(INDEX_FILE):
        return "本地知识库尚未构建，请先运行 knowledge/build_index.py"

    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        docs = json.load(f)

    if not docs:
        return "本地知识库中无数据。"

    query_chars = set(query)
    scored = []
    for doc in docs:
        text = doc.get("text", "")
        score = sum(1 for c in query_chars if c in text)
        scored.append((score, doc))
    scored.sort(key=lambda x: x[0], reverse=True)

    results = scored[:top_k]
    formatted = []
    for i, (score, doc) in enumerate(results, 1):
        meta = doc.get("metadata", {})
        source = meta.get("source", "未知来源")
        article = meta.get("article", "")
        formatted.append(
            f"{i}. [{source}{' ' + article if article else ''}]\n{doc['text'][:500]}"
        )

    return "\n\n".join(formatted)


def _search_chroma(query: str, top_k: int = 5) -> tuple:
    """Chroma 向量检索，返回 (formatted_text, result_count)"""
    if not CHROMADB_AVAILABLE:
        return _search_json_index(query), 0
    try:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        try:
            collection = client.get_collection("legal_knowledge")
        except Exception:
            return _search_json_index(query), 0

        if collection.count() == 0:
            return _search_json_index(query), 0

        results = collection.query(
            query_texts=[query],
            n_results=top_k,
        )

        if not results or not results.get("documents") or not results["documents"][0]:
            return _search_json_index(query), 0

        formatted = []
        docs = results["documents"][0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]

        for i, (doc, meta, dist) in enumerate(zip(docs, metas, dists), 1):
            source = meta.get("source", "未知来源") if meta else "未知来源"
            article = meta.get("article", "") if meta else ""
            relevance = max(0, 1 - dist) if dist else 0
            formatted.append(
                f"{i}. [{source}{' ' + article if article else ''}] (相关度: {relevance:.0%})\n{doc[:500]}"
            )

        return "\n\n".join(formatted), len(docs)

    except Exception:
        return _search_json_index(query), 0


def _cache_deli_result(query: str, deli_text: str):
    """将 Deli API 检索结果缓存到本地 JSON 索引"""
    if not deli_text or "不可用" in deli_text or "未找到" in deli_text:
        return
    try:
        os.makedirs(KNOWLEDGE_DIR, exist_ok=True)
        existing = []
        if os.path.exists(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)

        # 提取 Deli 返回的各条目
        import re
        entries = deli_text.split("\n\n")
        for entry in entries:
            if not entry.strip():
                continue
            doc_id = f"deli_cache_{hash(entry) % 1000000:06d}"
            # 避免重复
            if any(d.get("id") == doc_id for d in existing):
                continue
            existing.append({
                "id": doc_id,
                "text": entry.replace("<em>", "").replace("</em>", ""),
                "metadata": {"source": "得理API缓存", "type": "法规", "query": query}
            })

        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


@tool
async def search_knowledge(query: str) -> str:
    """搜索法律知识库（本地+得理API联合检索）。当需要查找法规条文、合同范本等法律知识时使用此工具。输入参数为搜索查询。"""
    # 1. 先搜索本地知识库
    local_result, local_count = _search_chroma(query)

    # 2. 如果本地结果不足（少于3条），补充 Deli API 检索
    if local_count < 3:
        try:
            from tools.deli_tools import search_law
            deli_result = await search_law.ainvoke({"keyword": query})
            if "不可用" not in deli_result and "未找到" not in deli_result and "未配置" not in deli_result:
                # 缓存 Deli 结果到本地
                _cache_deli_result(query, deli_result)

                if local_result and "尚未构建" not in local_result and "无数据" not in local_result:
                    return f"【本地知识库】\n{local_result}\n\n【得理API补充检索】\n{deli_result}"
                else:
                    return f"【得理API检索】\n{deli_result}"
        except Exception:
            pass

    return local_result


# Register with registry
registry.register(search_knowledge, allowed_agents=["*"])
