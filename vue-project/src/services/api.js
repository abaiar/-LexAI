const API_BASE = '';
async function request(path, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail || {};
        throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`);
    }
    return response.json();
}
export const api = {
    async login(params) {
        return request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async register(params) {
        return request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async resetPassword(email, new_password) {
        return request('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, new_password }),
        });
    },
    async getCurrentUser(token) {
        return request(`/api/auth/me?token=${token}`);
    },
    async sendChatMessage(params) {
        const token = localStorage.getItem('access_token');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return fetch(`${API_BASE}/api/chat/send`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
        });
    },
    async sendAgentChatMessage(agentType, params) {
        const token = localStorage.getItem('access_token');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const agentPathMap = {
            labor: '/api/agent/labor/chat',
            compliance: '/api/agent/compliance/chat',
            marriage: '/api/agent/marriage/chat',
        };
        const path = agentPathMap[agentType] || '/api/chat/send';
        return fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
        });
    },
    async getProviders() {
        return request('/api/account/providers');
    },
    async checkApikey() {
        return request('/api/account/check-apikey');
    },
    async reviewContract(file, text) {
        const token = localStorage.getItem('access_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            return fetch(`${API_BASE}/api/contract/review`, {
                method: 'POST',
                headers,
                body: formData,
            }).then(r => r.json());
        }
        else if (text) {
            const formData = new FormData();
            formData.append('text', text);
            return fetch(`${API_BASE}/api/contract/review`, {
                method: 'POST',
                headers,
                body: formData,
            }).then(r => r.json());
        }
        throw new Error('请提供文件或文本');
    },
    async generateDocument(params) {
        return request('/api/docgen/generate', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async checkDocumentQuality(document_text) {
        return request('/api/docgen/quality-check', {
            method: 'POST',
            body: JSON.stringify({ document_text }),
        });
    },
    async getContractCategories() {
        return request('/api/contract-draft/categories');
    },
    async getContractTemplateDetail(templateId) {
        return request(`/api/contract-draft/templates/${templateId}`);
    },
    async getContractTemplates(categoryId, subcategoryId) {
        const params = new URLSearchParams();
        if (categoryId)
            params.append('category_id', categoryId);
        if (subcategoryId)
            params.append('subcategory_id', subcategoryId);
        const query = params.toString();
        return request(`/api/contract-draft/templates${query ? '?' + query : ''}`);
    },
    async searchContractTemplates(keyword, categoryId) {
        const params = new URLSearchParams();
        if (keyword)
            params.append('keyword', keyword);
        if (categoryId)
            params.append('category_id', categoryId);
        return request(`/api/contract-draft/search?${params.toString()}`);
    },
    async generateContractOutline(params) {
        return request('/api/contract-draft/outline', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async generateContractText(params) {
        return request('/api/contract-draft/generate', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async getUserTemplates(keyword, categoryId) {
        const params = new URLSearchParams();
        if (keyword)
            params.append('keyword', keyword);
        if (categoryId)
            params.append('category_id', categoryId);
        return request(`/api/contract-draft/user-templates?${params.toString()}`);
    },
    async createUserTemplate(params) {
        return request('/api/contract-draft/user-templates', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async updateUserTemplate(templateId, params) {
        return request(`/api/contract-draft/user-templates/${templateId}`, {
            method: 'PUT',
            body: JSON.stringify(params),
        });
    },
    async deleteUserTemplate(templateId) {
        return request(`/api/contract-draft/user-templates/${templateId}`, {
            method: 'DELETE',
        });
    },
    async saveAccountConfig(params) {
        return request('/api/account/config', {
            method: 'PUT',
            body: JSON.stringify(params),
        });
    },
    async getAccountConfig(email) {
        return request(`/api/account/config?email=${encodeURIComponent(email)}`);
    },
    async validateApiKey(params) {
        return request('/api/account/config/validate', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async getCases(page = 1, page_size = 10) {
        return request(`/api/cases?page=${page}&page_size=${page_size}`);
    },
    async createCase(data) {
        return request('/api/cases', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    async getCase(caseId) {
        return request(`/api/cases/${caseId}`);
    },
    async updateCase(caseId, data) {
        return request(`/api/cases/${caseId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    async deleteCase(caseId) {
        return request(`/api/cases/${caseId}`, {
            method: 'DELETE',
        });
    },
    async getDocCategories() {
        return request('/api/docgen-v2/categories');
    },
    async getDocTemplateDetail(templateId) {
        return request(`/api/docgen-v2/templates/${templateId}`);
    },
    async searchDocTemplates(keyword, categoryId) {
        const params = new URLSearchParams();
        if (keyword)
            params.append('keyword', keyword);
        if (categoryId)
            params.append('category_id', categoryId);
        return request(`/api/docgen-v2/search?${params.toString()}`);
    },
    async generateDocOutline(params) {
        return request('/api/docgen-v2/outline', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async generateDocText(params) {
        return request('/api/docgen-v2/generate', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },
    async checkDocQuality(documentText) {
        return request('/api/docgen-v2/quality-check', {
            method: 'POST',
            body: JSON.stringify({ document_text: documentText }),
        });
    },
    async compareContracts(originalFile, revisedFile) {
        const token = localStorage.getItem('access_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const formData = new FormData();
        formData.append('original_file', originalFile);
        formData.append('revised_file', revisedFile);
        const response = await fetch(`${API_BASE}/api/contract-compare/compare`, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const detail = errorData.detail || {};
            throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`);
        }
        return response.json();
    },
    async getCompareHistory() {
        return request('/api/contract-compare/history');
    },
    async getCompareDetail(recordId) {
        return request(`/api/contract-compare/history/${recordId}`);
    },
    async deleteCompareRecord(recordId) {
        return request(`/api/contract-compare/history/${recordId}`, {
            method: 'DELETE',
        });
    },
    async proofreadDocument(file) {
        const token = localStorage.getItem('access_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_BASE}/api/proofread/check`, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const detail = errorData.detail || {};
            throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`);
        }
        return response.json();
    },
    async proofreadTextDirect(text) {
        const token = localStorage.getItem('access_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const formData = new FormData();
        formData.append('text', text);
        const response = await fetch(`${API_BASE}/api/proofread/check-text`, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const detail = errorData.detail || {};
            throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`);
        }
        return response.json();
    },
    async getProofreadHistory() {
        return request('/api/proofread/history');
    },
    async getProofreadDetail(recordId) {
        return request(`/api/proofread/history/${recordId}`);
    },
    async deleteProofreadRecord(recordId) {
        return request(`/api/proofread/history/${recordId}`, {
            method: 'DELETE',
        });
    },
    async interpretDocument(file, text) {
        const token = localStorage.getItem('access_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_BASE}/api/doc-interpret/interpret`, {
                method: 'POST',
                headers,
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const detail = errorData.detail || {};
                throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`);
            }
            return response.json();
        }
        else if (text) {
            const formData = new FormData();
            formData.append('text', text);
            const response = await fetch(`${API_BASE}/api/doc-interpret/interpret`, {
                method: 'POST',
                headers,
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const detail = errorData.detail || {};
                throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`);
            }
            return response.json();
        }
        throw new Error('请提供文件或文本');
    },
    async interpretTextDirect(text) {
        const token = localStorage.getItem('access_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const formData = new FormData();
        formData.append('text', text);
        const response = await fetch(`${API_BASE}/api/doc-interpret/interpret`, {
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const detail = errorData.detail || {};
            throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`);
        }
        return response.json();
    },
    async getInterpretHistory() {
        return request('/api/doc-interpret/history');
    },
    async getInterpretDetail(recordId) {
        return request(`/api/doc-interpret/history/${recordId}`);
    },
    async deleteInterpretRecord(recordId) {
        return request(`/api/doc-interpret/history/${recordId}`, {
            method: 'DELETE',
        });
    },
};
