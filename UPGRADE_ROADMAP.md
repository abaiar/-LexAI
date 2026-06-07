# 小理智法 AI (LexAI) — 智能体能力升级路线规划

> **目标**：基于专家评价反馈与 Agents.md 先进理念，在 8 天内完成核心能力升级，满足 AI Agents Hackathon 2026 评审标准
> **截止日期**：2026年6月15日 17:30 IST（北京时间 20:00）
> **当前日期**：2026年6月7日

---

## 一、比赛评审标准与项目现状差距分析

### 1.1 评审标准映射

| 评审维度 | 权重推断 | 当前状态 | 差距 |
|---------|---------|---------|------|
| Innovation and originality | 高 | 功能完备但创新性不足，5/9 Agent 是固定 Chain | 缺乏自主决策、记忆、协作等 Agent 深度特性 |
| Technical implementation quality | 高 | FastAPI+LangChain 架构成熟，但工具代码重复 | 需统一 Harness、消除重复、增加 Trace |
| Real-world usefulness and scalability | 中高 | 法律场景覆盖全面，但表单交互繁琐 | 需自然语言交互、持久化记忆 |
| AI agent capabilities and execution | **最高** | Agent 深度不够（专家2明确指出） | **核心短板**：无自主决策、无多Agent协作、无记忆 |
| Product thinking and user experience | 中 | 页面简洁但交互智能化不足 | 需自然语言输入、智能追问 |
| Quality of presentation and demonstration | 中 | 演示完备 | 需突出 Agent 深度能力的 Demo |

### 1.2 专家评价核心问题

| 专家 | 问题 | 严重程度 |
|------|------|---------|
| 专家1 | 合同起草表单繁琐，需自然语言输入识别 | 高（直接影响用户体验） |
| 专家2 | AI系统应用深度不够，需突出重点功能及效果 | **最高**（评审核心维度） |
| 专家3 | 缺乏自研微调能力与检索召回的量化评估 | 中高（技术深度指标） |

---

## 二、三大核心升级方案

### 升级一：自然语言信息提取（解决专家1）

**问题**：合同起草/文书生成依赖硬编码表单字段，用户需逐项填写 15+ 字段，门槛高。

**方案**：新增 NLU Tool，支持用户用自然语言描述需求，Agent 自动提取关键信息并填充模板。

**技术路径**：
1. 新增 `extract_fields` Tool：接收用户自然语言输入 + 模板 ID，输出结构化字段 JSON
2. 新增 `clarify_missing` Tool：识别缺失关键字段，生成智能追问问题
3. 前端新增自然语言输入模式：用户可选择"表单模式"或"对话模式"
4. 对话模式流程：自然语言描述 → 自动提取 → 展示确认 → 追问缺失 → 生成

**验收标准**：
- 用户用一句话描述合同需求，系统自动提取 ≥80% 字段
- 缺失字段生成针对性追问（非泛化问题如"请补充信息"）
- 前端两种输入模式可切换

### 升级二：多 Agent 协作审查（解决专家2）

**问题**：合同审查是单 Agent 单次调用，无迭代优化，无交叉验证，AI 应用深度不够。

**方案**：引入 Planner → Executor×N → Reviewer 三角色协作，实现多维度专项审查。

**技术路径**：
1. 使用 LangGraph 构建状态图编排多 Agent 流程
2. Planner Agent：分析合同类型和复杂度，生成审查计划
3. Executor Agent（可并行）：
   - 条款完整性审查：逐条检查必要条款是否缺失
   - 法律合规审查：检索相关法规，逐条比对
   - 风险识别审查：识别不利条款
4. Reviewer Agent：汇总结果、去重、按风险排序、生成最终报告
5. 简单合同可跳过部分 Executor（Planner 自主决策）

**验收标准**：
- 复杂合同审查结果包含 ≥3 个专项维度分析
- 风险识别数量比单 Agent 模式提升 ≥30%
- 审查报告结构清晰，含风险等级排序

### 升级三：本地知识库 + RAG + 量化评估（解决专家3）

**问题**：完全依赖得理 API，无本地知识库，无检索质量评估。

**方案**：构建法律领域向量知识库，实现混合检索，建立量化评估体系。

**技术路径**：
1. 知识库构建：法规全文 + 合同范本 → 语义分块 → BGE-M3 Embedding → Chroma 向量库
2. 混合检索：向量相似度检索 + 得理 API 关键词检索 → Rerank → 合并去重
3. 评估数据集：50 个法律查询 + 20 份标注合同 + 30 个咨询问答
4. 自动化评估：Recall@K、Precision@K、引用正确率、幻觉率

**验收标准**：
- 知识库覆盖 ≥200 部常用法规
- Recall@5 ≥ 75%，引用正确率 ≥ 90%
- 评估报告可自动生成

---

## 三、Agents.md 先进理念深度融合

### 3.1 Memory Agent 智能记忆体系

> 来源：Agents.md Stage 2 "区分短期上下文、会话记忆、长期记忆" + Stage 3 "session store、context compaction" + 开源项目 mem0 / Letta

**当前问题**：`ConversationBufferWindowMemory(k=10)` 纯内存存储，服务重启后丢失，无跨会话记忆，无用户画像。

**升级方案：三层记忆架构**

```
┌─────────────────────────────────────────────────┐
│                  Memory Agent                    │
│            （统一记忆管理入口）                     │
├─────────────┬──────────────┬────────────────────┤
│  工作记忆    │  会话记忆      │  长期记忆           │
│ Working Mem │ Session Mem  │ Long-term Mem      │
├─────────────┼──────────────┼────────────────────┤
│ 当前对话上下文│ 会话摘要+关键  │ 用户画像+历史结论    │
│ 工具调用结果  │  法律引用      │ 偏好模板+常用条款    │
│ Agent 推理链 │ 决策记录      │ 审查历史+反馈       │
├─────────────┼──────────────┼────────────────────┤
│ LLM 上下文窗 │ Redis        │ MySQL + 向量库      │
│ 自动压缩     │ TTL 30天     │ 永久存储            │
└─────────────┴──────────────┴────────────────────┘
```

**实现细节**：

| 层级 | 存储介质 | 内容 | 生命周期 | 压缩策略 |
|------|---------|------|---------|---------|
| 工作记忆 | LLM 上下文窗口 | 当前对话、工具结果、推理过程 | 单次请求 | 超过 token 阈值时自动摘要压缩 |
| 会话记忆 | Redis | 对话摘要、关键法律引用、决策记录 | 30 天 TTL | 每轮对话结束生成摘要，仅保留摘要 |
| 长期记忆 | MySQL + Chroma | 用户画像、历史审查结论、偏好条款 | 永久 | 按语义去重，相似结论合并 |

**关键机制**：

1. **Context Compaction（上下文压缩）**：
   - 当对话 token 数超过阈值（如 4000）时，自动将早期对话压缩为摘要
   - 保留关键法律引用和结论，丢弃寒暄和重复内容
   - 压缩后仍保留最近 3 轮完整对话

2. **Memory Recall（记忆召回）**：
   - 新会话启动时，根据用户 ID 加载长期记忆中的相关画像
   - 用户提及历史合同时，从向量库检索相似审查结论
   - 工具调用结果缓存：相同法规查询 30 分钟内直接返回缓存

3. **Memory Consolidation（记忆整合）**：
   - 会话结束时，提取关键信息（法律引用、审查结论、用户偏好）写入长期记忆
   - 定期合并相似记忆条目，避免冗余
   - 用户反馈（采纳/修改审查建议）更新偏好权重

**代码结构**：

```
backend/memory/
├── memory_agent.py          # 新增：统一记忆管理 Agent
├── working_memory.py        # 新增：工作记忆（上下文压缩）
├── session_memory.py        # 重构：会话记忆（Redis 持久化）
├── long_term_memory.py      # 新增：长期记忆（MySQL + 向量库）
└── memory_utils.py          # 新增：压缩、召回、整合工具函数
```

### 3.2 Agent Harness 工程

> 来源：Agents.md Stage 3 "agent 的能力很大一部分来自 harness：工具协议、权限、状态、反馈、回放、CI、评测"

**当前问题**：9 个 Agent 各自实现工具调用逻辑，无统一注册/权限/追踪/回放机制。

**升级方案**：

```
backend/harness/
├── registry.py              # 工具注册中心
│   - 统一注册所有 Tool（name, description, schema, permission）
│   - Agent 按权限动态获取可用工具列表
│   - 工具版本管理
├── permission.py            # 权限控制
│   - 定义 Agent-Tool 权限矩阵
│   - 危险操作（如删除数据）需人工确认
├── session.py               # 会话状态管理
│   - 统一 session 生命周期
│   - 替代当前散落在各 Agent 中的 session 逻辑
├── trace.py                 # 执行追踪
│   - 记录每步决策：observe → think → act → observe
│   - 存储到数据库，支持回放和调试
│   - 记录 token 消耗、工具调用次数、耗时
├── context.py               # 上下文压缩
│   - 长对话自动摘要
│   - 保留关键法律引用和结论
└── fallback.py              # 降级策略
    - Agent 异常时统一 fallback 到纯 LLM 对话
    - 工具不可用时降级到本地知识库
```

**核心接口设计**：

```python
class AgentHarness:
    async def run(self, agent_id: str, input: str, session_id: str) -> AsyncGenerator:
        """统一 Agent 执行入口，自动处理权限、追踪、降级"""

    def register_tool(self, tool: BaseTool, permissions: list[str]):
        """注册工具到注册中心"""

    def get_trace(self, session_id: str) -> Trace:
        """获取执行追踪，支持回放"""

    def compact_context(self, session_id: str, max_tokens: int):
        """压缩上下文，保留关键信息"""
```

### 3.3 Skills 可复用能力体系

> 来源：Agents.md Stage 5 "Skill 和 Tool 的区别：tool 是可调用接口，skill 是可复用流程知识"

**当前问题**：4 个咨询 Agent 代码 90% 重复，仅 system prompt 不同；法律流程知识硬编码在 prompt 中。

**升级方案**：

```
backend/skills/
├── legal_consultation/
│   ├── SKILL.md             # 技能描述、触发条件、验收标准
│   ├── prompt.md            # 可版本化的 prompt 模板
│   └── validators.py        # 输出校验脚本
├── labor_dispute/
│   ├── SKILL.md
│   ├── prompt.md
│   └── validators.py
├── corporate_compliance/
│   ├── SKILL.md
│   ├── prompt.md
│   └── validators.py
├── marriage_property/
│   ├── SKILL.md
│   ├── prompt.md
│   └── validators.py
├── contract_review/
│   ├── SKILL.md
│   ├── prompt.md
│   └── validators.py
└── contract_draft/
    ├── SKILL.md
    ├── prompt.md
    └── validators.py
```

**SKILL.md 模板**：

```markdown
# Skill: [技能名称]

## 何时使用
[触发条件描述]

## 专业上下文
- 核心法规：[法规列表]
- 默认搜索关键词：[关键词列表]
- 输出格式：[格式描述]

## 执行步骤
1. [步骤1]
2. [步骤2]
3. [步骤3]

## 验收标准
- [标准1]
- [标准2]

## 禁止行为
- [禁止1]
- [禁止2]
```

### 3.4 Chain → 真正 Agent 的改造

> 来源：Agents.md Stage 1 "agent 的基本循环：observe -> think -> act -> observe"

**当前问题**：5 个 Chain Agent 总是调用所有工具，不根据输入判断是否需要。

**改造原则**：
- Agent 自主决定是否调用工具、调用哪些、调用几次
- 简单输入（如"帮我看看这个租赁合同"）→ 可能只需检索合同法
- 复杂输入（如"这份劳动合同涉及竞业限制和股权激励"）→ 需要多轮检索不同法规
- 已有法律引用 → 精准检索特定法规
- 无引用 → Agent 自主生成搜索关键词

**改造范围**：

| Agent | 当前 | 改造后 |
|-------|------|--------|
| 合同审查 | Chain：固定调用3个工具 | Agent：自主决策工具调用 |
| 合同起草 | Chain：固定调用2个工具 | Agent：自主决策 + NLU 提取 |
| 合同对比 | Chain：固定调用3个工具 | Agent：自主决策工具调用 |
| 文书解读 | Chain：固定调用3个工具 | Agent：自主决策工具调用 |
| 智能校对 | Chain：固定调用3个工具 | Agent：自主决策工具调用 |

---

## 四、8天冲刺实施计划

### 时间总览

```
Day 1-2 (6/7-6/8)  ：基础架构重构 + Harness 骨架
Day 3-4 (6/9-6/10) ：核心能力升级（NLU + Chain→Agent + Memory）
Day 5-6 (6/11-6/12)：深度特性（多Agent协作 + 知识库 + 评估）
Day 7   (6/13)      ：集成测试 + Demo 优化
Day 8   (6/14)      ：文档 + 视频 + 提交准备
```

### Day 1 (6/7)：基础架构重构

| 任务 | 具体内容 | 产出 | 验收标准 |
|------|---------|------|---------|
| Harness 骨架 | 实现 `registry.py` + `trace.py` + `fallback.py` | 3 个核心模块 | 工具可统一注册，执行可追踪，异常可降级 |
| 合并重复代码 | 抽取 `_extract_law_id`、`_parse_json_result`、`_search_relevant_legal_info` 到公共模块 | `utils/law_utils.py` | 5 个 Chain Agent 改为引用公共函数，零重复 |
| 合并得理 Tool | 3 个得理 API Tool 文件合并为 `deli_tools.py` | 1 个统一文件 | 功能不变，代码量减少 50% |

### Day 2 (6/8)：Agent 统一 + Skills 体系

| 任务 | 具体内容 | 产出 | 验收标准 |
|------|---------|------|---------|
| 合并咨询 Agent | 4 个咨询 Agent 合并为 1 个通用法律 Agent | `legal_agent.py` | 4 个领域功能不变，代码量减少 60% |
| Skills 体系 | 为 6 个核心能力创建 SKILL.md + prompt.md | `skills/` 目录 | 新增领域只需添加 SKILL.md |
| 路由适配 | 4 个咨询路由统一指向 `legal_agent.py`，通过 skill_id 区分 | 路由更新 | API 接口不变，前端无感知 |

### Day 3 (6/9)：NLU 自然语言提取 + Chain→Agent

| 任务 | 具体内容 | 产出 | 验收标准 |
|------|---------|------|---------|
| NLU Tool | 实现 `extract_fields` + `clarify_missing` | 2 个新 Tool | 一句话描述可提取 ≥80% 字段 |
| 合同起草改造 | Chain → Agent + NLU 集成 | `contract_draft_agent.py` 重构 | 支持自然语言输入模式 |
| 文书生成改造 | Chain → Agent + NLU 集成 | `docgen_agent.py` 重构 | 支持自然语言输入模式 |
| 前端适配 | 合同起草/文书生成页面增加自然语言输入模式 | 前端组件更新 | 两种模式可切换 |

### Day 4 (6/10)：Memory Agent + 会话持久化

| 任务 | 具体内容 | 产出 | 验收标准 |
|------|---------|------|---------|
| Memory Agent | 实现三层记忆架构 | `memory/` 目录重构 | 工作记忆自动压缩，会话记忆 Redis 持久化 |
| 会话持久化 | ConversationBufferWindowMemory → Redis | `session_memory.py` 重构 | 服务重启后会话可恢复 |
| 长期记忆 | 用户画像 + 历史审查结论存储 | `long_term_memory.py` | 新会话可加载用户历史偏好 |
| Context Compaction | 长对话自动摘要压缩 | `context.py` | 超 4000 token 自动压缩，保留关键引用 |

### Day 5 (6/11)：多 Agent 协作审查

| 任务 | 具体内容 | 产出 | 验收标准 |
|------|---------|------|---------|
| LangGraph 编排 | 构建合同审查状态图 | `workflows/contract_review.py` | Planner→Executor×N→Reviewer 流程可运行 |
| Planner Agent | 分析合同类型，生成审查计划 | `agents/planner_agent.py` | 简单合同 2 维度，复杂合同 4 维度 |
| Executor Agent | 条款完整性 + 法律合规 + 风险识别 3 个专项审查 | `agents/executor_agents.py` | 各维度独立输出结构化结果 |
| Reviewer Agent | 汇总、去重、排序、生成报告 | `agents/reviewer_agent.py` | 最终报告含风险等级排序 |
| 前端适配 | 审查结果展示多维度分析 | 前端组件更新 | 可查看各专项审查详情 |

### Day 6 (6/12)：本地知识库 + 评估体系

| 任务 | 具体内容 | 产出 | 验收标准 |
|------|---------|------|---------|
| 向量知识库 | 法规分块 → BGE-M3 Embedding → Chroma | `knowledge/` 目录 | 覆盖 ≥200 部常用法规 |
| 混合检索 | 向量检索 + 得理 API + Rerank | `tools/knowledge_tool.py` | Recall@5 ≥ 75% |
| 评估数据集 | 50 个法律查询 + 20 份标注合同 | `evals/` 目录 | 覆盖主要业务场景 |
| 自动化评估 | 评估脚本 + 指标报告 | `evals/run_eval.py` | 一键输出 Recall/Precision/引用正确率 |

### Day 7 (6/13)：集成测试 + Demo 优化

| 任务 | 具体内容 | 产出 | 验收标准 |
|------|---------|------|---------|
| 端到端测试 | 全功能回归测试 | 测试报告 | 所有核心功能正常 |
| Demo 脚本 | 准备演示用合同/文书/咨询场景 | Demo 数据集 | 3 个场景覆盖核心升级能力 |
| 前端打磨 | 交互细节优化、加载状态、错误提示 | 前端更新 | 用户体验流畅 |
| 性能优化 | 上下文压缩、并行工具调用、缓存 | 性能报告 | 平均响应时间降低 ≥30% |

### Day 8 (6/14)：文档 + 视频 + 提交

| 任务 | 具体内容 | 产出 | 验收标准 |
|------|---------|------|---------|
| README 更新 | 架构图、升级说明、运行指南 | README.md | 他人可 clone 运行 |
| 2分钟 Demo 视频 | 产品演示 + 技术架构讲解 | demo_video.mp4 | 突出 Agent 深度能力 |
| 架构文档 | 技术架构、Agent 设计、评估结果 | ARCHITECTURE.md | 评审可理解技术深度 |
| 提交准备 | 代码整理、环境变量模板、部署说明 | 完整项目包 | 满足提交要求 |

---

## 五、技术实现关键路径

### 5.1 核心依赖

| 依赖 | 用途 | 版本 | 新增/已有 |
|------|------|------|----------|
| langgraph | 多 Agent 状态图编排 | ≥0.1.0 | 新增 |
| chromadb | 本地向量数据库 | ≥0.4.0 | 新增 |
| redis | 会话记忆持久化 | ≥5.0 | 新增 |
| sentence-transformers | BGE-M3 Embedding | ≥2.2.0 | 新增 |
| FlagEmbedding | BGE Reranker | ≥1.2.0 | 新增 |

### 5.2 关键技术决策

| 决策点 | 方案 | 理由 |
|--------|------|------|
| Agent 编排 | LangGraph | 项目已用 LangChain，迁移成本最低 |
| 向量数据库 | Chroma | 零配置启动，适合 8 天冲刺 |
| Embedding | BGE-M3 | 中文法律领域表现最优 |
| 会话存储 | Redis | 高频读写，支持 TTL 自动过期 |
| 长期记忆 | MySQL + Chroma | 项目已有 MySQL，Chroma 复用向量库 |

### 5.3 风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| LangGraph 学习曲线 | 中 | 延迟 Day 5 | Day 2 开始并行学习，备选方案用 AgentExecutor 链式调用 |
| Redis 部署复杂度 | 低 | 延迟 Day 4 | 优先用文件持久化，Redis 作为增强 |
| BGE-M3 模型下载慢 | 中 | 延迟 Day 6 | 提前下载，备选 text-embedding-3-small API |
| 多 Agent 响应延迟 | 中 | 用户体验差 | Executor 并行执行，设置超时阈值 |
| 评估数据集构建耗时 | 中 | 延迟 Day 6 | LLM 辅助生成初始标注，人工审核 |

---

## 六、验收标准与评估指标

### 6.1 比赛评审维度对应验收

| 评审维度 | 验收方式 | 目标 |
|---------|---------|------|
| Innovation and originality | 多 Agent 协作 + Memory Agent + Skills 体系 | 3 项创新特性可演示 |
| Technical implementation quality | Harness 架构 + 零重复代码 + Trace 追踪 | 代码质量显著提升 |
| Real-world usefulness | 自然语言输入 + 智能追问 + 持久化记忆 | 非法律专业用户可独立使用 |
| AI agent capabilities | 自主决策 + 多 Agent 协作 + 记忆召回 | Agent 深度显著提升 |
| Product thinking | 双模式交互 + 个性化服务 | 用户体验流畅 |
| Presentation quality | Demo 视频 + 架构图 + 评估报告 | 清晰展示技术深度 |

### 6.2 量化指标

| 指标 | 当前基线 | 目标值 |
|------|---------|--------|
| 真正 Agent 占比 | 44%（4/9） | 100%（9/9） |
| 合同起草字段自动填充率 | 0% | ≥80% |
| 审查风险识别提升 | 基线 | +30% |
| 检索 Recall@5 | 无评估 | ≥75% |
| 引用正确率 | 无评估 | ≥90% |
| 重复代码量 | 5 处 | 0 处 |
| 会话可恢复性 | 0% | 100% |
| 评估覆盖率 | 0% | 核心功能 100% |

### 6.3 专家评价对应验收

| 专家问题 | 升级措施 | 验收方式 |
|---------|---------|---------|
| 表单繁琐 | NLU 自然语言提取 | 5 名非法律用户对比测试，满意度 ≥4/5 |
| AI 深度不够 | 多 Agent 协作 + 自主决策 + Memory | 20 份合同对比审查，风险识别 +30% |
| 缺乏微调/评估 | 本地知识库 + 量化评估 | 评估报告含 Recall/Precision/引用正确率 |

---

## 七、项目目录结构（升级后）

```
backend/
├── main.py                     # FastAPI 入口
├── config.py                   # 全局配置
├── database.py                 # MySQL
├── harness/                    # 新增：Agent Harness
│   ├── registry.py             # 工具注册中心
│   ├── permission.py           # 权限控制
│   ├── session.py              # 会话状态管理
│   ├── trace.py                # 执行追踪
│   ├── context.py              # 上下文压缩
│   └── fallback.py             # 降级策略
├── agents/                     # 重构：精简为真正的 Agent
│   ├── base_agent.py           # 基类（继承 Harness）
│   ├── legal_agent.py          # 通用法律 Agent（合并4个咨询Agent）
│   ├── contract_review_agent.py # 合同审查 Agent（Chain→Agent）
│   ├── contract_draft_agent.py  # 合同起草 Agent（Chain→Agent+NLU）
│   ├── contract_compare_agent.py # 合同对比 Agent（Chain→Agent）
│   ├── doc_interpret_agent.py   # 文书解读 Agent（Chain→Agent）
│   ├── proofread_agent.py       # 智能校对 Agent（Chain→Agent）
│   ├── docgen_agent.py          # 文书生成 Agent（Chain→Agent+NLU）
│   ├── planner_agent.py         # 新增：审查规划 Agent
│   ├── executor_agents.py       # 新增：专项审查 Agent
│   └── reviewer_agent.py        # 新增：汇总评审 Agent
├── workflows/                  # 新增：LangGraph 工作流
│   └── contract_review.py       # 合同审查多 Agent 协作流程
├── skills/                     # 新增：Skills 体系
│   ├── legal_consultation/      # 通用法律咨询
│   ├── labor_dispute/           # 劳动纠纷
│   ├── corporate_compliance/    # 企业合规
│   ├── marriage_property/       # 婚姻财产
│   ├── contract_review/         # 合同审查
│   └── contract_draft/          # 合同起草
├── memory/                     # 重构：三层记忆
│   ├── memory_agent.py          # 统一记忆管理
│   ├── working_memory.py        # 工作记忆（上下文压缩）
│   ├── session_memory.py        # 会话记忆（Redis）
│   ├── long_term_memory.py      # 长期记忆（MySQL+向量库）
│   └── memory_utils.py          # 压缩、召回、整合
├── tools/                      # 重构：统一工具层
│   ├── deli_tools.py            # 得理 API 工具集（合并）
│   ├── nlu_tools.py             # 新增：NLU 工具
│   ├── knowledge_tool.py        # 新增：本地知识库检索
│   ├── ocr_extractor.py         # OCR/文件解析
│   └── law_parser.py            # 法律文本解析
├── knowledge/                  # 新增：知识库
│   ├── build_index.py           # 知识库构建脚本
│   ├── data/                    # 法规/范本原始数据
│   └── chroma_db/               # Chroma 向量数据库
├── evals/                      # 新增：评估体系
│   ├── datasets/                # 评估数据集
│   ├── run_eval.py              # 评估脚本
│   └── reports/                 # 评估报告
├── utils/                      # 新增：公共工具
│   └── law_utils.py             # 法律工具函数（去重）
├── routers/                    # 路由（适配新 Agent）
├── models/                     # Pydantic 模型
└── templates/                  # 合同/文书模板
```

---

## 八、每日检查清单

### Day 1 检查
- [ ] `harness/registry.py` 可统一注册工具
- [ ] `harness/trace.py` 可记录执行过程
- [ ] `utils/law_utils.py` 消除所有重复代码
- [ ] `tools/deli_tools.py` 合并完成

### Day 2 检查
- [ ] `legal_agent.py` 替代 4 个咨询 Agent
- [ ] `skills/` 目录 6 个 SKILL.md 就绪
- [ ] 4 个咨询路由适配完成
- [ ] 原有功能回归测试通过

### Day 3 检查
- [ ] `nlu_tools.py` extract_fields 可用
- [ ] 合同起草支持自然语言输入
- [ ] 文书生成支持自然语言输入
- [ ] 前端双模式切换可用

### Day 4 检查
- [ ] 三层记忆架构可运行
- [ ] 服务重启后会话可恢复
- [ ] 长对话自动压缩
- [ ] 新会话可加载用户历史

### Day 5 检查
- [ ] LangGraph 合同审查流程可运行
- [ ] Planner 可根据复杂度生成不同计划
- [ ] 多个 Executor 可并行执行
- [ ] Reviewer 可汇总生成最终报告

### Day 6 检查
- [ ] Chroma 知识库构建完成
- [ ] 混合检索可运行
- [ ] 评估数据集就绪
- [ ] 评估脚本可输出指标报告

### Day 7 检查
- [ ] 全功能端到端测试通过
- [ ] Demo 场景准备完毕
- [ ] 前端交互流畅
- [ ] 性能指标达标

### Day 8 检查
- [ ] README 更新完成
- [ ] Demo 视频录制完成
- [ ] 架构文档完成
- [ ] 项目提交包就绪
