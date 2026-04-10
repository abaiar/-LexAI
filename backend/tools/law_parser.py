import re
from typing import List, Dict


def parse_law_references(text: str) -> List[str]:
    pattern = r'《([^》]+)》'
    matches = re.findall(pattern, text)
    return list(set(matches))


def extract_article_numbers(text: str) -> List[str]:
    pattern = r'第[一二三四五六七八九十百千万零\d]+条'
    matches = re.findall(pattern, text)
    return list(set(matches))


def format_legal_analysis(law_refs: List[str], cases: str, analysis: str) -> str:
    sections = []
    if law_refs:
        sections.append(f"【适用法规】\n" + "\n".join(f"- 《{ref}》" for ref in law_refs))
    if cases and cases != "未找到相关案例。":
        sections.append(f"【相似类案】\n{cases}")
    sections.append(f"【法律建议】\n{analysis}")
    return "\n\n".join(sections)


def clean_contract_text(raw_text: str) -> str:
    text = re.sub(r'\s+', ' ', raw_text)
    text = re.sub(r'[^\S\n]+', ' ', text)
    return text.strip()


def split_contract_clauses(text: str) -> List[Dict]:
    clause_pattern = r'(第[一二三四五六七八九十百千万零\d]+[条款项节][\s\S]*?)(?=第[一二三四五六七八九十百千万零\d]+[条款项节]|$)'
    matches = re.findall(clause_pattern, text)
    if not matches:
        sentences = re.split(r'[。；\n]', text)
        clauses = []
        current = ""
        for s in sentences:
            s = s.strip()
            if not s:
                continue
            current += s + "。"
            if len(current) > 20:
                clauses.append({"text": current.strip(), "index": len(clauses) + 1})
                current = ""
        if current.strip():
            clauses.append({"text": current.strip(), "index": len(clauses) + 1})
        return clauses
    return [{"text": m.strip(), "index": i + 1} for i, m in enumerate(matches)]
