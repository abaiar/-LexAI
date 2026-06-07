# Skill: 合同审查

## Description
专业合同审查服务，识别风险条款、缺失条款，提供修改建议。

## Trigger_Conditions
当用户需要审查合同、检查合同风险、评估合同条款时激活。

## Core_Laws
- 《中华人民共和国民法典》合同编
- 《中华人民共和国合同法》

## Default_Keywords
- 合同法
- 民法典合同编

## Output_Format
JSON格式，包含risk_items、missing_clauses、summary、score字段。

## Execution_Steps
1. 逐条扫描合同文本，识别霸王条款、模糊表述、违法条款、漏洞条款
2. 检测是否缺失必要条款（保密、违约金、争议解决等）
3. 为每个风险条款给出具体修改建议，引用相关法律条文
4. 给出总体评分

## Acceptance_Criteria
- 每个风险项必须包含level、clause、reason、suggestion
- 必须引用相关法律条文作为依据
- 评分需合理反映合同整体风险水平

## Forbidden_Behaviors
- 编造法律条文
- 遗漏重大风险条款
- 给出无依据的评分
