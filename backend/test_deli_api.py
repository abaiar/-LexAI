import asyncio
import sys
sys.path.insert(0, '.')

PASS_COUNT = 0
FAIL_COUNT = 0


def report(test_name: str, passed: bool, detail: str = ""):
    global PASS_COUNT, FAIL_COUNT
    status = "PASS" if passed else "FAIL"
    if passed:
        PASS_COUNT += 1
    else:
        FAIL_COUNT += 1
    msg = f"  [{status}] {test_name}"
    if detail:
        msg += f" - {detail}"
    print(msg)


async def test_deli_api_connectivity():
    print("\n" + "=" * 60)
    print("Test 1: Deli API Connectivity (3 endpoints)")
    print("=" * 60)

    from tools.deli_law_tool import search_law, get_law_detail
    from tools.deli_case_tool import search_case

    law_id_found = None

    print("\n  [search_law]")
    try:
        result = await search_law.ainvoke({"keyword": "民法典"})
        has_content = bool(result) and "不可用" not in result and "未找到" not in result
        report("search_law 基本调用", has_content)
        if has_content:
            import re
            match = re.search(r'lawId:\s*(\S+)', result)
            if match:
                law_id_found = match.group(1).strip()
                report("search_law 返回lawId", True, f"lawId={law_id_found[:30]}...")
            else:
                report("search_law 返回lawId", False, "未找到lawId")
    except Exception as e:
        report("search_law 基本调用", False, str(e))

    print("\n  [get_law_detail]")
    if law_id_found:
        try:
            detail = await get_law_detail.ainvoke({"law_id": law_id_found})
            has_detail = bool(detail) and "不可用" not in detail
            report("get_law_detail 基本调用", has_detail)
        except Exception as e:
            report("get_law_detail 基本调用", False, str(e))
    else:
        report("get_law_detail 基本调用", False, "无lawId可测试")

    print("\n  [search_case]")
    try:
        result = await search_case.ainvoke({"keyword": "合同纠纷"})
        has_content = bool(result) and "不可用" not in result and "未找到" not in result
        report("search_case 基本调用", has_content)
    except Exception as e:
        report("search_case 基本调用", False, str(e))


async def test_chat_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 2: chat_agent - Deli API工具集成")
    print("=" * 60)

    from agents.chat_agent import _get_tools
    tools = _get_tools()
    tool_names = [t.name for t in tools]

    report("包含 search_case 工具", "search_case" in tool_names)
    report("包含 search_law 工具", "search_law" in tool_names)
    report("包含 get_law_detail 工具", "get_law_detail" in tool_names)
    report("工具总数=3", len(tools) == 3, f"实际={len(tools)}")


async def test_compliance_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 3: compliance_agent - Deli API工具集成")
    print("=" * 60)

    from agents.compliance_agent import _get_tools
    tools = _get_tools()
    tool_names = [t.name for t in tools]

    report("包含 search_case 工具", "search_case" in tool_names)
    report("包含 search_law 工具", "search_law" in tool_names)
    report("包含 get_law_detail 工具", "get_law_detail" in tool_names)
    report("工具总数=3", len(tools) == 3, f"实际={len(tools)}")


async def test_labor_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 4: labor_agent - Deli API工具集成")
    print("=" * 60)

    from agents.labor_agent import _get_tools
    tools = _get_tools()
    tool_names = [t.name for t in tools]

    report("包含 search_case 工具", "search_case" in tool_names)
    report("包含 search_law 工具", "search_law" in tool_names)
    report("包含 get_law_detail 工具", "get_law_detail" in tool_names)
    report("工具总数=3", len(tools) == 3, f"实际={len(tools)}")


async def test_marriage_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 5: marriage_agent - Deli API工具集成")
    print("=" * 60)

    from agents.marriage_agent import _get_tools
    tools = _get_tools()
    tool_names = [t.name for t in tools]

    report("包含 search_case 工具", "search_case" in tool_names)
    report("包含 search_law 工具", "search_law" in tool_names)
    report("包含 get_law_detail 工具", "get_law_detail" in tool_names)
    report("工具总数=3", len(tools) == 3, f"实际={len(tools)}")


async def test_contract_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 6: contract_agent - Deli API直接调用集成")
    print("=" * 60)

    from agents.contract_agent import _search_relevant_legal_info, _extract_law_id
    import inspect

    source = inspect.getsource(_search_relevant_legal_info)
    report("_search_relevant_legal_info 调用 search_law", "search_law.ainvoke" in source)
    report("_search_relevant_legal_info 调用 search_case", "search_case.ainvoke" in source)
    report("_search_relevant_legal_info 调用 get_law_detail", "get_law_detail.ainvoke" in source)
    report("存在 _extract_law_id 辅助函数", callable(_extract_law_id))

    contract_text = "根据《中华人民共和国民法典》的规定，甲方与乙方签订本合同。"
    try:
        result = await _search_relevant_legal_info(contract_text)
        has_law = "法规检索" in result if result else False
        has_case = "案例检索" in result if result else False
        has_detail = "法规详情" in result if result else False
        report("_search_relevant_legal_info 实际调用返回法规", has_law)
        report("_search_relevant_legal_info 实际调用返回案例", has_case)
        report("_search_relevant_legal_info 实际调用返回法规详情", has_detail)
    except Exception as e:
        report("_search_relevant_legal_info 实际调用", False, str(e))


async def test_contract_compare_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 7: contract_compare_agent - Deli API直接调用集成")
    print("=" * 60)

    from agents.contract_compare_agent import _search_relevant_legal_info, _extract_law_id
    import inspect

    source = inspect.getsource(_search_relevant_legal_info)
    report("_search_relevant_legal_info 调用 search_law", "search_law.ainvoke" in source)
    report("_search_relevant_legal_info 调用 search_case", "search_case.ainvoke" in source)
    report("_search_relevant_legal_info 调用 get_law_detail", "get_law_detail.ainvoke" in source)
    report("存在 _extract_law_id 辅助函数", callable(_extract_law_id))

    original = "根据《中华人民共和国民法典》的规定，甲方与乙方签订本合同。"
    revised = "根据《中华人民共和国民法典》和《合同法》的规定，甲方与乙方修订本合同。"
    try:
        result = await _search_relevant_legal_info(original, revised)
        has_law = "法规检索" in result if result else False
        has_case = "案例检索" in result if result else False
        has_detail = "法规详情" in result if result else False
        report("_search_relevant_legal_info 实际调用返回法规", has_law)
        report("_search_relevant_legal_info 实际调用返回案例", has_case)
        report("_search_relevant_legal_info 实际调用返回法规详情", has_detail)
    except Exception as e:
        report("_search_relevant_legal_info 实际调用", False, str(e))


async def test_doc_interpret_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 8: doc_interpret_agent - Deli API直接调用集成")
    print("=" * 60)

    from agents.doc_interpret_agent import _search_relevant_legal_info, _extract_law_id
    import inspect

    source = inspect.getsource(_search_relevant_legal_info)
    report("_search_relevant_legal_info 调用 search_law", "search_law.ainvoke" in source)
    report("_search_relevant_legal_info 调用 search_case", "search_case.ainvoke" in source)
    report("_search_relevant_legal_info 调用 get_law_detail", "get_law_detail.ainvoke" in source)
    report("存在 _extract_law_id 辅助函数", callable(_extract_law_id))

    doc_text = "根据《中华人民共和国民法典》的规定，本协议如下。"
    try:
        result = await _search_relevant_legal_info(doc_text)
        has_law = "法规检索" in result if result else False
        has_case = "案例检索" in result if result else False
        has_detail = "法规详情" in result if result else False
        report("_search_relevant_legal_info 实际调用返回法规", has_law)
        report("_search_relevant_legal_info 实际调用返回案例", has_case)
        report("_search_relevant_legal_info 实际调用返回法规详情", has_detail)
    except Exception as e:
        report("_search_relevant_legal_info 实际调用", False, str(e))


async def test_docgen_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 9: docgen_agent - Deli API直接调用集成")
    print("=" * 60)

    from agents.docgen_agent import (
        _search_relevant_laws_for_doc,
        _search_relevant_laws_for_template,
        _extract_law_id,
    )
    import inspect

    source_doc = inspect.getsource(_search_relevant_laws_for_doc)
    source_template = inspect.getsource(_search_relevant_laws_for_template)

    report("_search_relevant_laws_for_doc 调用 search_law", "search_law.ainvoke" in source_doc)
    report("_search_relevant_laws_for_doc 调用 search_case", "search_case.ainvoke" in source_doc)
    report("_search_relevant_laws_for_doc 调用 get_law_detail", "get_law_detail.ainvoke" in source_doc)
    report("_search_relevant_laws_for_template 调用 search_law", "search_law.ainvoke" in source_template)
    report("_search_relevant_laws_for_template 调用 search_case", "search_case.ainvoke" in source_template)
    report("_search_relevant_laws_for_template 调用 get_law_detail", "get_law_detail.ainvoke" in source_template)
    report("存在 _extract_law_id 辅助函数", callable(_extract_law_id))

    try:
        result = await _search_relevant_laws_for_doc("劳动仲裁申请书", "拖欠工资")
        has_law = "法规检索" in result if result else False
        has_case = "案例检索" in result if result else False
        has_detail = "法规详情" in result if result else False
        report("_search_relevant_laws_for_doc 实际调用返回法规", has_law)
        report("_search_relevant_laws_for_doc 实际调用返回案例", has_case)
        report("_search_relevant_laws_for_doc 实际调用返回法规详情", has_detail)
    except Exception as e:
        report("_search_relevant_laws_for_doc 实际调用", False, str(e))


async def test_proofread_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 10: proofread_agent - Deli API直接调用集成")
    print("=" * 60)

    from agents.proofread_agent import _search_law_terms_for_proofread, _extract_law_id
    import inspect

    source = inspect.getsource(_search_law_terms_for_proofread)
    report("_search_law_terms_for_proofread 调用 search_law", "search_law.ainvoke" in source)
    report("_search_law_terms_for_proofread 调用 search_case", "search_case.ainvoke" in source)
    report("_search_law_terms_for_proofread 调用 get_law_detail", "get_law_detail.ainvoke" in source)
    report("存在 _extract_law_id 辅助函数", callable(_extract_law_id))

    text = "根据《中华人民共和国民法典》的规定，合同双方应当遵循诚信原则。"
    try:
        result = await _search_law_terms_for_proofread(text)
        has_law = "法规检索" in result if result else False
        has_case = "案例检索" in result if result else False
        has_detail = "法规详情" in result if result else False
        report("_search_law_terms_for_proofread 实际调用返回法规", has_law)
        report("_search_law_terms_for_proofread 实际调用返回案例", has_case)
        report("_search_law_terms_for_proofread 实际调用返回法规详情", has_detail)
    except Exception as e:
        report("_search_law_terms_for_proofread 实际调用", False, str(e))


async def test_contract_draft_agent_deli_integration():
    print("\n" + "=" * 60)
    print("Test 11: contract_draft_agent - Deli API集成")
    print("=" * 60)

    from agents.contract_draft_agent import search_relevant_laws, _extract_law_id
    import inspect

    source = inspect.getsource(search_relevant_laws)
    report("search_relevant_laws 调用 search_law", "search_law.ainvoke" in source)
    report("search_relevant_laws 调用 search_case", "search_case.ainvoke" in source)
    report("search_relevant_laws 调用 get_law_detail", "get_law_detail.ainvoke" in source)
    report("存在 _extract_law_id 辅助函数", callable(_extract_law_id))

    outline_source = inspect.getsource(
        __import__("agents.contract_draft_agent", fromlist=["generate_contract_outline"]).generate_contract_outline
    )
    report("generate_contract_outline 调用 search_relevant_laws", "search_relevant_laws" in outline_source)

    try:
        result = await search_relevant_laws("买卖合同")
        has_law = "法规检索" in result if result else False
        has_case = "案例检索" in result if result else False
        has_detail = "法规详情" in result if result else False
        report("search_relevant_laws 实际调用返回法规", has_law)
        report("search_relevant_laws 实际调用返回案例", has_case)
        report("search_relevant_laws 实际调用返回法规详情", has_detail)
    except Exception as e:
        report("search_relevant_laws 实际调用", False, str(e))


async def test_extract_law_id_helper():
    print("\n" + "=" * 60)
    print("Test 12: _extract_law_id 辅助函数")
    print("=" * 60)

    from agents.contract_agent import _extract_law_id

    test_result = "1. 中华人民共和国民法典\n   效力: 现行有效 | 级别: 法律\n   lawId: abc123def456"
    law_id = _extract_law_id(test_result)
    report("_extract_law_id 正确提取lawId", law_id == "abc123def456", f"提取结果={law_id}")

    empty_result = "未找到相关法规。"
    law_id_empty = _extract_law_id(empty_result)
    report("_extract_law_id 无lawId时返回空字符串", law_id_empty == "", f"提取结果={law_id_empty}")


async def main():
    print("=" * 60)
    print("  得理API Agent集成全面测试")
    print("=" * 60)

    await test_deli_api_connectivity()
    await test_chat_agent_deli_integration()
    await test_compliance_agent_deli_integration()
    await test_labor_agent_deli_integration()
    await test_marriage_agent_deli_integration()
    await test_contract_agent_deli_integration()
    await test_contract_compare_agent_deli_integration()
    await test_doc_interpret_agent_deli_integration()
    await test_docgen_agent_deli_integration()
    await test_proofread_agent_deli_integration()
    await test_contract_draft_agent_deli_integration()
    await test_extract_law_id_helper()

    print("\n" + "=" * 60)
    print(f"  测试结果汇总: PASS={PASS_COUNT}, FAIL={FAIL_COUNT}, TOTAL={PASS_COUNT + FAIL_COUNT}")
    print("=" * 60)

    if FAIL_COUNT > 0:
        print("  ⚠️ 存在失败的测试项，请检查上方输出")
        sys.exit(1)
    else:
        print("  ✅ 所有测试通过！所有Agent均已正确集成得理API")


asyncio.run(main())
