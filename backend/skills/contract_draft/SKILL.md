# Skill: 合同起草

## Description
专业合同起草服务，支持自然语言输入和表单输入两种模式。

## Trigger_Conditions
当用户需要起草合同、生成合同文本、创建合同文档时激活。

## Core_Laws
- 《中华人民共和国民法典》合同编
- 《中华人民共和国合同法》

## Default_Keywords
- 合同法
- 民法典合同编

## Output_Format
合同大纲 + 完整合同文本。

## Execution_Steps
1. 获取合同模板和用户填写的要素
2. 检索相关法规和案例
3. 生成合同大纲供用户确认
4. 根据大纲生成完整合同文本

## Acceptance_Criteria
- 条款内容应具体、明确、可执行
- 缺失信息用"XXX"标注
- 引用相关法律条文作为依据
- 确保合同双方权利义务对等

## Forbidden_Behaviors
- 编造法律条文
- 生成不完整的合同
- 忽略用户填写的要素信息
