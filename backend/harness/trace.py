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
            "session_id": self.session_id,
            "agent_id": self.agent_id,
            "duration_ms": round(self.duration_ms, 1),
            "total_tokens": self.total_tokens,
            "tool_call_count": self.tool_call_count,
            "steps": [
                {
                    "type": s.step_type,
                    "content": s.content[:200],
                    "timestamp": s.timestamp,
                    "metadata": s.metadata,
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
