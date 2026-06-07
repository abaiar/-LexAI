import json
import asyncio
import os
import re
from typing import List, Dict
from datetime import datetime


EVALS_DIR = os.path.dirname(__file__)
DATASETS_DIR = os.path.join(EVALS_DIR, "datasets")
REPORTS_DIR = os.path.join(EVALS_DIR, "reports")


async def eval_legal_queries() -> Dict:
    dataset_path = os.path.join(DATASETS_DIR, "legal_queries.json")
    if not os.path.exists(dataset_path):
        return {"error": "评估数据集不存在"}

    with open(dataset_path, "r", encoding="utf-8") as f:
        queries = json.load(f)

    results = []
    for q in queries:
        result = {
            "id": q["id"],
            "query": q["query"],
            "domain": q["domain"],
            "expected_laws": q["expected_laws"],
            "retrieved_laws": [],
            "law_recall": 0.0,
            "has_citation": False,
            "error": None,
        }

        try:
            from tools.deli_law_tool import search_law
            law_result = await search_law.ainvoke({"keyword": q["query"]})
            if law_result and "不可用" not in law_result:
                result["retrieved_laws"] = _extract_law_names(law_result)
                result["has_citation"] = True

                expected = set(q["expected_laws"])
                retrieved = set(result["retrieved_laws"])
                if expected:
                    matched = sum(1 for e in expected if any(e in r for r in retrieved))
                    result["law_recall"] = matched / len(expected)
        except Exception as e:
            result["error"] = str(e)

        results.append(result)

    total = len(results)
    avg_recall = sum(r["law_recall"] for r in results) / total if total else 0
    citation_rate = sum(1 for r in results if r["has_citation"]) / total if total else 0

    report = {
        "eval_type": "legal_queries",
        "timestamp": datetime.now().isoformat(),
        "total_queries": total,
        "metrics": {
            "avg_law_recall": round(avg_recall, 3),
            "citation_rate": round(citation_rate, 3),
        },
        "results": results,
    }

    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    return report


def _extract_law_names(search_result: str) -> List[str]:
    pattern = r'\d+\.\s+(.+?)(?:\n|$)'
    matches = re.findall(pattern, search_result)
    return [m.strip() for m in matches]


async def run_all_evals() -> Dict:
    reports = {}
    reports["legal_queries"] = await eval_legal_queries()
    return reports


if __name__ == "__main__":
    report = asyncio.run(run_all_evals())
    print(json.dumps(report, ensure_ascii=False, indent=2))
