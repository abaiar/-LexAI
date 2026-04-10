from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class UserInfo(BaseModel):
    name: str
    email: str
    plan: str = "专业版"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


class RegisterResponse(BaseModel):
    message: str
    user: UserInfo


class RiskItem(BaseModel):
    level: str
    clause: str
    reason: str
    suggestion: str


class ContractReviewResponse(BaseModel):
    risk_items: List[RiskItem]
    missing_clauses: List[str]
    summary: str
    score: int


class DocGenResponse(BaseModel):
    document_text: str
    template_used: str


class DocQualityCheckResponse(BaseModel):
    quality_check: str
    is_qualified: bool


class TemplateFieldResponse(BaseModel):
    key: str
    label: str
    field_type: str = "text"
    required: bool = True
    placeholder: str = ""
    options: List[str] = []
    default_value: str = ""


class ContractTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category_id: str
    subcategory_id: str
    fields: List[TemplateFieldResponse]
    outline_sections: List[str]
    prompt_template: str
    law_references: List[str]


class TemplateSummaryResponse(BaseModel):
    id: str
    name: str
    description: str
    field_count: int = 0


class SubcategoryResponse(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    template_ids: List[str]
    template_count: int
    templates: List[TemplateSummaryResponse] = []


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    color: str
    subcategories: List[SubcategoryResponse]
    template_count: int


class CategoryListResponse(BaseModel):
    categories: List[CategoryResponse]


class ContractOutlineResponse(BaseModel):
    outline: str
    template_id: str


class ContractGenerateResponse(BaseModel):
    contract_text: str
    template_id: str
    template_name: str


class UserTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category_id: str
    subcategory_id: str
    fields: List[Dict]
    outline_sections: List[str]
    prompt_template: str
    law_references: List[str]
    field_count: int = 0
    is_system: bool = False
    created_at: str = ""
    updated_at: str = ""


class UserTemplateListResponse(BaseModel):
    templates: List[UserTemplateResponse]
    total: int


class CaseInfo(BaseModel):
    id: str
    title: str
    case_type: str
    description: str
    plaintiff: str
    defendant: str
    status: str
    created_at: str
    updated_at: str


class CaseListResponse(BaseModel):
    cases: List[CaseInfo]
    total: int
    page: int
    page_size: int


class CaseDetailResponse(BaseModel):
    id: str
    title: str
    case_type: str
    description: str
    plaintiff: str
    defendant: str
    status: str
    created_at: str
    updated_at: str
    conversations: List[dict] = []
    documents: List[dict] = []


class AccountConfigResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    code: int
    message: str
    detail: str = ""


class DiffItem(BaseModel):
    type: str
    clause_title: str
    original_content: str = ""
    revised_content: str = ""
    change_description: str = ""
    risk_level: str = "low"
    legal_impact: str = ""


class CompareSummary(BaseModel):
    total_changes: int = 0
    added_count: int = 0
    deleted_count: int = 0
    modified_count: int = 0
    overall_risk: str = "low"
    key_changes: List[str] = []
    recommendation: str = ""


class ContractCompareResponse(BaseModel):
    diff_items: List[DiffItem]
    summary: CompareSummary


class CompareHistoryItem(BaseModel):
    id: str
    original_filename: str
    revised_filename: str
    total_changes: int
    overall_risk: str
    created_at: str


class CompareHistoryListResponse(BaseModel):
    records: List[CompareHistoryItem]
    total: int


class CompareHistoryDetailResponse(BaseModel):
    id: str
    original_filename: str
    revised_filename: str
    original_text_preview: str = ""
    revised_text_preview: str = ""
    diff_items: List[DiffItem]
    summary: CompareSummary
    created_at: str


class ProofreadErrorItem(BaseModel):
    id: int
    original_text: str
    error_type: str
    error_description: str
    suggestion: str
    corrected_text: str
    severity: str = "low"
    position_hint: str = ""


class ProofreadSummary(BaseModel):
    total_errors: int = 0
    grammar_count: int = 0
    spelling_count: int = 0
    punctuation_count: int = 0
    fluency_count: int = 0
    wording_count: int = 0
    high_severity_count: int = 0
    medium_severity_count: int = 0
    low_severity_count: int = 0
    overall_quality: str = "good"
    corrected_text: str = ""
    recommendation: str = ""


class ProofreadResponse(BaseModel):
    errors: List[ProofreadErrorItem]
    summary: ProofreadSummary


class ProofreadHistoryItem(BaseModel):
    id: str
    filename: str
    total_errors: int
    overall_quality: str
    created_at: str


class ProofreadHistoryListResponse(BaseModel):
    records: List[ProofreadHistoryItem]
    total: int


class ProofreadHistoryDetailResponse(BaseModel):
    id: str
    filename: str
    text_preview: str = ""
    errors: List[ProofreadErrorItem]
    summary: ProofreadSummary
    created_at: str


class KeyClauseItem(BaseModel):
    clause_title: str
    original_text: str
    interpretation: str
    legal_significance: str = ""
    risk_level: str = "none"


class RightsObligationsItem(BaseModel):
    party: str
    rights: List[str] = []
    obligations: List[str] = []


class RiskWarningItem(BaseModel):
    risk_title: str
    description: str
    severity: str = "low"
    suggestion: str = ""


class KeyDeadlineItem(BaseModel):
    deadline_desc: str
    date_or_period: str = ""
    consequence: str = ""


class LegalTermItem(BaseModel):
    term: str
    definition: str


class DocInterpretResponse(BaseModel):
    summary: str
    document_type: str = "法律文书"
    parties: List[str] = []
    key_clauses: List[KeyClauseItem] = []
    rights_obligations: List[RightsObligationsItem] = []
    risk_warnings: List[RiskWarningItem] = []
    key_deadlines: List[KeyDeadlineItem] = []
    legal_terms: List[LegalTermItem] = []
    action_suggestions: List[str] = []
    overall_assessment: str = ""
    difficulty_level: str = "moderate"
    interpretation_score: int = 70


class InterpretHistoryItem(BaseModel):
    id: str
    filename: str
    document_type: str
    summary: str
    interpretation_score: int
    difficulty_level: str
    created_at: str


class InterpretHistoryListResponse(BaseModel):
    records: List[InterpretHistoryItem]
    total: int


class InterpretHistoryDetailResponse(BaseModel):
    id: str
    filename: str
    text_preview: str = ""
    document_type: str = "法律文书"
    parties: List[str] = []
    key_clauses: List[KeyClauseItem] = []
    rights_obligations: List[RightsObligationsItem] = []
    risk_warnings: List[RiskWarningItem] = []
    key_deadlines: List[KeyDeadlineItem] = []
    legal_terms: List[LegalTermItem] = []
    action_suggestions: List[str] = []
    overall_assessment: str = ""
    difficulty_level: str = "moderate"
    interpretation_score: int = 70
    created_at: str
