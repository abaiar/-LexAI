from typing import Dict, List, Optional
from langchain_core.tools import BaseTool


class ToolRegistry:
    _instance = None
    _tools: Dict[str, BaseTool] = {}
    _permissions: Dict[str, List[str]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tools = {}
            cls._instance._permissions = {}
        return cls._instance

    def register(self, tool: BaseTool, allowed_agents: Optional[List[str]] = None):
        self._tools[tool.name] = tool
        self._permissions[tool.name] = allowed_agents or ["*"]

    def get_tool(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def get_tools_for_agent(self, agent_id: str) -> List[BaseTool]:
        result = []
        for name, tool in self._tools.items():
            allowed = self._permissions.get(name, ["*"])
            if "*" in allowed or agent_id in allowed:
                result.append(tool)
        return result

    def get_all_tools(self) -> List[BaseTool]:
        return list(self._tools.values())

    def list_tool_names(self) -> List[str]:
        return list(self._tools.keys())


registry = ToolRegistry()
