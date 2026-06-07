import os
from typing import Optional, Dict
from dataclasses import dataclass


@dataclass
class Skill:
    skill_id: str
    name: str
    description: str
    trigger_conditions: str
    core_laws: list
    default_keywords: list
    output_format: str
    execution_steps: list
    acceptance_criteria: list
    forbidden_behaviors: list
    system_prompt: str


def load_skill(skill_dir: str) -> Optional[Skill]:
    skill_md_path = os.path.join(skill_dir, "SKILL.md")
    prompt_md_path = os.path.join(skill_dir, "prompt.md")

    if not os.path.exists(skill_md_path):
        return None

    with open(skill_md_path, "r", encoding="utf-8") as f:
        content = f.read()

    system_prompt = ""
    if os.path.exists(prompt_md_path):
        with open(prompt_md_path, "r", encoding="utf-8") as f:
            system_prompt = f.read().strip()

    skill_id = os.path.basename(skill_dir)

    sections = _parse_sections(content)

    return Skill(
        skill_id=skill_id,
        name=sections.get("name", skill_id),
        description=sections.get("description", ""),
        trigger_conditions=sections.get("trigger_conditions", ""),
        core_laws=_parse_list_field(sections.get("core_laws", "")),
        default_keywords=_parse_list_field(sections.get("default_keywords", "")),
        output_format=sections.get("output_format", ""),
        execution_steps=_parse_list_field(sections.get("execution_steps", "")),
        acceptance_criteria=_parse_list_field(sections.get("acceptance_criteria", "")),
        forbidden_behaviors=_parse_list_field(sections.get("forbidden_behaviors", "")),
        system_prompt=system_prompt,
    )


def _parse_sections(content: str) -> Dict[str, str]:
    sections = {}
    current_key = None
    current_lines = []

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_key:
                sections[current_key] = "\n".join(current_lines).strip()
            current_key = line[3:].strip().lower().replace(" ", "_")
            current_lines = []
        else:
            current_lines.append(line)

    if current_key:
        sections[current_key] = "\n".join(current_lines).strip()

    return sections


def _parse_list_field(text: str) -> list:
    if not text:
        return []
    items = []
    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("- "):
            items.append(line[2:].strip())
        elif line and not line.startswith("#"):
            items.append(line)
    return items


SKILLS_DIR = os.path.join(os.path.dirname(__file__))


def load_all_skills() -> Dict[str, Skill]:
    skills = {}
    if not os.path.exists(SKILLS_DIR):
        return skills
    for name in os.listdir(SKILLS_DIR):
        skill_path = os.path.join(SKILLS_DIR, name)
        if os.path.isdir(skill_path):
            skill = load_skill(skill_path)
            if skill:
                skills[skill.skill_id] = skill
    return skills


def get_skill(skill_id: str) -> Optional[Skill]:
    skill_dir = os.path.join(SKILLS_DIR, skill_id)
    if os.path.isdir(skill_dir):
        return load_skill(skill_dir)
    return None
