from typing import Dict, List, Set


AGENT_PERMISSIONS: Dict[str, Set[str]] = {
    "legal_agent": {"search_law", "get_law_detail", "search_case"},
    "contract_review_agent": {"search_law", "get_law_detail", "search_case"},
    "contract_draft_agent": {"search_law", "get_law_detail", "search_case", "extract_fields", "clarify_missing"},
    "contract_compare_agent": {"search_law", "get_law_detail", "search_case"},
    "doc_interpret_agent": {"search_law", "get_law_detail", "search_case"},
    "proofread_agent": {"search_law", "get_law_detail", "search_case"},
    "docgen_agent": {"search_law", "get_law_detail", "search_case", "extract_fields", "clarify_missing"},
    "planner_agent": {"search_law", "search_case"},
    "executor_agent": {"search_law", "get_law_detail", "search_case"},
    "reviewer_agent": set(),
}

DANGEROUS_TOOLS: Set[str] = set()


def is_tool_allowed(agent_id: str, tool_name: str) -> bool:
    permissions = AGENT_PERMISSIONS.get(agent_id, set())
    return tool_name in permissions


def requires_confirmation(tool_name: str) -> bool:
    return tool_name in DANGEROUS_TOOLS


def get_allowed_tools(agent_id: str) -> Set[str]:
    return AGENT_PERMISSIONS.get(agent_id, set())
