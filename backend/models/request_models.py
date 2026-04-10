from pydantic import BaseModel
from typing import Optional, List, Dict


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class PasswordResetRequest(BaseModel):
    email: str
    new_password: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: List[ChatMessage] = []


class ContractReviewRequest(BaseModel):
    text: Optional[str] = None


class DocGenRequest(BaseModel):
    doc_type: str
    plaintiff: str
    defendant: str
    fact: str
    demands: Optional[str] = ""


class ContractOutlineRequest(BaseModel):
    template_id: str
    elements: Dict[str, str]


class ContractGenerateRequest(BaseModel):
    template_id: str
    elements: Dict[str, str]
    outline: str
    search_law: Optional[bool] = True


class UserTemplateCreateRequest(BaseModel):
    name: str
    description: str = ""
    category_id: str = ""
    subcategory_id: str = ""
    fields: List[Dict] = []
    outline_sections: List[str] = []
    prompt_template: str = ""
    law_references: List[str] = []


class UserTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[List[Dict]] = None
    outline_sections: Optional[List[str]] = None
    prompt_template: Optional[str] = None
    law_references: Optional[List[str]] = None


class CaseCreateRequest(BaseModel):
    title: str
    case_type: str
    description: Optional[str] = ""
    plaintiff: Optional[str] = ""
    defendant: Optional[str] = ""


class CaseUpdateRequest(BaseModel):
    title: Optional[str] = None
    case_type: Optional[str] = None
    description: Optional[str] = None
    plaintiff: Optional[str] = None
    defendant: Optional[str] = None
    status: Optional[str] = None


class AccountConfigRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    provider: str = "dashscope"
    llm_api_key: str = ""
    model_name: str = ""
    email: Optional[str] = ""
