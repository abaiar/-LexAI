const API_BASE = 'http://127.0.0.1:8000'

interface LoginParams {
  email: string
  password: string
}

interface RegisterParams {
  name: string
  email: string
  password: string
}

interface UserInfo {
  name: string
  email: string
  plan: string
}

interface LoginResult {
  access_token: string
  token_type: string
  user: UserInfo
}

interface ChatParams {
  message: string
  session_id: string
  history: Array<{ role: string; content: string }>
}

interface DocGenParams {
  doc_type: string
  plaintiff: string
  defendant: string
  fact: string
  demands?: string
}

interface ProviderInfo {
  id: string
  name: string
  base_url: string
  models: string[]
  default_model: string
  key_prefix: string
  key_hint: string
  has_env_key: boolean
}

interface AccountConfigParams {
  provider: string
  llm_api_key: string
  model_name: string
  email?: string
}

interface ContractOutlineParams {
  template_id: string
  elements: Record<string, string>
}

interface ContractGenerateParams {
  template_id: string
  elements: Record<string, string>
  outline: string
  search_law?: boolean
}

interface UserTemplateCreateParams {
  name: string
  description?: string
  category_id?: string
  subcategory_id?: string
  fields?: any[]
  outline_sections?: string[]
  prompt_template?: string
  law_references?: string[]
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const detail = errorData.detail || {}
    throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`)
  }

  return response.json()
}

export const api = {
  async login(params: LoginParams): Promise<LoginResult> {
    return request<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async register(params: RegisterParams): Promise<{ message: string; user: UserInfo }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async resetPassword(email: string, new_password: string): Promise<{ message: string }> {
    return request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, new_password }),
    })
  },

  async getCurrentUser(token: string): Promise<UserInfo> {
    return request<UserInfo>(`/api/auth/me?token=${token}`)
  },

  async sendChatMessage(params: ChatParams): Promise<Response> {
    const token = localStorage.getItem('access_token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return fetch(`${API_BASE}/api/chat/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })
  },

  async sendAgentChatMessage(agentType: string, params: ChatParams): Promise<Response> {
    const token = localStorage.getItem('access_token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const agentPathMap: Record<string, string> = {
      labor: '/api/agent/labor/chat',
      compliance: '/api/agent/compliance/chat',
      marriage: '/api/agent/marriage/chat',
    }
    const path = agentPathMap[agentType] || '/api/chat/send'

    return fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })
  },

  async getProviders(): Promise<{ providers: ProviderInfo[] }> {
    return request('/api/account/providers')
  },

  async checkApikey(): Promise<{ configured: boolean; provider: string }> {
    return request('/api/account/check-apikey')
  },

  async reviewContract(file: File | null, text: string | null): Promise<any> {
    const token = localStorage.getItem('access_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      return fetch(`${API_BASE}/api/contract/review`, {
        method: 'POST',
        headers,
        body: formData,
      }).then(r => r.json())
    } else if (text) {
      const formData = new FormData()
      formData.append('text', text)
      return fetch(`${API_BASE}/api/contract/review`, {
        method: 'POST',
        headers,
        body: formData,
      }).then(r => r.json())
    }
    throw new Error('请提供文件或文本')
  },

  async generateDocument(params: DocGenParams): Promise<{ document_text: string; template_used: string }> {
    return request('/api/docgen/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async checkDocumentQuality(document_text: string): Promise<{ quality_check: string; is_qualified: boolean }> {
    return request('/api/docgen/quality-check', {
      method: 'POST',
      body: JSON.stringify({ document_text }),
    })
  },

  async getContractCategories(): Promise<any> {
    return request('/api/contract-draft/categories')
  },

  async getContractTemplateDetail(templateId: string): Promise<any> {
    return request(`/api/contract-draft/templates/${templateId}`)
  },

  async getContractTemplates(categoryId?: string, subcategoryId?: string): Promise<any> {
    const params = new URLSearchParams()
    if (categoryId) params.append('category_id', categoryId)
    if (subcategoryId) params.append('subcategory_id', subcategoryId)
    const query = params.toString()
    return request(`/api/contract-draft/templates${query ? '?' + query : ''}`)
  },

  async searchContractTemplates(keyword: string, categoryId?: string): Promise<any> {
    const params = new URLSearchParams()
    if (keyword) params.append('keyword', keyword)
    if (categoryId) params.append('category_id', categoryId)
    return request(`/api/contract-draft/search?${params.toString()}`)
  },

  async generateContractOutline(params: ContractOutlineParams): Promise<{ outline: string; template_id: string }> {
    return request('/api/contract-draft/outline', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async generateContractText(params: ContractGenerateParams): Promise<{ contract_text: string; template_id: string; template_name: string }> {
    return request('/api/contract-draft/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async getUserTemplates(keyword?: string, categoryId?: string): Promise<any> {
    const params = new URLSearchParams()
    if (keyword) params.append('keyword', keyword)
    if (categoryId) params.append('category_id', categoryId)
    return request(`/api/contract-draft/user-templates?${params.toString()}`)
  },

  async createUserTemplate(params: UserTemplateCreateParams): Promise<any> {
    return request('/api/contract-draft/user-templates', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async updateUserTemplate(templateId: string, params: any): Promise<any> {
    return request(`/api/contract-draft/user-templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    })
  },

  async deleteUserTemplate(templateId: string): Promise<any> {
    return request(`/api/contract-draft/user-templates/${templateId}`, {
      method: 'DELETE',
    })
  },

  async saveAccountConfig(params: AccountConfigParams): Promise<{ message: string }> {
    return request('/api/account/config', {
      method: 'PUT',
      body: JSON.stringify(params),
    })
  },

  async getAccountConfig(email: string): Promise<{ provider: string; llm_api_key: string; model_name: string }> {
    return request(`/api/account/config?email=${encodeURIComponent(email)}`)
  },

  async validateApiKey(params: AccountConfigParams): Promise<{ valid: boolean; message: string }> {
    return request('/api/account/config/validate', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async getCases(page: number = 1, page_size: number = 10): Promise<any> {
    return request(`/api/cases?page=${page}&page_size=${page_size}`)
  },

  async createCase(data: any): Promise<any> {
    return request('/api/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getCase(caseId: string): Promise<any> {
    return request(`/api/cases/${caseId}`)
  },

  async updateCase(caseId: string, data: any): Promise<any> {
    return request(`/api/cases/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteCase(caseId: string): Promise<any> {
    return request(`/api/cases/${caseId}`, {
      method: 'DELETE',
    })
  },

  async getDocCategories(): Promise<any> {
    return request('/api/docgen-v2/categories')
  },

  async getDocTemplateDetail(templateId: string): Promise<any> {
    return request(`/api/docgen-v2/templates/${templateId}`)
  },

  async searchDocTemplates(keyword: string, categoryId?: string): Promise<any> {
    const params = new URLSearchParams()
    if (keyword) params.append('keyword', keyword)
    if (categoryId) params.append('category_id', categoryId)
    return request(`/api/docgen-v2/search?${params.toString()}`)
  },

  async generateDocOutline(params: { template_id: string; elements: Record<string, string> }): Promise<{ outline: string; template_id: string }> {
    return request('/api/docgen-v2/outline', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async generateDocText(params: { template_id: string; elements: Record<string, string>; outline: string }): Promise<{ document_text: string; template_id: string; template_name: string }> {
    return request('/api/docgen-v2/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async checkDocQuality(documentText: string): Promise<{ quality_check: string; is_qualified: boolean }> {
    return request('/api/docgen-v2/quality-check', {
      method: 'POST',
      body: JSON.stringify({ document_text: documentText }),
    })
  },

  async compareContracts(originalFile: File, revisedFile: File): Promise<any> {
    const token = localStorage.getItem('access_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const formData = new FormData()
    formData.append('original_file', originalFile)
    formData.append('revised_file', revisedFile)

    const response = await fetch(`${API_BASE}/api/contract-compare/compare`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData.detail || {}
      throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`)
    }

    return response.json()
  },

  async getCompareHistory(): Promise<{ records: any[]; total: number }> {
    return request('/api/contract-compare/history')
  },

  async getCompareDetail(recordId: string): Promise<any> {
    return request(`/api/contract-compare/history/${recordId}`)
  },

  async deleteCompareRecord(recordId: string): Promise<{ message: string }> {
    return request(`/api/contract-compare/history/${recordId}`, {
      method: 'DELETE',
    })
  },

  async proofreadDocument(file: File): Promise<any> {
    const token = localStorage.getItem('access_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/api/proofread/check`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData.detail || {}
      throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`)
    }

    return response.json()
  },

  async proofreadTextDirect(text: string): Promise<any> {
    const token = localStorage.getItem('access_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const formData = new FormData()
    formData.append('text', text)

    const response = await fetch(`${API_BASE}/api/proofread/check-text`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData.detail || {}
      throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`)
    }

    return response.json()
  },

  async getProofreadHistory(): Promise<{ records: any[]; total: number }> {
    return request('/api/proofread/history')
  },

  async getProofreadDetail(recordId: string): Promise<any> {
    return request(`/api/proofread/history/${recordId}`)
  },

  async deleteProofreadRecord(recordId: string): Promise<{ message: string }> {
    return request(`/api/proofread/history/${recordId}`, {
      method: 'DELETE',
    })
  },

  async interpretDocument(file: File | null, text: string | null): Promise<any> {
    const token = localStorage.getItem('access_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${API_BASE}/api/doc-interpret/interpret`, {
        method: 'POST',
        headers,
        body: formData,
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const detail = errorData.detail || {}
        throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`)
      }
      return response.json()
    } else if (text) {
      const formData = new FormData()
      formData.append('text', text)
      const response = await fetch(`${API_BASE}/api/doc-interpret/interpret`, {
        method: 'POST',
        headers,
        body: formData,
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const detail = errorData.detail || {}
        throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`)
      }
      return response.json()
    }
    throw new Error('请提供文件或文本')
  },

  async interpretTextDirect(text: string): Promise<any> {
    const token = localStorage.getItem('access_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const formData = new FormData()
    formData.append('text', text)

    const response = await fetch(`${API_BASE}/api/doc-interpret/interpret`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail = errorData.detail || {}
      throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`)
    }

    return response.json()
  },

  async getInterpretHistory(): Promise<{ records: any[]; total: number }> {
    return request('/api/doc-interpret/history')
  },

  async getInterpretDetail(recordId: string): Promise<any> {
    return request(`/api/doc-interpret/history/${recordId}`)
  },

  async deleteInterpretRecord(recordId: string): Promise<{ message: string }> {
    return request(`/api/doc-interpret/history/${recordId}`, {
      method: 'DELETE',
    })
  },
}
