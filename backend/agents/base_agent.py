from typing import AsyncGenerator, List, Optional
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from config import settings
from harness.registry import registry
from harness.trace import trace_manager
from harness.fallback import fallback_chat, is_tool_call_error
from harness.context import compact_messages
from memory.session_memory import get_or_create_memory, build_messages_from_history


class BaseAgent:
    agent_id: str = "base_agent"
    skill_id: str = ""
    temperature: float = 0.7
    max_iterations: int = 5

    def _get_llm(self) -> ChatOpenAI:
        return ChatOpenAI(
            model=settings.get_active_model(),
            openai_api_key=settings.get_active_api_key(),
            openai_api_base=settings.get_active_base_url(),
            streaming=True,
            temperature=self.temperature,
        )

    def _get_tools(self):
        return registry.get_tools_for_agent(self.agent_id)

    def _get_system_prompt(self) -> str:
        if self.skill_id:
            from skills.skill_loader import get_skill
            skill = get_skill(self.skill_id)
            if skill and skill.system_prompt:
                return skill.system_prompt
        return "你是一个专业的法律AI助手。"

    def _build_prompt(self, system_prompt: str = None) -> ChatPromptTemplate:
        prompt = system_prompt or self._get_system_prompt()
        return ChatPromptTemplate.from_messages([
            ("system", prompt),
            MessagesPlaceholder("chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ])

    def _get_agent_executor(self, system_prompt: str = None) -> AgentExecutor:
        llm = self._get_llm()
        tools = self._get_tools()
        prompt = self._build_prompt(system_prompt)
        agent = create_tool_calling_agent(llm, tools, prompt)
        return AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            max_iterations=self.max_iterations,
            handle_parsing_errors=True,
        )

    async def stream_chat(
        self,
        message: str,
        session_id: str,
        history: list,
        system_prompt: str = None,
        step_prefix: str = "",
    ) -> AsyncGenerator[dict, None]:
        if not settings.is_api_key_configured():
            yield {
                "type": "error",
                "content": "API Key 未配置。请先前往「账户设置」配置大模型 API Key 后再使用。"
            }
            yield {"type": "done", "content": ""}
            return

        session_key = f"{self.agent_id}_{session_id}"
        memory = get_or_create_memory(session_key)
        chat_history = build_messages_from_history(history)

        trace = trace_manager.start_trace(session_key, self.agent_id)
        trace_manager.add_step(session_key, "observe", message[:200])

        executor = self._get_agent_executor(system_prompt)

        yield {
            "type": "agent_step",
            "content": f"{step_prefix}意图识别中..." if step_prefix else "意图识别中..."
        }

        try:
            collected_content = ""
            current_step = 1

            async for event in executor.astream_events(
                {"input": message, "chat_history": chat_history},
                version="v1",
            ):
                kind = event.get("event", "")

                if kind == "on_tool_start":
                    tool_name = event.get("name", "未知工具")
                    current_step += 1
                    step_map = {
                        "search_case": "案例检索: 正在查询相似案例...",
                        "search_law": "法规检索: 正在查询相关法规...",
                        "get_law_detail": "法规详情: 正在获取法规全文...",
                        "extract_fields": "信息提取: 正在从描述中提取关键信息...",
                        "clarify_missing": "智能追问: 正在分析缺失信息...",
                    }
                    step_content = step_map.get(tool_name, f"调用工具: {tool_name}")
                    trace_manager.add_step(session_key, "tool_call", f"{tool_name}", {"step": current_step})
                    yield {
                        "type": "agent_step",
                        "content": f"{current_step}. {step_content}"
                    }

                elif kind == "on_tool_end":
                    current_step += 1
                    yield {
                        "type": "agent_step",
                        "content": f"{current_step}. 综合评估检索结果..."
                    }

                elif kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        token = chunk.content
                        if isinstance(token, str) and token:
                            collected_content += token
                            yield {"type": "token", "content": token}

                elif kind == "on_chain_error":
                    trace_manager.add_step(session_key, "think", "工具调用异常，切换纯AI分析")
                    yield {
                        "type": "agent_step",
                        "content": "工具调用异常，切换纯AI分析..."
                    }

            memory.chat_memory.add_user_message(message)
            if collected_content:
                memory.chat_memory.add_ai_message(collected_content)

            trace_manager.add_step(session_key, "output", collected_content[:200] if collected_content else "")
            trace_manager.end_trace(session_key)

        except Exception as e:
            trace_manager.add_step(session_key, "think", f"Agent异常: {str(e)[:100]}")

            if is_tool_call_error(e):
                try:
                    prompt_text = system_prompt or self._get_system_prompt()
                    collected_content = ""
                    async for token in fallback_chat(
                        message=message,
                        system_prompt=prompt_text,
                        chat_history=chat_history,
                        session_id=session_key,
                    ):
                        collected_content += token
                        yield {"type": "token", "content": token}

                    memory.chat_memory.add_user_message(message)
                    if collected_content:
                        memory.chat_memory.add_ai_message(collected_content)
                except Exception as fallback_err:
                    err_msg = str(fallback_err)
                    if "auth" in err_msg.lower() or "key" in err_msg.lower() or "401" in err_msg:
                        yield {
                            "type": "error",
                            "content": "API Key 无效或已过期，请前往「账户设置」重新配置。"
                        }
                    else:
                        yield {"type": "error", "content": f"处理错误: {err_msg}"}
            else:
                error_str = str(e)
                if "auth" in error_str.lower() or "key" in error_str.lower() or "401" in error_str:
                    yield {
                        "type": "error",
                        "content": "API Key 无效或已过期，请前往「账户设置」重新配置。"
                    }
                else:
                    yield {"type": "error", "content": f"处理错误: {error_str}"}

            trace_manager.end_trace(session_key)

        yield {"type": "done", "content": ""}
