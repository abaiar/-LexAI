import time
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


@dataclass
class TraceStep:
    step_type: str  # "observe", "think", "act", "tool_call", "tool_result", "output"
    content: str
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Trace:
    session_id: str
    agent_id: str
    steps: List[TraceStep] = field(default_factory=list)
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    total_tokens: int = 0
    tool_call_count: int = 0

    @property
    def duration_ms(self) -> float:
        end = self.end_time or time.time()
        return (end - self.start_time) * 1000

    def to_dict(self) -> dict:
        return {
            "trace_id": self.session_id,
            "agent_name": self.agent_id,
            "start_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.start_time)),
            "duration_ms": round(self.duration_ms, 1),
            "total_tokens": self.total_tokens,
            "tool_call_count": self.tool_call_count,
            "steps": [
                {
                    "step_type": s.step_type,
                    "tool_name": s.metadata.get("tool_name", ""),
                    "result_preview": s.content[:200] if s.content else "",
                    "duration_ms": s.metadata.get("duration_ms", 0),
                    "timestamp": s.timestamp,
                }
                for s in self.steps
            ],
        }


class TraceManager:
    _instance = None
    _traces: Dict[str, Trace] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._traces = {}
        return cls._instance

    def start_trace(self, session_id: str, agent_id: str) -> Trace:
        trace = Trace(session_id=session_id, agent_id=agent_id)
        self._traces[session_id] = trace
        return trace

    def add_step(self, session_id: str, step_type: str, content: str, metadata: Dict = None):
        trace = self._traces.get(session_id)
        if trace:
            trace.steps.append(TraceStep(
                step_type=step_type,
                content=content,
                metadata=metadata or {},
            ))
            if step_type == "tool_call":
                trace.tool_call_count += 1

    def end_trace(self, session_id: str, total_tokens: int = 0):
        trace = self._traces.get(session_id)
        if trace:
            trace.end_time = time.time()
            trace.total_tokens = total_tokens

    def get_trace(self, session_id: str) -> Optional[Trace]:
        return self._traces.get(session_id)

    def get_recent_traces(self, limit: int = 20) -> List[Trace]:
        traces = sorted(self._traces.values(), key=lambda t: t.start_time, reverse=True)
        return traces[:limit]


trace_manager = TraceManager()


def _init_demo_traces():
    """初始化演示追踪数据，确保前端页面有内容展示"""
    now = time.time()

    # 演示1：法律咨询
    t1 = trace_manager.start_trace("demo_legal_consult", "legal_agent")
    t1.start_time = now - 300
    trace_manager.add_step("demo_legal_consult", "observe", "公司拖欠工资三个月，未签劳动合同，如何维权？")
    t1.steps[-1].timestamp = now - 299
    trace_manager.add_step("demo_legal_consult", "think", "用户咨询劳动纠纷，需要检索相关法规和案例")
    t1.steps[-1].timestamp = now - 298
    trace_manager.add_step("demo_legal_consult", "tool_call", "search_law('劳动合同法')", {"tool_name": "search_law", "duration_ms": 3200})
    t1.steps[-1].timestamp = now - 295
    trace_manager.add_step("demo_legal_consult", "tool_call", "search_case('拖欠工资')", {"tool_name": "search_case", "duration_ms": 4100})
    t1.steps[-1].timestamp = now - 291
    trace_manager.add_step("demo_legal_consult", "output", "根据《劳动合同法》第30条、第82条，用人单位应当按照劳动合同约定和国家规定，向劳动者及时足额支付劳动报酬。未签订劳动合同的，应当向劳动者每月支付二倍的工资。")
    t1.steps[-1].timestamp = now - 289
    t1.end_time = now - 289
    t1.tool_call_count = 2

    # 演示2：合同审查
    t2 = trace_manager.start_trace("demo_contract_review", "contract_review_agent")
    t2.start_time = now - 180
    trace_manager.add_step("demo_contract_review", "observe", "审查房屋租赁合同，长度3200字")
    t2.steps[-1].timestamp = now - 179
    trace_manager.add_step("demo_contract_review", "think", "识别合同类型为房屋租赁，规划审查维度")
    t2.steps[-1].timestamp = now - 178
    trace_manager.add_step("demo_contract_review", "tool_call", "search_law('房屋租赁')", {"tool_name": "search_law", "duration_ms": 2800})
    t2.steps[-1].timestamp = now - 175
    trace_manager.add_step("demo_contract_review", "tool_call", "lookup_law_references('《民法典》第三编')", {"tool_name": "lookup_law_references", "duration_ms": 3500})
    t2.steps[-1].timestamp = now - 171
    trace_manager.add_step("demo_contract_review", "output", "审查完成：发现3处风险条款，2项缺失条款，评分72分")
    t2.steps[-1].timestamp = now - 168
    t2.end_time = now - 168
    t2.tool_call_count = 2

    # 演示3：协作审查
    t3 = trace_manager.start_trace("demo_collab_review", "collaborative_review")
    t3.start_time = now - 60
    trace_manager.add_step("demo_collab_review", "observe", "多Agent协作审查劳动合同")
    t3.steps[-1].timestamp = now - 59
    trace_manager.add_step("demo_collab_review", "think", "Planner规划审查维度：完整性、合规性、风险")
    t3.steps[-1].timestamp = now - 58
    trace_manager.add_step("demo_collab_review", "tool_call", "Executor-1: 完整性审查", {"tool_name": "search_law", "duration_ms": 5600})
    t3.steps[-1].timestamp = now - 52
    trace_manager.add_step("demo_collab_review", "tool_call", "Executor-2: 合规性审查", {"tool_name": "search_law", "duration_ms": 4800})
    t3.steps[-1].timestamp = now - 47
    trace_manager.add_step("demo_collab_review", "tool_call", "Executor-3: 风险审查", {"tool_name": "search_case", "duration_ms": 6200})
    t3.steps[-1].timestamp = now - 41
    trace_manager.add_step("demo_collab_review", "output", "Reviewer汇总：完整性85分，合规性78分，风险评级中等，综合评分76分")
    t3.steps[-1].timestamp = now - 38
    t3.end_time = now - 38
    t3.tool_call_count = 3


_init_demo_traces()
