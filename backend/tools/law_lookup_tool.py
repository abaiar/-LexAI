import asyncio
from langchain_core.tools import tool
from harness.registry import registry
from tools.law_parser import parse_law_references, extract_article_numbers


@tool
async def lookup_law_references(text: str) -> str:
    """从文本中提取法律引用并查找法规全文。当需要验证合同或文书中引用的法规是否准确、获取法规原文时使用此工具。输入参数为包含法律引用的文本。"""
    try:
        law_refs = parse_law_references(text)
        if not law_refs:
            return "未在文本中发现法律引用（如《xxx法》格式）。"

        from tools.deli_tools import search_law, get_law_detail
        import re

        results = []
        for ref in law_refs[:5]:  # 最多查5个法规
            try:
                search_result = await search_law.ainvoke({"keyword": ref})
                if "不可用" in search_result or "未找到" in search_result:
                    results.append(f"《{ref}》：未找到相关法规")
                    continue

                # 提取第一个 lawId
                law_id_match = re.search(r'lawId:\s*(\S+)', search_result)
                if law_id_match:
                    law_id = law_id_match.group(1)
                    detail = await get_law_detail.ainvoke({"law_id": law_id})
                    if "不可用" not in detail:
                        results.append(f"《{ref}》：\n{detail[:800]}")
                    else:
                        results.append(f"《{ref}》：详情获取失败")
                else:
                    results.append(f"《{ref}》：搜索结果中无lawId")
            except Exception as e:
                results.append(f"《{ref}》：查询失败 - {str(e)[:50]}")

        # 同时提取条款号
        articles = extract_article_numbers(text)
        article_info = ""
        if articles:
            article_info = f"\n\n文本中引用的条款：{', '.join(articles)}"

        return "\n\n".join(results) + article_info

    except Exception as e:
        return f"法规引用查找失败: {str(e)}"


# Register with registry
registry.register(lookup_law_references, allowed_agents=["*"])
