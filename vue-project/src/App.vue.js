import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { useAuthStore } from './stores/auth';
import { api } from './services/api';
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
const authStore = useAuthStore();
const isLogin = ref(true);
const currentView = ref('dashboard');
const authEmail = ref('');
const authPassword = ref('');
const registerName = ref('');
const authError = ref('');
const isAuthLoading = ref(false);
const sidebarCollapsed = ref(false);
const apiKeyConfigured = ref(true);
const isDarkMode = ref(localStorage.getItem('darkMode') === 'true');
function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
    localStorage.setItem('darkMode', String(isDarkMode.value));
}
if (isDarkMode.value) {
    document.documentElement.classList.add('dark-mode-preload');
}
const toastMessage = ref('');
const toastType = ref('info');
let toastTimer = null;
function showToast(msg, type = 'info') {
    toastMessage.value = msg;
    toastType.value = type;
    if (toastTimer)
        clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastMessage.value = ''; }, 3000);
}
const navItems = [
    { id: 'dashboard', label: '工作台', icon: 'ph ph-house' },
    { id: 'chat', label: '法律咨询', icon: 'ph ph-chat-circle' },
    { id: 'doc-interpret', label: '文书解读', icon: 'ph ph-book-open-text' },
    { id: 'contract', label: '合同审查', icon: 'ph ph-shield-check' },
    { id: 'contract-compare', label: '合同对比', icon: 'ph ph-git-diff' },
    { id: 'contract-draft', label: '合同起草', icon: 'ph ph-note-pencil' },
    { id: 'proofread', label: '智能校对', icon: 'ph ph-text-aa' },
    { id: 'docgen', label: '文书生成', icon: 'ph ph-file-text' },
    { id: 'cases', label: '案件管理', icon: 'ph ph-briefcase' },
    { id: 'account', label: '账户设置', icon: 'ph ph-gear' },
];
const currentNavLabel = computed(() => {
    if (currentView.value === 'vertical-agent')
        return verticalAgentTitle.value;
    if (currentView.value === 'contract-draft')
        return '合同智能起草';
    if (currentView.value === 'contract-compare')
        return '合同版本对比';
    if (currentView.value === 'proofread')
        return 'AI智能校对';
    if (currentView.value === 'docgen')
        return '法律文书生成';
    if (currentView.value === 'doc-interpret')
        return '法律文书智能解读';
    const item = navItems.find(i => i.id === currentView.value);
    return item ? item.label : '功能';
});
const dashboardFeatures = [
    { id: 'chat', title: '全能法律咨询', desc: 'RAG法条检索 + 得理案例库', icon: 'ph ph-chat-circle', color: 'bg-blue-500' },
    { id: 'doc-interpret', title: '法律文书解读', desc: '复杂条款，一键读懂', icon: 'ph ph-book-open-text', color: 'bg-amber-500' },
    { id: 'contract', title: '智能合同审查', desc: '风险识别与条款补全', icon: 'ph ph-shield-check', color: 'bg-indigo-500' },
    { id: 'contract-compare', title: '合同版本对比', desc: '智能差异识别与报告', icon: 'ph ph-git-diff', color: 'bg-violet-500' },
    { id: 'contract-draft', title: '合同智能起草', desc: '45+模板覆盖全场景', icon: 'ph ph-note-pencil', color: 'bg-teal-500' },
    { id: 'proofread', title: 'AI智能校对', desc: '语法拼写标点一键修正', icon: 'ph ph-text-aa', color: 'bg-emerald-500' },
    { id: 'docgen', title: '法律文书生成', desc: '40+模板覆盖诉讼仲裁等', icon: 'ph ph-file-text', color: 'bg-red-500' },
    { id: 'cases', title: '案件档案管理', desc: '咨询与文书统一追踪', icon: 'ph ph-briefcase', color: 'bg-slate-600' },
];
const verticalScenarios = [
    { id: 'labor', title: '劳动纠纷维权', icon: 'ph ph-users', tags: ['工资拖欠', '违法辞退', '工伤赔偿'] },
    { id: 'compliance', title: '企业合规检查', icon: 'ph ph-buildings', tags: ['劳动合规', '数据安全', '反垄断'] },
    { id: 'marriage', title: '婚姻与财产分割', icon: 'ph ph-gavel', tags: ['财产计算', '协议生成', '抚养权'] },
];
function renderMarkdown(text) {
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/【(.*?)】/g, '<span style="color:#2563eb;font-weight:600">【$1】</span>')
        .replace(/\n/g, '<br/>');
}
// Chat
const chatMessages = ref([{ role: 'assistant', content: '您好！我是小理智法 AI 助手，可以为您解答法律问题、检索案例和法规。请描述您的法律问题。' }]);
const chatInput = ref('');
const isChatTyping = ref(false);
const chatContainer = ref(null);
const currentSessionId = ref(generateUUID());
const agentStatusText = ref('');
const scrollToBottom = (el) => { nextTick(() => { if (el)
    el.scrollTop = el.scrollHeight; }); };
async function handleChatSend() {
    if (!chatInput.value.trim() || isChatTyping.value)
        return;
    const userMsg = chatInput.value;
    chatMessages.value.push({ role: 'user', content: userMsg });
    chatInput.value = '';
    isChatTyping.value = true;
    agentStatusText.value = '意图识别中...';
    scrollToBottom(chatContainer.value);
    try {
        const history = chatMessages.value.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }));
        const response = await api.sendChatMessage({ message: userMsg, session_id: currentSessionId.value, history: history.slice(-10) });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!line.startsWith('data: '))
                    continue;
                const data = line.slice(6).trim();
                if (!data)
                    continue;
                try {
                    const event = JSON.parse(data);
                    if (event.type === 'agent_step') {
                        agentStatusText.value = event.content;
                    }
                    else if (event.type === 'token') {
                        if (!assistantContent)
                            chatMessages.value.push({ role: 'assistant', content: '' });
                        assistantContent += event.content;
                        const lastMsg = chatMessages.value[chatMessages.value.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant')
                            lastMsg.content = assistantContent;
                        scrollToBottom(chatContainer.value);
                    }
                    else if (event.type === 'error') {
                        showToast(event.content, 'error');
                    }
                }
                catch (e) { /* skip */ }
            }
        }
    }
    catch (e) {
        showToast(`连接失败: ${e.message}`, 'error');
    }
    finally {
        isChatTyping.value = false;
        agentStatusText.value = '';
        scrollToBottom(chatContainer.value);
    }
}
// Vertical Agent
const verticalAgentType = ref('');
const verticalAgentTitle = ref('');
const verticalChatMessages = ref([]);
const verticalChatInput = ref('');
const isVerticalTyping = ref(false);
const verticalChatContainer = ref(null);
const verticalSessionId = ref('');
const verticalAgentStatusText = ref('');
function openVerticalAgent(agentId) {
    verticalAgentType.value = agentId;
    verticalSessionId.value = generateUUID();
    const titleMap = { labor: '劳动纠纷维权 Agent', compliance: '企业合规检查 Agent', marriage: '婚姻与财产分割 Agent' };
    verticalAgentTitle.value = titleMap[agentId] || '专项 Agent';
    const greetingMap = {
        labor: '您好！我是劳动纠纷维权助手，专注工资拖欠、违法辞退、工伤赔偿等。请描述您的情况。',
        compliance: '您好！我是企业合规检查助手，专注劳动合规、数据安全、反垄断等。请描述您的需求。',
        marriage: '您好！我是婚姻与财产分割助手，专注离婚、财产分割、子女抚养等。请描述您的情况。',
    };
    verticalChatMessages.value = [{ role: 'assistant', content: greetingMap[agentId] || '您好！请描述您的法律问题。' }];
    currentView.value = 'vertical-agent';
}
async function handleVerticalChatSend() {
    if (!verticalChatInput.value.trim() || isVerticalTyping.value)
        return;
    const userMsg = verticalChatInput.value;
    verticalChatMessages.value.push({ role: 'user', content: userMsg });
    verticalChatInput.value = '';
    isVerticalTyping.value = true;
    verticalAgentStatusText.value = '分析中...';
    scrollToBottom(verticalChatContainer.value);
    try {
        const history = verticalChatMessages.value.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }));
        const response = await api.sendAgentChatMessage(verticalAgentType.value, { message: userMsg, session_id: verticalSessionId.value, history: history.slice(-10) });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!line.startsWith('data: '))
                    continue;
                const data = line.slice(6).trim();
                if (!data)
                    continue;
                try {
                    const event = JSON.parse(data);
                    if (event.type === 'agent_step') {
                        verticalAgentStatusText.value = event.content;
                    }
                    else if (event.type === 'token') {
                        if (!assistantContent)
                            verticalChatMessages.value.push({ role: 'assistant', content: '' });
                        assistantContent += event.content;
                        const lastMsg = verticalChatMessages.value[verticalChatMessages.value.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant')
                            lastMsg.content = assistantContent;
                        scrollToBottom(verticalChatContainer.value);
                    }
                    else if (event.type === 'error') {
                        showToast(event.content, 'error');
                    }
                }
                catch (e) { /* skip */ }
            }
        }
    }
    catch (e) {
        showToast(`连接失败: ${e.message}`, 'error');
    }
    finally {
        isVerticalTyping.value = false;
        verticalAgentStatusText.value = '';
        scrollToBottom(verticalChatContainer.value);
    }
}
// Contract Review
const contractStep = ref(1);
const contractText = ref('');
const contractFileInput = ref(null);
const contractResult = ref(null);
const contractProgress = ref('正在提取关键条款...');
function handleContractFileSelect(event) { const file = event.target.files?.[0]; if (file)
    submitContractReview(file, null); }
function handleContractDrop(event) { const file = event.dataTransfer?.files?.[0]; if (file)
    submitContractReview(file, null); }
function handleContractTextSubmit() { if (contractText.value.trim())
    submitContractReview(null, contractText.value.trim()); }
async function submitContractReview(file, text) {
    contractStep.value = 2;
    contractProgress.value = '正在提取关键条款...';
    const t = setInterval(() => { if (contractProgress.value.includes('提取'))
        contractProgress.value = '合规性验证中...';
    else if (contractProgress.value.includes('合规'))
        contractProgress.value = '检测缺失条款中...'; }, 1500);
    try {
        contractResult.value = await api.reviewContract(file, text);
        contractStep.value = 3;
    }
    catch (e) {
        contractResult.value = { risk_items: [{ level: 'high', clause: '审查失败', reason: e.message, suggestion: '请重试' }], missing_clauses: [], summary: `审查失败: ${e.message}`, score: 0 };
        contractStep.value = 3;
    }
    finally {
        clearInterval(t);
    }
}
// Contract Compare - 合同版本对比
const compareStep = ref(1);
const compareOriginalFile = ref(null);
const compareRevisedFile = ref(null);
const compareOriginalInput = ref(null);
const compareRevisedInput = ref(null);
const isComparing = ref(false);
const compareProgress = ref('');
const compareResult = ref(null);
const compareHistory = ref([]);
const isLoadingCompareHistory = ref(false);
function handleCompareOriginalSelect(event) {
    const file = event.target.files?.[0];
    if (file) {
        const err = validateCompareFile(file);
        if (err) {
            showToast(err, 'error');
            return;
        }
        compareOriginalFile.value = file;
    }
}
function handleCompareOriginalDrop(event) {
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        const err = validateCompareFile(file);
        if (err) {
            showToast(err, 'error');
            return;
        }
        compareOriginalFile.value = file;
    }
}
function handleCompareRevisedSelect(event) {
    const file = event.target.files?.[0];
    if (file) {
        const err = validateCompareFile(file);
        if (err) {
            showToast(err, 'error');
            return;
        }
        compareRevisedFile.value = file;
    }
}
function handleCompareRevisedDrop(event) {
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        const err = validateCompareFile(file);
        if (err) {
            showToast(err, 'error');
            return;
        }
        compareRevisedFile.value = file;
    }
}
function validateCompareFile(file) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.docx', '.txt'].includes(ext))
        return '不支持的文件格式，请上传 .docx .pdf .txt 文件';
    if (file.size > 10 * 1024 * 1024)
        return '文件大小超过10MB限制';
    return null;
}
async function startCompare() {
    if (!compareOriginalFile.value || !compareRevisedFile.value)
        return;
    isComparing.value = true;
    compareStep.value = 2;
    compareProgress.value = '正在提取原始合同内容...';
    const t = setInterval(() => {
        if (compareProgress.value.includes('原始'))
            compareProgress.value = '正在提取修订版合同内容...';
        else if (compareProgress.value.includes('修订'))
            compareProgress.value = '正在分析条款差异...';
        else if (compareProgress.value.includes('差异'))
            compareProgress.value = '正在生成对比报告...';
    }, 2000);
    try {
        compareResult.value = await api.compareContracts(compareOriginalFile.value, compareRevisedFile.value);
        compareStep.value = 3;
    }
    catch (e) {
        showToast('对比失败: ' + e.message, 'error');
        compareStep.value = 1;
    }
    finally {
        isComparing.value = false;
        clearInterval(t);
    }
}
async function loadCompareHistory() {
    isLoadingCompareHistory.value = true;
    compareStep.value = 4;
    try {
        const res = await api.getCompareHistory();
        compareHistory.value = res.records || [];
    }
    catch (e) {
        compareHistory.value = [];
    }
    finally {
        isLoadingCompareHistory.value = false;
    }
}
async function viewCompareDetail(recordId) {
    try {
        const detail = await api.getCompareDetail(recordId);
        compareResult.value = { diff_items: detail.diff_items, summary: detail.summary };
        compareStep.value = 3;
    }
    catch (e) {
        showToast('加载详情失败: ' + e.message, 'error');
    }
}
async function deleteCompareRecord(recordId) {
    try {
        await api.deleteCompareRecord(recordId);
        compareHistory.value = compareHistory.value.filter(r => r.id !== recordId);
        showToast('删除成功', 'success');
    }
    catch (e) {
        showToast('删除失败: ' + e.message, 'error');
    }
}
function exportCompareReport() {
    if (!compareResult.value)
        return;
    const summary = compareResult.value.summary || {};
    const diffItems = compareResult.value.diff_items || [];
    let report = '合同版本对比报告\n';
    report += '='.repeat(50) + '\n\n';
    report += `总变更数: ${summary.total_changes || 0}\n`;
    report += `新增条款: ${summary.added_count || 0}\n`;
    report += `删除条款: ${summary.deleted_count || 0}\n`;
    report += `修改条款: ${summary.modified_count || 0}\n`;
    report += `整体风险: ${summary.overall_risk === 'high' ? '高风险' : summary.overall_risk === 'medium' ? '中风险' : '低风险'}\n\n`;
    if (summary.recommendation)
        report += `审查建议: ${summary.recommendation}\n\n`;
    report += '-'.repeat(50) + '\n详细差异\n' + '-'.repeat(50) + '\n\n';
    diffItems.forEach((diff, idx) => {
        const typeLabel = diff.type === 'added' ? '新增' : diff.type === 'deleted' ? '删除' : '修改';
        const riskLabel = diff.risk_level === 'high' ? '高风险' : diff.risk_level === 'medium' ? '中风险' : '低风险';
        report += `${idx + 1}. [${typeLabel}] ${diff.clause_title} (${riskLabel})\n`;
        report += `   变更描述: ${diff.change_description}\n`;
        if (diff.original_content)
            report += `   原始内容: ${diff.original_content}\n`;
        if (diff.revised_content)
            report += `   修订内容: ${diff.revised_content}\n`;
        if (diff.legal_impact)
            report += `   法律影响: ${diff.legal_impact}\n`;
        report += '\n';
    });
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `合同对比报告_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('报告已导出', 'success');
}
// AI Proofread - 智能校对
const proofreadStep = ref(1);
const proofreadInputMode = ref('file');
const proofreadFile = ref(null);
const proofreadFileInput = ref(null);
const proofreadTextInput = ref('');
const isProofreading = ref(false);
const proofreadProgress = ref('');
const proofreadResult = ref(null);
const proofreadHistory = ref([]);
const isLoadingProofreadHistory = ref(false);
const proofreadCorrectedText = ref('');
const isProofreadDisabled = computed(() => {
    if (isProofreading.value)
        return true;
    if (proofreadInputMode.value === 'file')
        return !proofreadFile.value;
    return !proofreadTextInput.value || proofreadTextInput.value.trim().length < 10;
});
function qualityLabel(quality) {
    const map = {
        excellent: { text: '优秀', cls: 'text-green-600' },
        good: { text: '良好', cls: 'text-blue-600' },
        fair: { text: '一般', cls: 'text-amber-600' },
        poor: { text: '较差', cls: 'text-red-600' },
    };
    return map[quality] || map.good;
}
function errorTypeStyle(type) {
    const map = {
        grammar: { label: '语法', cls: 'bg-red-100 text-red-700' },
        spelling: { label: '拼写', cls: 'bg-orange-100 text-orange-700' },
        punctuation: { label: '标点', cls: 'bg-amber-100 text-amber-700' },
        fluency: { label: '通顺', cls: 'bg-blue-100 text-blue-700' },
        wording: { label: '用词', cls: 'bg-purple-100 text-purple-700' },
    };
    return map[type] || { label: type, cls: 'bg-slate-100 text-slate-700' };
}
function handleProofreadSelect(event) {
    const file = event.target.files?.[0];
    if (file) {
        const err = validateProofreadFile(file);
        if (err) {
            showToast(err, 'error');
            return;
        }
        proofreadFile.value = file;
    }
}
function handleProofreadDrop(event) {
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        const err = validateProofreadFile(file);
        if (err) {
            showToast(err, 'error');
            return;
        }
        proofreadFile.value = file;
    }
}
function validateProofreadFile(file) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.docx', '.txt'].includes(ext))
        return '不支持的文件格式，请上传 .docx .pdf .txt 文件';
    if (file.size > 10 * 1024 * 1024)
        return '文件大小超过10MB限制';
    return null;
}
async function startProofread() {
    isProofreading.value = true;
    proofreadStep.value = 2;
    proofreadProgress.value = '正在提取文档内容...';
    const t = setInterval(() => {
        if (proofreadProgress.value.includes('提取'))
            proofreadProgress.value = '正在分析语法和拼写...';
        else if (proofreadProgress.value.includes('语法'))
            proofreadProgress.value = '正在检查标点和用词...';
        else if (proofreadProgress.value.includes('标点'))
            proofreadProgress.value = '正在生成校对报告...';
    }, 2000);
    try {
        if (proofreadInputMode.value === 'file' && proofreadFile.value) {
            proofreadResult.value = await api.proofreadDocument(proofreadFile.value);
        }
        else if (proofreadInputMode.value === 'text' && proofreadTextInput.value) {
            proofreadResult.value = await api.proofreadTextDirect(proofreadTextInput.value);
        }
        proofreadCorrectedText.value = proofreadResult.value?.summary?.corrected_text || '';
        proofreadStep.value = 3;
    }
    catch (e) {
        showToast('校对失败: ' + e.message, 'error');
        proofreadStep.value = 1;
    }
    finally {
        isProofreading.value = false;
        clearInterval(t);
    }
}
function applySingleCorrection(idx) {
    if (!proofreadResult.value?.errors?.[idx])
        return;
    const err = proofreadResult.value.errors[idx];
    if (proofreadCorrectedText.value && err.original_text && err.corrected_text) {
        proofreadCorrectedText.value = proofreadCorrectedText.value.replace(err.original_text, err.corrected_text);
    }
    proofreadResult.value.errors.splice(idx, 1);
    showToast('已采纳修正', 'success');
}
function applyAllCorrections() {
    if (!proofreadResult.value?.errors?.length)
        return;
    proofreadCorrectedText.value = proofreadResult.value.summary?.corrected_text || proofreadCorrectedText.value;
    proofreadResult.value.errors = [];
    showToast('已一键修正全部错误', 'success');
}
function copyCorrectedText() {
    if (!proofreadCorrectedText.value)
        return;
    navigator.clipboard.writeText(proofreadCorrectedText.value).then(() => {
        showToast('已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败', 'error');
    });
}
async function loadProofreadHistory() {
    isLoadingProofreadHistory.value = true;
    proofreadStep.value = 4;
    try {
        const res = await api.getProofreadHistory();
        proofreadHistory.value = res.records || [];
    }
    catch (e) {
        proofreadHistory.value = [];
    }
    finally {
        isLoadingProofreadHistory.value = false;
    }
}
async function viewProofreadDetail(recordId) {
    try {
        const detail = await api.getProofreadDetail(recordId);
        proofreadResult.value = { errors: detail.errors, summary: detail.summary };
        proofreadCorrectedText.value = detail.summary?.corrected_text || '';
        proofreadStep.value = 3;
    }
    catch (e) {
        showToast('加载详情失败: ' + e.message, 'error');
    }
}
async function deleteProofreadRecord(recordId) {
    try {
        await api.deleteProofreadRecord(recordId);
        proofreadHistory.value = proofreadHistory.value.filter(r => r.id !== recordId);
        showToast('删除成功', 'success');
    }
    catch (e) {
        showToast('删除失败: ' + e.message, 'error');
    }
}
function exportProofreadReport() {
    if (!proofreadResult.value)
        return;
    const summary = proofreadResult.value.summary || {};
    const errors = proofreadResult.value.errors || [];
    let report = 'AI智能校对报告\n';
    report += '='.repeat(50) + '\n\n';
    report += `总错误数: ${summary.total_errors || 0}\n`;
    report += `语法错误: ${summary.grammar_count || 0}\n`;
    report += `拼写错误: ${summary.spelling_count || 0}\n`;
    report += `标点问题: ${summary.punctuation_count || 0}\n`;
    report += `语句不通顺: ${summary.fluency_count || 0}\n`;
    report += `用词不当: ${summary.wording_count || 0}\n`;
    report += `文档质量: ${qualityLabel(summary.overall_quality).text}\n\n`;
    if (summary.recommendation)
        report += `修改建议: ${summary.recommendation}\n\n`;
    report += '-'.repeat(50) + '\n错误详情\n' + '-'.repeat(50) + '\n\n';
    errors.forEach((err, idx) => {
        const typeLabel = errorTypeStyle(err.error_type).label;
        const sevLabel = err.severity === 'high' ? '严重' : err.severity === 'medium' ? '中等' : '轻微';
        report += `${idx + 1}. [${typeLabel}][${sevLabel}] ${err.position_hint || `第${err.id}处`}\n`;
        report += `   原文: ${err.original_text}\n`;
        report += `   修正: ${err.corrected_text}\n`;
        report += `   描述: ${err.error_description}\n`;
        if (err.suggestion)
            report += `   建议: ${err.suggestion}\n`;
        report += '\n';
    });
    if (proofreadCorrectedText.value) {
        report += '-'.repeat(50) + '\n修正后全文\n' + '-'.repeat(50) + '\n\n';
        report += proofreadCorrectedText.value;
    }
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `校对报告_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('报告已导出', 'success');
}
// Doc Interpret - 法律文书智能解读
const interpretStep = ref(1);
const interpretInputMode = ref('file');
const interpretFile = ref(null);
const interpretFileInput = ref(null);
const interpretTextInput = ref('');
const isInterpreting = ref(false);
const interpretProgress = ref('');
const interpretResult = ref(null);
const interpretHistory = ref([]);
const isLoadingInterpretHistory = ref(false);
const interpretPreviewText = ref('');
const isInterpretDisabled = computed(() => {
    if (isInterpreting.value)
        return true;
    if (interpretInputMode.value === 'file')
        return !interpretFile.value;
    return !interpretTextInput.value || interpretTextInput.value.trim().length < 10;
});
function difficultyStyle(level) {
    const map = {
        complex: { text: '复杂', cls: 'text-red-600' },
        moderate: { text: '中等', cls: 'text-amber-600' },
        simple: { text: '简单', cls: 'text-green-600' },
    };
    return map[level] || map.moderate;
}
function handleInterpretSelect(event) {
    const file = event.target.files?.[0];
    if (file) {
        const err = validateInterpretFile(file);
        if (err) {
            showToast(err, 'error');
            return;
        }
        interpretFile.value = file;
    }
}
function handleInterpretDrop(event) {
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        const err = validateInterpretFile(file);
        if (err) {
            showToast(err, 'error');
            return;
        }
        interpretFile.value = file;
    }
}
function validateInterpretFile(file) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png'].includes(ext))
        return '不支持的文件格式，请上传 .docx .pdf .txt .jpg .png 文件';
    if (file.size > 10 * 1024 * 1024)
        return '文件大小超过10MB限制';
    return null;
}
async function startInterpret() {
    if (interpretInputMode.value === 'file' && interpretFile.value) {
        interpretStep.value = 2;
        interpretPreviewText.value = '';
        try {
            const formData = new FormData();
            formData.append('file', interpretFile.value);
            const token = localStorage.getItem('access_token');
            const headers = {};
            if (token)
                headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch('/api/doc-interpret/interpret', {
                method: 'POST',
                headers,
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const detail = errorData.detail || {};
                throw new Error(detail.message || detail.detail || `请求失败 (${response.status})`);
            }
            interpretResult.value = await response.json();
            interpretStep.value = 4;
        }
        catch (e) {
            showToast('解读失败: ' + e.message, 'error');
            interpretStep.value = 1;
        }
    }
    else if (interpretInputMode.value === 'text' && interpretTextInput.value) {
        isInterpreting.value = true;
        interpretStep.value = 3;
        interpretProgress.value = '正在分析文书内容...';
        const t = setInterval(() => {
            if (interpretProgress.value.includes('分析'))
                interpretProgress.value = '正在解读关键条款...';
            else if (interpretProgress.value.includes('条款'))
                interpretProgress.value = '正在识别风险与期限...';
            else if (interpretProgress.value.includes('风险'))
                interpretProgress.value = '正在生成解读报告...';
        }, 2000);
        try {
            interpretResult.value = await api.interpretTextDirect(interpretTextInput.value);
            interpretStep.value = 4;
        }
        catch (e) {
            showToast('解读失败: ' + e.message, 'error');
            interpretStep.value = 1;
        }
        finally {
            isInterpreting.value = false;
            clearInterval(t);
        }
    }
}
async function confirmInterpret() {
    isInterpreting.value = true;
    interpretStep.value = 3;
    interpretProgress.value = '正在分析文书内容...';
    const t = setInterval(() => {
        if (interpretProgress.value.includes('分析'))
            interpretProgress.value = '正在解读关键条款...';
        else if (interpretProgress.value.includes('条款'))
            interpretProgress.value = '正在识别风险与期限...';
        else if (interpretProgress.value.includes('风险'))
            interpretProgress.value = '正在生成解读报告...';
    }, 2000);
    try {
        if (interpretFile.value) {
            interpretResult.value = await api.interpretDocument(interpretFile.value, null);
        }
        else if (interpretTextInput.value) {
            interpretResult.value = await api.interpretTextDirect(interpretTextInput.value);
        }
        interpretStep.value = 4;
    }
    catch (e) {
        showToast('解读失败: ' + e.message, 'error');
        interpretStep.value = 2;
    }
    finally {
        isInterpreting.value = false;
        clearInterval(t);
    }
}
async function loadInterpretHistory() {
    isLoadingInterpretHistory.value = true;
    interpretStep.value = 5;
    try {
        const res = await api.getInterpretHistory();
        interpretHistory.value = res.records || [];
    }
    catch (e) {
        interpretHistory.value = [];
    }
    finally {
        isLoadingInterpretHistory.value = false;
    }
}
async function viewInterpretDetail(recordId) {
    try {
        const detail = await api.getInterpretDetail(recordId);
        interpretResult.value = detail;
        interpretStep.value = 4;
    }
    catch (e) {
        showToast('加载详情失败: ' + e.message, 'error');
    }
}
async function deleteInterpretRecord(recordId) {
    try {
        await api.deleteInterpretRecord(recordId);
        interpretHistory.value = interpretHistory.value.filter(r => r.id !== recordId);
        showToast('删除成功', 'success');
    }
    catch (e) {
        showToast('删除失败: ' + e.message, 'error');
    }
}
function exportInterpretReport() {
    if (!interpretResult.value)
        return;
    const r = interpretResult.value;
    let report = '法律文书智能解读报告\n';
    report += '='.repeat(50) + '\n\n';
    report += `文书类型: ${r.document_type}\n`;
    report += `理解难度: ${difficultyStyle(r.difficulty_level).text}\n`;
    report += `解读评分: ${r.interpretation_score}分\n`;
    if (r.parties?.length)
        report += `当事人: ${r.parties.join('、')}\n`;
    report += '\n' + '-'.repeat(50) + '\n文书概要\n' + '-'.repeat(50) + '\n\n';
    report += r.summary + '\n\n';
    if (r.overall_assessment)
        report += `总体评价: ${r.overall_assessment}\n\n`;
    if (r.key_clauses?.length) {
        report += '-'.repeat(50) + '\n关键条款解读\n' + '-'.repeat(50) + '\n\n';
        r.key_clauses.forEach((clause, idx) => {
            const riskLabel = clause.risk_level === 'high' ? '高风险' : clause.risk_level === 'medium' ? '中风险' : clause.risk_level === 'low' ? '低风险' : '';
            report += `${idx + 1}. ${clause.clause_title}${riskLabel ? ` [${riskLabel}]` : ''}\n`;
            report += `   原文: ${clause.original_text}\n`;
            report += `   解读: ${clause.interpretation}\n`;
            if (clause.legal_significance)
                report += `   法律意义: ${clause.legal_significance}\n`;
            report += '\n';
        });
    }
    if (r.risk_warnings?.length) {
        report += '-'.repeat(50) + '\n风险提示\n' + '-'.repeat(50) + '\n\n';
        r.risk_warnings.forEach((risk, idx) => {
            const sevLabel = risk.severity === 'high' ? '严重' : risk.severity === 'medium' ? '中等' : '轻微';
            report += `${idx + 1}. [${sevLabel}] ${risk.risk_title}\n`;
            report += `   描述: ${risk.description}\n`;
            if (risk.suggestion)
                report += `   建议: ${risk.suggestion}\n`;
            report += '\n';
        });
    }
    if (r.rights_obligations?.length) {
        report += '-'.repeat(50) + '\n权利义务分析\n' + '-'.repeat(50) + '\n\n';
        r.rights_obligations.forEach((ro) => {
            report += `【${ro.party}】\n`;
            if (ro.rights?.length)
                report += `  权利: ${ro.rights.join('；')}\n`;
            if (ro.obligations?.length)
                report += `  义务: ${ro.obligations.join('；')}\n`;
            report += '\n';
        });
    }
    if (r.key_deadlines?.length) {
        report += '-'.repeat(50) + '\n重要期限\n' + '-'.repeat(50) + '\n\n';
        r.key_deadlines.forEach((dl) => {
            report += `- ${dl.deadline_desc}: ${dl.date_or_period}\n`;
            if (dl.consequence)
                report += `  逾期后果: ${dl.consequence}\n`;
        });
        report += '\n';
    }
    if (r.legal_terms?.length) {
        report += '-'.repeat(50) + '\n专业术语解释\n' + '-'.repeat(50) + '\n\n';
        r.legal_terms.forEach((term) => {
            report += `${term.term}: ${term.definition}\n`;
        });
        report += '\n';
    }
    if (r.action_suggestions?.length) {
        report += '-'.repeat(50) + '\n行动建议\n' + '-'.repeat(50) + '\n\n';
        r.action_suggestions.forEach((suggestion, idx) => {
            report += `${idx + 1}. ${suggestion}\n`;
        });
    }
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `法律文书解读报告_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('报告已导出', 'success');
}
// Contract Draft - 智能合同起草
const draftStep = ref(1);
const contractCategories = ref([]);
const selectedTemplate = ref(null);
const draftElements = ref({});
const draftOutline = ref('');
const generatedContractText = ref('');
const isGeneratingOutline = ref(false);
const isGeneratingContract = ref(false);
const isCheckingQuality = ref(false);
const contractQualityResult = ref(null);
const draftActiveCategory = ref('all');
const draftFavorites = ref(JSON.parse(localStorage.getItem('draftFavorites') || '[]'));
const showPreviewModal = ref(false);
const previewTemplate = ref(null);
const userTemplates = ref([]);
const showCreateTemplateForm = ref(false);
const isLoadingCategories = ref(false);
const isCreatingTemplate = ref(false);
const allTemplatesFlat = ref([]);
const draftSearchKeyword = ref('');
const draftSearchResults = ref([]);
const isSearchingTemplates = ref(false);
let draftSearchTimer = null;
const newTemplateForm = ref({
    name: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    fields: [{ label: '甲方', field_type: 'text', required: true }, { label: '乙方', field_type: 'text', required: true }],
    outline_sections: ['合同主体', '合同标的', '权利义务', '违约责任', '争议解决'],
});
const hasRequiredFields = computed(() => {
    if (!selectedTemplate.value)
        return false;
    return selectedTemplate.value.fields
        .filter(f => f.required)
        .every(f => draftElements.value[f.key] && draftElements.value[f.key].trim());
});
const displayedCategories = computed(() => {
    if (draftActiveCategory.value === 'all')
        return contractCategories.value;
    return contractCategories.value.filter(c => c.id === draftActiveCategory.value);
});
const favoriteTemplates = computed(() => {
    return allTemplatesFlat.value.filter(t => draftFavorites.value.includes(t.id));
});
const totalTemplateCount = computed(() => {
    return allTemplatesFlat.value.length;
});
const categoryGradients = {
    civil: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    commercial: 'linear-gradient(135deg, #6366f1, #4338ca)',
    labor: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    ip: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    investment: 'linear-gradient(135deg, #f59e0b, #d97706)',
    other: 'linear-gradient(135deg, #64748b, #475569)',
};
const categoryIcons = {
    civil: 'ph-handshake',
    commercial: 'ph-buildings',
    labor: 'ph-users',
    ip: 'ph-lightbulb',
    investment: 'ph-chart-line-up',
    other: 'ph-folder',
};
const categoryBadgeBgs = {
    civil: '#dbeafe',
    commercial: '#e0e7ff',
    labor: '#ccfbf1',
    ip: '#f3e8ff',
    investment: '#fef3c7',
    other: '#f1f5f9',
};
const categoryBadgeColors = {
    civil: '#1d4ed8',
    commercial: '#4338ca',
    labor: '#0d9488',
    ip: '#7c3aed',
    investment: '#b45309',
    other: '#475569',
};
function getCategoryGradient(categoryId) {
    return categoryGradients[categoryId] || categoryGradients.other;
}
function getCategoryIcon(categoryId) {
    return categoryIcons[categoryId] || 'ph-folder';
}
function getCategoryBadgeBg(categoryId) {
    return categoryBadgeBgs[categoryId] || categoryBadgeBgs.other;
}
function getCategoryBadgeColor(categoryId) {
    return categoryBadgeColors[categoryId] || categoryBadgeColors.other;
}
function getCategoryName(categoryId) {
    const cat = contractCategories.value.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
}
function toggleFavorite(templateId) {
    if (!templateId)
        return;
    const idx = draftFavorites.value.indexOf(templateId);
    if (idx >= 0) {
        draftFavorites.value.splice(idx, 1);
    }
    else {
        draftFavorites.value.push(templateId);
    }
    localStorage.setItem('draftFavorites', JSON.stringify(draftFavorites.value));
}
async function openPreview(tpl) {
    if (tpl.fields && tpl.outline_sections) {
        previewTemplate.value = tpl;
        showPreviewModal.value = true;
        return;
    }
    try {
        const detail = await api.getContractTemplateDetail(tpl.id);
        previewTemplate.value = detail;
        showPreviewModal.value = true;
    }
    catch (e) {
        previewTemplate.value = tpl;
        showPreviewModal.value = true;
    }
}
async function startDraftFromPreview() {
    if (!previewTemplate.value)
        return;
    const tpl = previewTemplate.value;
    showPreviewModal.value = false;
    if (tpl.fields && tpl.outline_sections) {
        selectDraftTemplate(tpl);
    }
    else {
        await loadAndSelectTemplate(tpl.id);
    }
}
async function loadAndSelectTemplate(templateId) {
    try {
        const detail = await api.getContractTemplateDetail(templateId);
        selectDraftTemplate(detail);
    }
    catch (e) {
        showToast(`加载模板失败: ${e.message}`, 'error');
    }
}
function selectDraftTemplate(template) {
    selectedTemplate.value = template;
    draftElements.value = {};
    if (template.fields) {
        template.fields.forEach(f => {
            draftElements.value[f.key] = f.default_value || '';
        });
    }
    draftOutline.value = '';
    generatedContractText.value = '';
    contractQualityResult.value = null;
    draftStep.value = 2;
}
async function handleGenerateOutline() {
    if (!selectedTemplate.value || !hasRequiredFields.value)
        return;
    isGeneratingOutline.value = true;
    try {
        const result = await api.generateContractOutline({
            template_id: selectedTemplate.value.id,
            elements: draftElements.value,
        });
        draftOutline.value = result.outline;
        draftStep.value = 3;
    }
    catch (e) {
        showToast(`大纲生成失败: ${e.message}`, 'error');
    }
    finally {
        isGeneratingOutline.value = false;
    }
}
async function handleGenerateContract() {
    if (!selectedTemplate.value || !draftOutline.value.trim())
        return;
    isGeneratingContract.value = true;
    try {
        const result = await api.generateContractText({
            template_id: selectedTemplate.value.id,
            elements: draftElements.value,
            outline: draftOutline.value,
            search_law: true,
        });
        generatedContractText.value = result.contract_text;
        draftStep.value = 4;
    }
    catch (e) {
        showToast(`合同生成失败: ${e.message}`, 'error');
    }
    finally {
        isGeneratingContract.value = false;
    }
}
async function handleContractQualityCheck() {
    if (!generatedContractText.value)
        return;
    isCheckingQuality.value = true;
    try {
        contractQualityResult.value = await api.checkDocumentQuality(generatedContractText.value);
    }
    catch (e) {
        contractQualityResult.value = { quality_check: '质量检查失败', is_qualified: false };
    }
    finally {
        isCheckingQuality.value = false;
    }
}
function handleExportContract() {
    if (!generatedContractText.value)
        return;
    const blob = new Blob([generatedContractText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.value?.name || '合同'}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('合同已导出', 'success');
}
function resetDraft() {
    draftStep.value = 1;
    selectedTemplate.value = null;
    draftElements.value = {};
    draftOutline.value = '';
    generatedContractText.value = '';
    contractQualityResult.value = null;
    draftActiveCategory.value = 'all';
    draftSearchKeyword.value = '';
    draftSearchResults.value = [];
}
function handleDraftSearch() {
    if (draftSearchTimer)
        clearTimeout(draftSearchTimer);
    const keyword = draftSearchKeyword.value.trim();
    if (!keyword) {
        draftSearchResults.value = [];
        return;
    }
    isSearchingTemplates.value = true;
    draftSearchTimer = setTimeout(async () => {
        try {
            const localResults = allTemplatesFlat.value.filter(t => t.name.toLowerCase().includes(keyword.toLowerCase()) ||
                t.description.toLowerCase().includes(keyword.toLowerCase()) ||
                (t.subcategory_name && t.subcategory_name.toLowerCase().includes(keyword.toLowerCase())));
            if (localResults.length > 0) {
                draftSearchResults.value = localResults;
            }
            else {
                const result = await api.searchContractTemplates(keyword);
                draftSearchResults.value = (result.templates || []).map(t => ({
                    ...t,
                    field_count: t.field_count || t.fields?.length || '?',
                }));
            }
        }
        catch (e) {
            draftSearchResults.value = allTemplatesFlat.value.filter(t => t.name.toLowerCase().includes(keyword.toLowerCase()) ||
                t.description.toLowerCase().includes(keyword.toLowerCase()));
        }
        finally {
            isSearchingTemplates.value = false;
        }
    }, 300);
}
function clearDraftSearch() {
    draftSearchKeyword.value = '';
    draftSearchResults.value = [];
}
async function loadContractCategories() {
    isLoadingCategories.value = true;
    try {
        const result = await api.getContractCategories();
        contractCategories.value = result.categories || [];
        const flat = [];
        for (const cat of contractCategories.value) {
            for (const sub of cat.subcategories || []) {
                for (const tpl of sub.templates || []) {
                    flat.push({ ...tpl, category_id: cat.id, subcategory_name: sub.name, field_count: tpl.field_count || 0 });
                }
            }
        }
        allTemplatesFlat.value = flat;
    }
    catch (e) {
        contractCategories.value = [];
        allTemplatesFlat.value = [];
    }
    finally {
        isLoadingCategories.value = false;
    }
}
async function loadUserTemplates() {
    try {
        const result = await api.getUserTemplates();
        userTemplates.value = result.templates || [];
    }
    catch (e) {
        userTemplates.value = [];
    }
}
async function deleteUserTemplate(id) {
    try {
        await api.deleteUserTemplate(id);
        await loadUserTemplates();
        showToast('模板已删除', 'success');
    }
    catch (e) {
        showToast('删除失败', 'error');
    }
}
function editUserTemplate(ut) {
    selectDraftTemplate(ut);
}
function openCreateTemplateForm() {
    newTemplateForm.value = {
        name: '',
        description: '',
        category_id: '',
        subcategory_id: '',
        fields: [{ label: '甲方', field_type: 'text', required: true }, { label: '乙方', field_type: 'text', required: true }],
        outline_sections: ['合同主体', '合同标的', '权利义务', '违约责任', '争议解决'],
    };
    showCreateTemplateForm.value = true;
}
function getSubcategoriesForCategory(categoryId) {
    const cat = contractCategories.value.find(c => c.id === categoryId);
    return cat ? cat.subcategories : [];
}
async function handleCreateUserTemplate() {
    if (!newTemplateForm.value.name.trim())
        return;
    isCreatingTemplate.value = true;
    try {
        const fields = newTemplateForm.value.fields
            .filter(f => f.label.trim())
            .map((f, idx) => ({
            key: `field_${idx}`,
            label: f.label,
            field_type: f.field_type || 'text',
            required: f.required !== false,
            placeholder: `请输入${f.label}`,
            options: [],
            default_value: '',
        }));
        const outlineSections = newTemplateForm.value.outline_sections.filter(s => s.trim());
        await api.createUserTemplate({
            name: newTemplateForm.value.name,
            description: newTemplateForm.value.description,
            category_id: newTemplateForm.value.category_id,
            subcategory_id: newTemplateForm.value.subcategory_id,
            fields,
            outline_sections: outlineSections,
            prompt_template: '',
            law_references: [],
        });
        showCreateTemplateForm.value = false;
        await loadUserTemplates();
        showToast('模板创建成功', 'success');
    }
    catch (e) {
        showToast(`创建失败: ${e.message}`, 'error');
    }
    finally {
        isCreatingTemplate.value = false;
    }
}
// DocGen V2
const docStep = ref(1);
const docCategories = ref([]);
const selectedDocTemplate = ref(null);
const docElements = ref({});
const docOutline = ref('');
const generatedDocText = ref('');
const isGeneratingDocOutline = ref(false);
const isGeneratingDocText = ref(false);
const isCheckingDocQuality = ref(false);
const docQualityResult = ref(null);
const docActiveCategory = ref('all');
const docFavorites = ref(JSON.parse(localStorage.getItem('docFavorites') || '[]'));
const docRecentUsed = ref(JSON.parse(localStorage.getItem('docRecentUsed') || '[]'));
const docUsageFilter = ref('');
const showDocPreviewModal = ref(false);
const docPreviewTemplate = ref(null);
const isLoadingDocCategories = ref(false);
const docCategoryGradients = {
    litigation: 'linear-gradient(135deg, #ef4444, #dc2626)',
    labor_arb: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    marriage_family: 'linear-gradient(135deg, #ec4899, #db2777)',
    inheritance: 'linear-gradient(135deg, #f59e0b, #d97706)',
    debt_dispute: 'linear-gradient(135deg, #f97316, #ea580c)',
    daily_general: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    lawyer_docs: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    arbitration: 'linear-gradient(135deg, #a855f7, #9333ea)',
};
const docCategoryIcons = {
    litigation: 'ph-scales',
    labor_arb: 'ph-users',
    marriage_family: 'ph-heart',
    inheritance: 'ph-scroll',
    debt_dispute: 'ph-money',
    daily_general: 'ph-file-text',
    lawyer_docs: 'ph-briefcase',
    arbitration: 'ph-gavel',
};
const docCategoryBadgeBgs = {
    litigation: '#fef2f2',
    labor_arb: '#ccfbf1',
    marriage_family: '#fce7f3',
    inheritance: '#fef3c7',
    debt_dispute: '#fff7ed',
    daily_general: '#dbeafe',
    lawyer_docs: '#e0e7ff',
    arbitration: '#f3e8ff',
};
const docCategoryBadgeColors = {
    litigation: '#dc2626',
    labor_arb: '#0d9488',
    marriage_family: '#db2777',
    inheritance: '#b45309',
    debt_dispute: '#ea580c',
    daily_general: '#2563eb',
    lawyer_docs: '#4f46e5',
    arbitration: '#9333ea',
};
function getDocCategoryGradient(categoryId) {
    return docCategoryGradients[categoryId] || 'linear-gradient(135deg, #64748b, #475569)';
}
function getDocCategoryIcon(categoryId) {
    return docCategoryIcons[categoryId] || 'ph-folder';
}
function getDocCategoryBadgeBg(categoryId) {
    return docCategoryBadgeBgs[categoryId] || '#f1f5f9';
}
function getDocCategoryBadgeColor(categoryId) {
    return docCategoryBadgeColors[categoryId] || '#475569';
}
function getDocCategoryName(categoryId) {
    const cat = docCategories.value.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
}
const hasRequiredDocFields = computed(() => {
    if (!selectedDocTemplate.value)
        return false;
    return selectedDocTemplate.value.fields
        .filter(f => f.required)
        .every(f => docElements.value[f.key] && docElements.value[f.key].trim());
});
const displayedDocCategories = computed(() => {
    if (docActiveCategory.value === 'all') {
        if (!docUsageFilter.value)
            return docCategories.value;
        return docCategories.value.filter(c => getDocCategoryUsages(c.id).includes(docUsageFilter.value));
    }
    return docCategories.value.filter(c => c.id === docActiveCategory.value);
});
const favoriteDocTemplates = computed(() => {
    const flat = [];
    for (const cat of docCategories.value) {
        for (const tpl of cat.templates || []) {
            flat.push({ ...tpl, category_id: cat.id });
        }
    }
    return flat.filter(t => docFavorites.value.includes(t.id));
});
const recentDocTemplates = computed(() => {
    const flat = [];
    for (const cat of docCategories.value) {
        for (const tpl of cat.templates || []) {
            flat.push({ ...tpl, category_id: cat.id });
        }
    }
    return docRecentUsed.value
        .map(id => flat.find(t => t.id === id))
        .filter(Boolean);
});
const totalDocTemplateCount = computed(() => {
    return docCategories.value.reduce((sum, cat) => sum + (cat.template_count || 0), 0);
});
const docCategoryUsageMap = {
    litigation: ['诉讼'],
    labor_arb: ['仲裁', '非诉'],
    marriage_family: ['诉讼', '非诉'],
    inheritance: ['诉讼', '非诉'],
    debt_dispute: ['诉讼', '非诉'],
    daily_general: ['日常', '非诉'],
    lawyer_docs: ['律师', '非诉'],
    arbitration: ['仲裁'],
};
function getDocCategoryUsages(categoryId) {
    return docCategoryUsageMap[categoryId] || ['日常'];
}
function getFilteredTemplatesForCategory(cat) {
    if (!docUsageFilter.value)
        return cat.templates || [];
    if (!getDocCategoryUsages(cat.id).includes(docUsageFilter.value))
        return [];
    return cat.templates || [];
}
function toggleDocFavorite(templateId) {
    if (!templateId)
        return;
    const idx = docFavorites.value.indexOf(templateId);
    if (idx >= 0) {
        docFavorites.value.splice(idx, 1);
    }
    else {
        docFavorites.value.push(templateId);
    }
    localStorage.setItem('docFavorites', JSON.stringify(docFavorites.value));
}
async function openDocPreview(tpl) {
    if (tpl.fields && tpl.outline_sections) {
        docPreviewTemplate.value = tpl;
        showDocPreviewModal.value = true;
        return;
    }
    try {
        const detail = await api.getDocTemplateDetail(tpl.id);
        docPreviewTemplate.value = detail;
        showDocPreviewModal.value = true;
    }
    catch (e) {
        docPreviewTemplate.value = tpl;
        showDocPreviewModal.value = true;
    }
}
async function startDocFromPreview() {
    if (!docPreviewTemplate.value)
        return;
    const tpl = docPreviewTemplate.value;
    showDocPreviewModal.value = false;
    if (tpl.fields && tpl.outline_sections) {
        selectDocTemplate(tpl);
    }
    else {
        await loadAndSelectDocTemplate(tpl.id);
    }
}
async function loadAndSelectDocTemplate(templateId) {
    try {
        const detail = await api.getDocTemplateDetail(templateId);
        selectDocTemplate(detail);
    }
    catch (e) {
        showToast(`加载模板失败: ${e.message}`, 'error');
    }
}
function selectDocTemplate(template) {
    selectedDocTemplate.value = template;
    docElements.value = {};
    if (template.fields) {
        template.fields.forEach(f => {
            docElements.value[f.key] = f.default_value || '';
        });
    }
    docOutline.value = '';
    generatedDocText.value = '';
    docQualityResult.value = null;
    const idx = docRecentUsed.value.indexOf(template.id);
    if (idx >= 0)
        docRecentUsed.value.splice(idx, 1);
    docRecentUsed.value.unshift(template.id);
    if (docRecentUsed.value.length > 10)
        docRecentUsed.value = docRecentUsed.value.slice(0, 10);
    localStorage.setItem('docRecentUsed', JSON.stringify(docRecentUsed.value));
    docStep.value = 2;
}
async function handleGenerateDocOutline() {
    if (!selectedDocTemplate.value || !hasRequiredDocFields.value)
        return;
    isGeneratingDocOutline.value = true;
    try {
        const result = await api.generateDocOutline({
            template_id: selectedDocTemplate.value.id,
            elements: docElements.value,
        });
        docOutline.value = result.outline;
        docStep.value = 3;
    }
    catch (e) {
        showToast(`大纲生成失败: ${e.message}`, 'error');
    }
    finally {
        isGeneratingDocOutline.value = false;
    }
}
async function handleGenerateDocText() {
    if (!selectedDocTemplate.value || !docOutline.value.trim())
        return;
    isGeneratingDocText.value = true;
    try {
        const result = await api.generateDocText({
            template_id: selectedDocTemplate.value.id,
            elements: docElements.value,
            outline: docOutline.value,
        });
        generatedDocText.value = result.document_text;
        docStep.value = 4;
    }
    catch (e) {
        showToast(`文书生成失败: ${e.message}`, 'error');
    }
    finally {
        isGeneratingDocText.value = false;
    }
}
async function handleDocQualityCheck() {
    if (!generatedDocText.value)
        return;
    isCheckingDocQuality.value = true;
    try {
        docQualityResult.value = await api.checkDocQuality(generatedDocText.value);
    }
    catch (e) {
        docQualityResult.value = { quality_check: '质量检查失败', is_qualified: false };
    }
    finally {
        isCheckingDocQuality.value = false;
    }
}
function handleExportDoc() {
    if (!generatedDocText.value)
        return;
    const blob = new Blob([generatedDocText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDocTemplate.value?.name || '法律文书'}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('文书已导出', 'success');
}
function resetDocGen() {
    docStep.value = 1;
    selectedDocTemplate.value = null;
    docElements.value = {};
    docOutline.value = '';
    generatedDocText.value = '';
    docQualityResult.value = null;
    docActiveCategory.value = 'all';
    docUsageFilter.value = '';
}
async function loadDocCategories() {
    isLoadingDocCategories.value = true;
    try {
        const result = await api.getDocCategories();
        docCategories.value = result.categories || [];
    }
    catch (e) {
        console.error('[DocGen] Failed to load categories:', e);
        docCategories.value = [];
    }
    finally {
        isLoadingDocCategories.value = false;
    }
}
// Cases
const casesList = ref([]);
const showNewCaseForm = ref(false);
const newCase = ref({ title: '', case_type: '劳动纠纷', plaintiff: '', defendant: '', description: '' });
async function loadCases() { try {
    const r = await api.getCases();
    casesList.value = r.cases || [];
}
catch (e) {
    casesList.value = [];
} }
async function handleCreateCase() { if (!newCase.value.title)
    return; try {
    await api.createCase(newCase.value);
    showNewCaseForm.value = false;
    newCase.value = { title: '', case_type: '劳动纠纷', plaintiff: '', defendant: '', description: '' };
    await loadCases();
    showToast('案件创建成功', 'success');
}
catch (e) {
    showToast('创建失败', 'error');
} }
async function handleDeleteCase(id) { try {
    await api.deleteCase(id);
    await loadCases();
    showToast('案件已删除', 'success');
}
catch (e) {
    showToast('删除失败', 'error');
} }
// Account / API Key
const providers = ref([]);
const selectedProvider = ref('dashscope');
const llmApiKey = ref('');
const llmModelName = ref('qwen-turbo');
const isSavingConfig = ref(false);
const isValidatingKey = ref(false);
const apiKeyValidation = ref(null);
const showApiKey = ref(false);
const currentProviderInfo = computed(() => providers.value.find(p => p.id === selectedProvider.value) || {});
const currentModels = computed(() => currentProviderInfo.value.models || ['qwen-turbo']);
const currentKeyHint = computed(() => currentProviderInfo.value.key_hint || '请输入 API Key');
const currentProviderHasEnvKey = computed(() => currentProviderInfo.value.has_env_key || false);
function validateKeyFormat(key) {
    if (!key)
        return true;
    const prefix = currentProviderInfo.value.key_prefix || '';
    if (prefix && !key.startsWith(prefix))
        return false;
    return key.length >= 8;
}
function onProviderChange() {
    const info = currentProviderInfo.value;
    if (info.default_model)
        llmModelName.value = info.default_model;
    llmApiKey.value = '';
    apiKeyValidation.value = null;
}
async function loadProviders() { try {
    const r = await api.getProviders();
    providers.value = r.providers || [];
}
catch (e) {
    providers.value = [];
} }
async function loadAccountConfig() {
    if (authStore.userEmail) {
        try {
            const c = await api.getAccountConfig(authStore.userEmail);
            if (c.provider)
                selectedProvider.value = c.provider;
            llmApiKey.value = c.llm_api_key || '';
            llmModelName.value = c.model_name || 'qwen-turbo';
        }
        catch (e) { /* defaults */ }
    }
}
async function checkApiKeyStatus() { try {
    const r = await api.checkApikey();
    apiKeyConfigured.value = r.configured;
}
catch (e) {
    apiKeyConfigured.value = false;
} }
async function handleSaveConfig() {
    if (llmApiKey.value && !validateKeyFormat(llmApiKey.value)) {
        showToast('API Key 格式不正确', 'error');
        return;
    }
    isSavingConfig.value = true;
    apiKeyValidation.value = null;
    try {
        await api.saveAccountConfig({ provider: selectedProvider.value, llm_api_key: llmApiKey.value, model_name: llmModelName.value, email: authStore.userEmail });
        apiKeyConfigured.value = true;
        showToast('配置已保存', 'success');
        apiKeyValidation.value = { valid: true, message: '配置已保存成功' };
    }
    catch (e) {
        apiKeyValidation.value = { valid: false, message: `保存失败: ${e.message}` };
        showToast('保存失败', 'error');
    }
    finally {
        isSavingConfig.value = false;
    }
}
async function handleValidateApiKey() {
    const keyToValidate = llmApiKey.value;
    if (!keyToValidate && !currentProviderHasEnvKey.value) {
        showToast('请先输入 API Key', 'error');
        return;
    }
    if (keyToValidate && !validateKeyFormat(keyToValidate)) {
        showToast('API Key 格式不正确', 'error');
        return;
    }
    isValidatingKey.value = true;
    apiKeyValidation.value = null;
    try {
        const r = await api.validateApiKey({ provider: selectedProvider.value, llm_api_key: keyToValidate, model_name: llmModelName.value });
        apiKeyValidation.value = r;
        if (r.valid)
            showToast('API Key 验证成功', 'success');
        else
            showToast('API Key 验证失败', 'error');
    }
    catch (e) {
        apiKeyValidation.value = { valid: false, message: `验证失败: ${e.message}` };
        showToast('验证失败', 'error');
    }
    finally {
        isValidatingKey.value = false;
    }
}
// Auth
async function handleAuth() {
    authError.value = '';
    isAuthLoading.value = true;
    try {
        if (isLogin.value) {
            await authStore.login(authEmail.value, authPassword.value);
        }
        else {
            if (!registerName.value.trim()) {
                authError.value = '请输入姓名';
                return;
            }
            ;
            if (authPassword.value.length < 6) {
                authError.value = '密码长度不能少于6位';
                return;
            }
            ;
            await authStore.register(registerName.value, authEmail.value, authPassword.value);
            await authStore.login(authEmail.value, authPassword.value);
        }
        await Promise.all([loadProviders(), loadAccountConfig(), checkApiKeyStatus(), loadCases(), loadContractCategories(), loadUserTemplates(), loadDocCategories()]);
    }
    catch (e) {
        authError.value = e.message || '操作失败，请重试';
    }
    finally {
        isAuthLoading.value = false;
    }
}
function handleLogout() {
    authStore.logout();
    currentView.value = 'dashboard';
    chatMessages.value = [{ role: 'assistant', content: '您好！我是小理智法 AI 助手，可以为您解答法律问题、检索案例和法规。请描述您的法律问题。' }];
    generatedDocText.value = '';
    contractStep.value = 1;
    contractResult.value = null;
    apiKeyConfigured.value = true;
    resetDraft();
    resetDocGen();
}
onMounted(async () => { if (authStore.isAuthenticated)
    await Promise.all([loadProviders(), loadAccountConfig(), checkApiKeyStatus(), loadCases(), loadContractCategories(), loadUserTemplates(), loadDocCategories()]); });
watch(currentView, (val) => {
    if (val === 'cases')
        loadCases();
    if (val === 'account') {
        loadAccountConfig();
        checkApiKeyStatus();
    }
    if (val === 'contract-draft') {
        loadContractCategories();
        loadUserTemplates();
    }
    if (val === 'docgen')
        loadDocCategories();
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: ({ dark: __VLS_ctx.isDarkMode }) },
});
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
if (!__VLS_ctx.authStore.isAuthenticated) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "login-page" },
    });
    /** @type {__VLS_StyleScopedClasses['login-page']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "login-bg-1" },
    });
    /** @type {__VLS_StyleScopedClasses['login-bg-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "login-bg-2" },
    });
    /** @type {__VLS_StyleScopedClasses['login-bg-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "login-card" },
    });
    /** @type {__VLS_StyleScopedClasses['login-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "login-header" },
    });
    /** @type {__VLS_StyleScopedClasses['login-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ class: "ph ph-scales text-5xl text-white" },
    });
    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
    /** @type {__VLS_StyleScopedClasses['ph-scales']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
        ...{ class: "text-2xl font-bold text-white tracking-wide mt-3" },
    });
    /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-blue-100 text-sm mt-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-blue-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "login-body" },
    });
    /** @type {__VLS_StyleScopedClasses['login-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-xl font-semibold text-slate-800 mb-6" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
    (__VLS_ctx.isLogin ? '欢迎回来' : '注册新账号');
    if (__VLS_ctx.authError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "msg-error" },
        });
        /** @type {__VLS_StyleScopedClasses['msg-error']} */ ;
        (__VLS_ctx.authError);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
        ...{ onSubmit: (__VLS_ctx.handleAuth) },
        ...{ class: "space-y-4" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
    if (!__VLS_ctx.isLogin) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "form-label" },
        });
        /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "text",
            value: (__VLS_ctx.registerName),
            ...{ class: "form-input" },
            placeholder: "您的真实姓名",
        });
        /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "form-label" },
    });
    /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "email",
        required: true,
        ...{ class: "form-input" },
        placeholder: "admin@example.com",
    });
    (__VLS_ctx.authEmail);
    /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "form-label" },
    });
    /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "password",
        required: true,
        ...{ class: "form-input" },
        placeholder: "••••••••",
    });
    (__VLS_ctx.authPassword);
    /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        type: "submit",
        disabled: (__VLS_ctx.isAuthLoading),
        ...{ class: "btn-primary w-full mt-6" },
    });
    /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
    (__VLS_ctx.isAuthLoading ? '处理中...' : (__VLS_ctx.isLogin ? '登 录' : '注 册'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-6 text-center text-sm text-slate-500" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    (__VLS_ctx.isLogin ? '还没有账号？' : '已有账号？');
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.authStore.isAuthenticated))
                    return;
                __VLS_ctx.isLogin = !__VLS_ctx.isLogin;
                __VLS_ctx.authError = '';
                // @ts-ignore
                [isDarkMode, authStore, isLogin, isLogin, isLogin, isLogin, isLogin, isLogin, authError, authError, authError, handleAuth, registerName, authEmail, authPassword, isAuthLoading, isAuthLoading,];
            } },
        ...{ class: "text-blue-600 hover:underline ml-1 font-medium" },
    });
    /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:underline']} */ ;
    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    (__VLS_ctx.isLogin ? '立即注册' : '返回登录');
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "app-layout" },
    });
    /** @type {__VLS_StyleScopedClasses['app-layout']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "sidebar" },
        ...{ class: ({ collapsed: __VLS_ctx.sidebarCollapsed }) },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
    /** @type {__VLS_StyleScopedClasses['collapsed']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                    return;
                __VLS_ctx.currentView = 'dashboard';
                // @ts-ignore
                [isLogin, sidebarCollapsed, currentView,];
            } },
        ...{ class: "sidebar-logo" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-logo']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ class: "ph ph-scales text-2xl" },
    });
    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
    /** @type {__VLS_StyleScopedClasses['ph-scales']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-lg font-bold tracking-wide" },
        });
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
        ...{ class: "sidebar-nav" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.navItems))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.authStore.isAuthenticated))
                        return;
                    __VLS_ctx.currentView = item.id;
                    // @ts-ignore
                    [sidebarCollapsed, currentView, navItems,];
                } },
            key: (item.id),
            ...{ class: (['sidebar-item', { active: __VLS_ctx.currentView === item.id }]) },
            title: (item.label),
        });
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        /** @type {__VLS_StyleScopedClasses['sidebar-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: ([item.icon, 'text-lg']) },
        });
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        if (!__VLS_ctx.sidebarCollapsed) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (item.label);
        }
        // @ts-ignore
        [sidebarCollapsed, currentView,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sidebar-section" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.toggleDarkMode) },
        ...{ class: "sidebar-item dark-toggle-btn" },
        title: (__VLS_ctx.isDarkMode ? '切换到亮色模式' : '切换到暗黑模式'),
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['dark-toggle-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ class: ([__VLS_ctx.isDarkMode ? 'ph ph-sun' : 'ph ph-moon', 'text-lg']) },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.isDarkMode ? '亮色模式' : '暗黑模式');
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sidebar-user" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-user']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sidebar-avatar" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-avatar']} */ ;
    (__VLS_ctx.authStore.userName ? __VLS_ctx.authStore.userName[0] : '?');
    if (!__VLS_ctx.sidebarCollapsed) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "sidebar-user-info" },
        });
        /** @type {__VLS_StyleScopedClasses['sidebar-user-info']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-sm font-medium truncate" },
            ...{ class: (__VLS_ctx.isDarkMode ? 'text-slate-200' : 'text-slate-800') },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        (__VLS_ctx.authStore.userName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs truncate" },
            ...{ class: (__VLS_ctx.isDarkMode ? 'text-slate-400' : 'text-slate-500') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        (__VLS_ctx.authStore.userPlan);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "main-area" },
    });
    /** @type {__VLS_StyleScopedClasses['main-area']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "top-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['top-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-4" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                    return;
                __VLS_ctx.sidebarCollapsed = !__VLS_ctx.sidebarCollapsed;
                // @ts-ignore
                [isDarkMode, isDarkMode, isDarkMode, isDarkMode, isDarkMode, authStore, authStore, authStore, authStore, sidebarCollapsed, sidebarCollapsed, sidebarCollapsed, sidebarCollapsed, toggleDarkMode,];
            } },
        ...{ class: "p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" },
    });
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ class: (__VLS_ctx.sidebarCollapsed ? 'ph ph-sidebar-simple' : 'ph ph-sidebar') },
        ...{ class: "text-lg" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-lg font-semibold text-slate-800" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
    (__VLS_ctx.currentNavLabel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center space-x-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
    if (!__VLS_ctx.apiKeyConfigured) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.authStore.isAuthenticated))
                        return;
                    if (!(!__VLS_ctx.apiKeyConfigured))
                        return;
                    __VLS_ctx.currentView = 'account';
                    // @ts-ignore
                    [sidebarCollapsed, currentView, currentNavLabel, apiKeyConfigured,];
                } },
            ...{ class: "apikey-warning" },
        });
        /** @type {__VLS_StyleScopedClasses['apikey-warning']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-warning text-sm mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-warning']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "agent-badge" },
    });
    /** @type {__VLS_StyleScopedClasses['agent-badge']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ class: "ph ph-robot text-sm mr-1.5 text-indigo-500" },
    });
    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
    /** @type {__VLS_StyleScopedClasses['ph-robot']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-indigo-500']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "content-area" },
    });
    /** @type {__VLS_StyleScopedClasses['content-area']} */ ;
    if (__VLS_ctx.currentView === 'dashboard') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-8" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "text-2xl font-bold text-slate-800" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        (__VLS_ctx.authStore.userName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-slate-500 mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['lg:grid-cols-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
        for (const [feature] of __VLS_vFor((__VLS_ctx.dashboardFeatures))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'dashboard'))
                            return;
                        __VLS_ctx.currentView = feature.id;
                        // @ts-ignore
                        [authStore, currentView, currentView, dashboardFeatures,];
                    } },
                key: (feature.id),
                ...{ class: "feature-card group" },
            });
            /** @type {__VLS_StyleScopedClasses['feature-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['group']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: (['w-11 h-11 rounded-lg flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform', feature.color]) },
            });
            /** @type {__VLS_StyleScopedClasses['w-11']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-11']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['group-hover:scale-110']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-transform']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: ([feature.icon, 'text-xl']) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-base font-semibold text-slate-800 mb-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
            (feature.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (feature.desc);
            // @ts-ignore
            [];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-10" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-10']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "text-lg font-semibold text-slate-800 mb-4 flex items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-book-open text-xl mr-2 text-blue-600" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-book-open']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['lg:grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
        for (const [scenario, idx] of __VLS_vFor((__VLS_ctx.verticalScenarios))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'dashboard'))
                            return;
                        __VLS_ctx.openVerticalAgent(scenario.id);
                        // @ts-ignore
                        [verticalScenarios, openVerticalAgent,];
                    } },
                key: (idx),
                ...{ class: "scenario-card" },
            });
            /** @type {__VLS_StyleScopedClasses['scenario-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-3 mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-2 bg-blue-50 text-blue-600 rounded-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: ([scenario.icon, 'text-xl']) },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "font-semibold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (scenario.title);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-wrap gap-1.5 mt-3" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            for (const [tag] of __VLS_vFor((scenario.tags))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    key: (tag),
                    ...{ class: "px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-xs rounded" },
                });
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                (tag);
                // @ts-ignore
                [];
            }
            // @ts-ignore
            [];
        }
    }
    if (__VLS_ctx.currentView === 'chat') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chat-page animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-page']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chat-messages" },
            ref: "chatContainer",
        });
        /** @type {__VLS_StyleScopedClasses['chat-messages']} */ ;
        for (const [msg, i] of __VLS_vFor((__VLS_ctx.chatMessages))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
                ...{ class: (['chat-msg', msg.role]) },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: (['chat-msg-avatar', msg.role]) },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg-avatar']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: (msg.role === 'user' ? 'ph ph-user' : 'ph ph-robot') },
                ...{ class: "text-sm text-white" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: (['chat-msg-bubble', msg.role]) },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg-bubble']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-msg-content" },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(msg.content)) }, null, null);
            /** @type {__VLS_StyleScopedClasses['chat-msg-content']} */ ;
            // @ts-ignore
            [currentView, chatMessages, renderMarkdown,];
        }
        if (__VLS_ctx.isChatTyping) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-msg assistant" },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg']} */ ;
            /** @type {__VLS_StyleScopedClasses['assistant']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-msg-avatar assistant" },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg-avatar']} */ ;
            /** @type {__VLS_StyleScopedClasses['assistant']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-robot text-sm text-white" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-robot']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-msg-bubble assistant typing-indicator" },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg-bubble']} */ ;
            /** @type {__VLS_StyleScopedClasses['assistant']} */ ;
            /** @type {__VLS_StyleScopedClasses['typing-indicator']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dot" },
            });
            /** @type {__VLS_StyleScopedClasses['dot']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dot" },
            });
            /** @type {__VLS_StyleScopedClasses['dot']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dot" },
            });
            /** @type {__VLS_StyleScopedClasses['dot']} */ ;
        }
        if (__VLS_ctx.agentStatusText) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "agent-status-bar" },
            });
            /** @type {__VLS_StyleScopedClasses['agent-status-bar']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-spinner animate-spin mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-spinner']} */ ;
            /** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            (__VLS_ctx.agentStatusText);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chat-input-bar" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-input-bar']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (__VLS_ctx.handleChatSend) },
            ...{ class: "chat-input-form" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-input-form']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
            ...{ onKeydown: (__VLS_ctx.handleChatSend) },
            value: (__VLS_ctx.chatInput),
            placeholder: "输入案情或追问，例如：公司拖欠工资且未签劳动合同...",
            ...{ class: "chat-textarea" },
            rows: "1",
        });
        /** @type {__VLS_StyleScopedClasses['chat-textarea']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            type: "submit",
            disabled: (!__VLS_ctx.chatInput.trim() || __VLS_ctx.isChatTyping),
            ...{ class: "chat-send-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-send-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-paper-plane-right text-lg" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-paper-plane-right']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    }
    if (__VLS_ctx.currentView === 'vertical-agent') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chat-page animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-page']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chat-messages" },
            ref: "verticalChatContainer",
        });
        /** @type {__VLS_StyleScopedClasses['chat-messages']} */ ;
        if (__VLS_ctx.verticalAgentTitle) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-center mb-4" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200" },
            });
            /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-blue-200']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-robot text-base mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-robot']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            (__VLS_ctx.verticalAgentTitle);
        }
        for (const [msg, i] of __VLS_vFor((__VLS_ctx.verticalChatMessages))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
                ...{ class: (['chat-msg', msg.role]) },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: (['chat-msg-avatar', msg.role]) },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg-avatar']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: (msg.role === 'user' ? 'ph ph-user' : 'ph ph-robot') },
                ...{ class: "text-sm text-white" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: (['chat-msg-bubble', msg.role]) },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg-bubble']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-msg-content" },
            });
            __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(msg.content)) }, null, null);
            /** @type {__VLS_StyleScopedClasses['chat-msg-content']} */ ;
            // @ts-ignore
            [currentView, renderMarkdown, isChatTyping, isChatTyping, agentStatusText, agentStatusText, handleChatSend, handleChatSend, chatInput, chatInput, verticalAgentTitle, verticalAgentTitle, verticalChatMessages,];
        }
        if (__VLS_ctx.isVerticalTyping) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-msg assistant" },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg']} */ ;
            /** @type {__VLS_StyleScopedClasses['assistant']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-msg-avatar assistant" },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg-avatar']} */ ;
            /** @type {__VLS_StyleScopedClasses['assistant']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-robot text-sm text-white" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-robot']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-msg-bubble assistant typing-indicator" },
            });
            /** @type {__VLS_StyleScopedClasses['chat-msg-bubble']} */ ;
            /** @type {__VLS_StyleScopedClasses['assistant']} */ ;
            /** @type {__VLS_StyleScopedClasses['typing-indicator']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dot" },
            });
            /** @type {__VLS_StyleScopedClasses['dot']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dot" },
            });
            /** @type {__VLS_StyleScopedClasses['dot']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "dot" },
            });
            /** @type {__VLS_StyleScopedClasses['dot']} */ ;
        }
        if (__VLS_ctx.verticalAgentStatusText) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "agent-status-bar" },
            });
            /** @type {__VLS_StyleScopedClasses['agent-status-bar']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-spinner animate-spin mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-spinner']} */ ;
            /** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            (__VLS_ctx.verticalAgentStatusText);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "chat-input-bar" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-input-bar']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
            ...{ onSubmit: (__VLS_ctx.handleVerticalChatSend) },
            ...{ class: "chat-input-form" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-input-form']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
            ...{ onKeydown: (__VLS_ctx.handleVerticalChatSend) },
            value: (__VLS_ctx.verticalChatInput),
            placeholder: "请描述您的法律问题...",
            ...{ class: "chat-textarea" },
            rows: "1",
        });
        /** @type {__VLS_StyleScopedClasses['chat-textarea']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            type: "submit",
            disabled: (!__VLS_ctx.verticalChatInput.trim() || __VLS_ctx.isVerticalTyping),
            ...{ class: "chat-send-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-send-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-paper-plane-right text-lg" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-paper-plane-right']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    }
    if (__VLS_ctx.currentView === 'contract') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-8" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "text-2xl font-bold text-slate-800 flex items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-shield-check text-2xl text-indigo-600 mr-2" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-shield-check']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-indigo-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-slate-500 mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        if (__VLS_ctx.contractStep === 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract'))
                            return;
                        if (!(__VLS_ctx.contractStep === 1))
                            return;
                        __VLS_ctx.contractFileInput?.click();
                        // @ts-ignore
                        [currentView, isVerticalTyping, isVerticalTyping, verticalAgentStatusText, verticalAgentStatusText, handleVerticalChatSend, handleVerticalChatSend, verticalChatInput, verticalChatInput, contractStep, contractFileInput,];
                    } },
                ...{ onDragover: () => { } },
                ...{ onDrop: (__VLS_ctx.handleContractDrop) },
                ...{ class: "upload-zone" },
            });
            /** @type {__VLS_StyleScopedClasses['upload-zone']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (__VLS_ctx.handleContractFileSelect) },
                type: "file",
                ref: "contractFileInput",
                ...{ class: "hidden" },
                accept: ".pdf,.txt,.docx",
            });
            /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-cloud-arrow-up text-5xl text-slate-300 mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-cloud-arrow-up']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-base font-medium text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-400 text-sm mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-center text-slate-400 text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                value: (__VLS_ctx.contractText),
                placeholder: "在此粘贴合同文本内容...",
                rows: "8",
                ...{ class: "form-input resize-none text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['resize-none']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-end mt-3" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleContractTextSubmit) },
                disabled: (!__VLS_ctx.contractText.trim()),
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-magnifying-glass mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-magnifying-glass']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
        }
        if (__VLS_ctx.contractStep === 2) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card text-center py-16" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "spinner-lg mx-auto mb-5" },
            });
            /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-lg font-medium text-slate-800 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.contractProgress);
        }
        if (__VLS_ctx.contractStep === 3 && __VLS_ctx.contractResult) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 lg:grid-cols-12 gap-5" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['lg:grid-cols-12']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-4 space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-semibold text-slate-800 mb-4" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-3 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: (__VLS_ctx.contractResult.score >= 80 ? 'text-green-600' : __VLS_ctx.contractResult.score >= 60 ? 'text-yellow-600' : 'text-red-600') },
                ...{ class: "font-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_ctx.contractResult.score);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            (__VLS_ctx.contractResult.risk_items?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            (__VLS_ctx.contractResult.missing_clauses?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.hr)({
                ...{ class: "my-4 border-slate-100" },
            });
            /** @type {__VLS_StyleScopedClasses['my-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            for (const [risk, idx] of __VLS_vFor((__VLS_ctx.contractResult.risk_items))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: "flex items-start text-sm text-slate-700" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: (risk.level === 'high' ? 'ph ph-warning text-red-500' : risk.level === 'medium' ? 'ph ph-warning text-yellow-500' : 'ph ph-info text-blue-500') },
                    ...{ class: "text-base mr-2 mt-0.5 flex-shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                (risk.clause);
                // @ts-ignore
                [contractStep, contractStep, handleContractDrop, handleContractFileSelect, contractText, contractText, handleContractTextSubmit, contractProgress, contractResult, contractResult, contractResult, contractResult, contractResult, contractResult, contractResult,];
            }
            for (const [missing, idx] of __VLS_vFor((__VLS_ctx.contractResult.missing_clauses))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: ('m' + idx),
                    ...{ class: "flex items-start text-sm text-slate-700" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-plus text-base text-blue-500 mr-2 mt-0.5 flex-shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-blue-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                (missing);
                // @ts-ignore
                [contractResult,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract'))
                            return;
                        if (!(__VLS_ctx.contractStep === 3 && __VLS_ctx.contractResult))
                            return;
                        __VLS_ctx.contractStep = 1;
                        __VLS_ctx.contractResult = null;
                        // @ts-ignore
                        [contractStep, contractResult,];
                    } },
                ...{ class: "btn-outline w-full" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-8 card overflow-hidden !p-0" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
            /** @type {__VLS_StyleScopedClasses['!p-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "bg-slate-50 p-4 border-b border-slate-100 font-medium text-slate-800 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 space-y-4" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            for (const [risk, idx] of __VLS_vFor((__VLS_ctx.contractResult.risk_items))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: (['border-l-4 pl-4 bg-slate-50 p-4 rounded-r-lg', risk.level === 'high' ? 'border-red-500' : risk.level === 'medium' ? 'border-yellow-500' : 'border-blue-500']) },
                });
                /** @type {__VLS_StyleScopedClasses['border-l-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['pl-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-r-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "font-semibold text-slate-800 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                (idx + 1);
                (risk.clause);
                (risk.level === 'high' ? '高风险' : risk.level === 'medium' ? '中风险' : '低风险');
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm mt-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: (risk.level === 'high' ? 'text-red-600' : 'text-yellow-600') },
                    ...{ class: "font-medium" },
                });
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                (risk.reason);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-green-600 font-medium" },
                });
                /** @type {__VLS_StyleScopedClasses['text-green-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                (risk.suggestion);
                // @ts-ignore
                [contractResult,];
            }
            for (const [missing, idx] of __VLS_vFor((__VLS_ctx.contractResult.missing_clauses))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: ('m' + idx),
                    ...{ class: "border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg" },
                });
                /** @type {__VLS_StyleScopedClasses['border-l-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-blue-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['pl-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-r-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "font-semibold text-blue-900 text-sm flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-blue-900']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-plus text-base mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                (missing);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm mt-1 text-blue-700" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
                (missing);
                // @ts-ignore
                [contractResult,];
            }
            if (__VLS_ctx.contractResult.summary) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "bg-slate-50 p-4 rounded-lg" },
                });
                /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "font-semibold text-slate-800 mb-2 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-slate-600" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                (__VLS_ctx.contractResult.summary);
            }
        }
    }
    if (__VLS_ctx.currentView === 'contract-compare') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-8" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "text-2xl font-bold text-slate-800 flex items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-git-diff text-2xl text-violet-600 mr-2" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-git-diff']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-violet-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-slate-500 mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        if (__VLS_ctx.compareStep === 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 md:grid-cols-2 gap-5 mb-5" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-sm font-semibold text-slate-700 mb-2 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-file-doc text-base text-blue-500 mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-file-doc']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-compare'))
                            return;
                        if (!(__VLS_ctx.compareStep === 1))
                            return;
                        __VLS_ctx.compareOriginalInput?.click();
                        // @ts-ignore
                        [currentView, contractResult, contractResult, compareStep, compareOriginalInput,];
                    } },
                ...{ onDragover: () => { } },
                ...{ onDrop: (__VLS_ctx.handleCompareOriginalDrop) },
                ...{ class: "compare-upload-zone" },
                ...{ class: ({ 'has-file': __VLS_ctx.compareOriginalFile }) },
            });
            /** @type {__VLS_StyleScopedClasses['compare-upload-zone']} */ ;
            /** @type {__VLS_StyleScopedClasses['has-file']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (__VLS_ctx.handleCompareOriginalSelect) },
                type: "file",
                ref: "compareOriginalInput",
                ...{ class: "hidden" },
                accept: ".pdf,.docx,.txt",
            });
            /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
            if (!__VLS_ctx.compareOriginalFile) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-cloud-arrow-up text-4xl text-slate-300 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-cloud-arrow-up']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm font-medium text-slate-600" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-slate-400 mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-file-check text-3xl text-green-500 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-file-check']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm font-medium text-slate-800 truncate" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                (__VLS_ctx.compareOriginalFile.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-slate-400 mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                ((__VLS_ctx.compareOriginalFile.size / 1024).toFixed(1));
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'contract-compare'))
                                return;
                            if (!(__VLS_ctx.compareStep === 1))
                                return;
                            if (!!(!__VLS_ctx.compareOriginalFile))
                                return;
                            __VLS_ctx.compareOriginalFile = null;
                            // @ts-ignore
                            [handleCompareOriginalDrop, compareOriginalFile, compareOriginalFile, compareOriginalFile, compareOriginalFile, compareOriginalFile, handleCompareOriginalSelect,];
                        } },
                    ...{ class: "mt-2 text-xs text-red-500 hover:text-red-700" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-red-700']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-x mr-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-x']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-sm font-semibold text-slate-700 mb-2 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-file-plus text-base text-violet-500 mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-file-plus']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-violet-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-compare'))
                            return;
                        if (!(__VLS_ctx.compareStep === 1))
                            return;
                        __VLS_ctx.compareRevisedInput?.click();
                        // @ts-ignore
                        [compareRevisedInput,];
                    } },
                ...{ onDragover: () => { } },
                ...{ onDrop: (__VLS_ctx.handleCompareRevisedDrop) },
                ...{ class: "compare-upload-zone" },
                ...{ class: ({ 'has-file': __VLS_ctx.compareRevisedFile }) },
            });
            /** @type {__VLS_StyleScopedClasses['compare-upload-zone']} */ ;
            /** @type {__VLS_StyleScopedClasses['has-file']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (__VLS_ctx.handleCompareRevisedSelect) },
                type: "file",
                ref: "compareRevisedInput",
                ...{ class: "hidden" },
                accept: ".pdf,.docx,.txt",
            });
            /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
            if (!__VLS_ctx.compareRevisedFile) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-cloud-arrow-up text-4xl text-slate-300 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-cloud-arrow-up']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm font-medium text-slate-600" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-slate-400 mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-file-check text-3xl text-green-500 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-file-check']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm font-medium text-slate-800 truncate" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                (__VLS_ctx.compareRevisedFile.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-slate-400 mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                ((__VLS_ctx.compareRevisedFile.size / 1024).toFixed(1));
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'contract-compare'))
                                return;
                            if (!(__VLS_ctx.compareStep === 1))
                                return;
                            if (!!(!__VLS_ctx.compareRevisedFile))
                                return;
                            __VLS_ctx.compareRevisedFile = null;
                            // @ts-ignore
                            [handleCompareRevisedDrop, compareRevisedFile, compareRevisedFile, compareRevisedFile, compareRevisedFile, compareRevisedFile, handleCompareRevisedSelect,];
                        } },
                    ...{ class: "mt-2 text-xs text-red-500 hover:text-red-700" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-red-700']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-x mr-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-x']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-compare'))
                            return;
                        if (!(__VLS_ctx.compareStep === 1))
                            return;
                        __VLS_ctx.loadCompareHistory();
                        // @ts-ignore
                        [loadCompareHistory,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-clock-counter-clockwise mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-clock-counter-clockwise']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.startCompare) },
                disabled: (!__VLS_ctx.compareOriginalFile || !__VLS_ctx.compareRevisedFile || __VLS_ctx.isComparing),
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-git-diff mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-git-diff']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            (__VLS_ctx.isComparing ? '对比中...' : '开始对比');
        }
        if (__VLS_ctx.compareStep === 2) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card text-center py-16" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "spinner-lg mx-auto mb-5" },
            });
            /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-lg font-medium text-slate-800 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.compareProgress);
        }
        if (__VLS_ctx.compareStep === 3 && __VLS_ctx.compareResult) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-compare'))
                            return;
                        if (!(__VLS_ctx.compareStep === 3 && __VLS_ctx.compareResult))
                            return;
                        __VLS_ctx.compareStep = 1;
                        __VLS_ctx.compareResult = null;
                        // @ts-ignore
                        [compareStep, compareStep, compareStep, compareOriginalFile, compareRevisedFile, startCompare, isComparing, isComparing, compareProgress, compareResult, compareResult,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.exportCompareReport) },
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-download-simple mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-download-simple']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 lg:grid-cols-12 gap-5" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['lg:grid-cols-12']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-4 space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-semibold text-slate-800 mb-4" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-3 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.compareResult.summary?.total_changes || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-green-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-green-600']} */ ;
            (__VLS_ctx.compareResult.summary?.added_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-red-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
            (__VLS_ctx.compareResult.summary?.deleted_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-amber-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
            (__VLS_ctx.compareResult.summary?.modified_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.hr)({
                ...{ class: "border-slate-100" },
            });
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: (__VLS_ctx.compareResult.summary?.overall_risk === 'high' ? 'text-red-600' : __VLS_ctx.compareResult.summary?.overall_risk === 'medium' ? 'text-amber-600' : 'text-green-600') },
                ...{ class: "font-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_ctx.compareResult.summary?.overall_risk === 'high' ? '高风险' : __VLS_ctx.compareResult.summary?.overall_risk === 'medium' ? '中风险' : '低风险');
            if (__VLS_ctx.compareResult.summary?.key_changes?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-slate-800 mb-3" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-2" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
                for (const [change, idx] of __VLS_vFor((__VLS_ctx.compareResult.summary.key_changes))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (idx),
                        ...{ class: "flex items-start text-sm text-slate-700" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-warning-circle text-amber-500 mr-2 mt-0.5 flex-shrink-0" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-warning-circle']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-amber-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                    (change);
                    // @ts-ignore
                    [compareResult, compareResult, compareResult, compareResult, compareResult, compareResult, compareResult, compareResult, compareResult, compareResult, exportCompareReport,];
                }
            }
            if (__VLS_ctx.compareResult.summary?.recommendation) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card bg-blue-50 border-blue-100" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-blue-100']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-blue-900 mb-2 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-blue-900']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-lightbulb text-base mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-lightbulb']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-blue-800" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-blue-800']} */ ;
                (__VLS_ctx.compareResult.summary.recommendation);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-8 card overflow-hidden !p-0" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
            /** @type {__VLS_StyleScopedClasses['!p-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "bg-slate-50 p-4 border-b border-slate-100 font-medium text-slate-800 text-sm flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-list-dashes mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-list-dashes']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 space-y-4 max-h-[70vh] overflow-y-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-[70vh]']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            for (const [diff, idx] of __VLS_vFor((__VLS_ctx.compareResult.diff_items))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: (['border-l-4 pl-4 p-4 rounded-r-lg', diff.type === 'added' ? 'border-green-500 bg-green-50' : diff.type === 'deleted' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50']) },
                });
                /** @type {__VLS_StyleScopedClasses['border-l-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['pl-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-r-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "font-semibold text-slate-800 text-sm flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: (['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2', diff.type === 'added' ? 'bg-green-200 text-green-800' : diff.type === 'deleted' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800']) },
                });
                /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                (diff.type === 'added' ? '新增' : diff.type === 'deleted' ? '删除' : '修改');
                (diff.clause_title);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: (['text-xs px-2 py-0.5 rounded', diff.risk_level === 'high' ? 'bg-red-100 text-red-700' : diff.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700']) },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                (diff.risk_level === 'high' ? '高风险' : diff.risk_level === 'medium' ? '中风险' : '低风险');
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-slate-600 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                (diff.change_description);
                if (diff.original_content) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "mb-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs font-medium text-red-600 mb-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-minus mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-minus']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm text-slate-700 bg-white p-2 rounded border border-red-100" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
                    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-red-100']} */ ;
                    (diff.original_content);
                }
                if (diff.revised_content) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs font-medium text-green-600 mb-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-green-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-plus mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm text-slate-700 bg-white p-2 rounded border border-green-100" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
                    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-green-100']} */ ;
                    (diff.revised_content);
                }
                if (diff.legal_impact) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "mt-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs font-medium text-slate-500 mb-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-scales mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-scales']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm text-slate-600" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    (diff.legal_impact);
                }
                // @ts-ignore
                [compareResult, compareResult, compareResult,];
            }
            if (!__VLS_ctx.compareResult.diff_items?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-center py-10 text-slate-400" },
                });
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-check-circle text-4xl mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-check-circle']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            }
        }
        if (__VLS_ctx.compareStep === 4) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-compare'))
                            return;
                        if (!(__VLS_ctx.compareStep === 4))
                            return;
                        __VLS_ctx.compareStep = 1;
                        // @ts-ignore
                        [compareStep, compareStep, compareResult,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-compare'))
                            return;
                        if (!(__VLS_ctx.compareStep === 4))
                            return;
                        __VLS_ctx.loadCompareHistory();
                        // @ts-ignore
                        [loadCompareHistory,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrows-clockwise mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrows-clockwise']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            if (__VLS_ctx.isLoadingCompareHistory) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card text-center py-10" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "spinner-lg mx-auto mb-4" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-500 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            }
            else if (!__VLS_ctx.compareHistory.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card text-center py-16" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-clock-counter-clockwise text-5xl text-slate-200 mb-4" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-clock-counter-clockwise']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-200']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "text-lg font-medium text-slate-500 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-400 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'contract-compare'))
                                return;
                            if (!(__VLS_ctx.compareStep === 4))
                                return;
                            if (!!(__VLS_ctx.isLoadingCompareHistory))
                                return;
                            if (!(!__VLS_ctx.compareHistory.length))
                                return;
                            __VLS_ctx.compareStep = 1;
                            // @ts-ignore
                            [compareStep, isLoadingCompareHistory, compareHistory,];
                        } },
                    ...{ class: "btn-primary text-sm mt-4" },
                });
                /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-plus mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-3" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
                for (const [record] of __VLS_vFor((__VLS_ctx.compareHistory))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'contract-compare'))
                                    return;
                                if (!(__VLS_ctx.compareStep === 4))
                                    return;
                                if (!!(__VLS_ctx.isLoadingCompareHistory))
                                    return;
                                if (!!(!__VLS_ctx.compareHistory.length))
                                    return;
                                __VLS_ctx.viewCompareDetail(record.id);
                                // @ts-ignore
                                [compareHistory, viewCompareDetail,];
                            } },
                        key: (record.id),
                        ...{ class: "card hover:shadow-md transition-shadow cursor-pointer" },
                    });
                    /** @type {__VLS_StyleScopedClasses['card']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:shadow-md']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition-shadow']} */ ;
                    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center justify-between" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center space-x-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "p-2.5 bg-violet-50 text-violet-600 rounded-lg" },
                    });
                    /** @type {__VLS_StyleScopedClasses['p-2.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-violet-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-violet-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-git-diff text-xl" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-git-diff']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm font-medium text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (record.original_filename);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-arrow-right text-xs text-slate-400 mx-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-arrow-right']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mx-1']} */ ;
                    (record.revised_filename);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs text-slate-400 mt-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    (record.created_at);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center space-x-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-right" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm font-medium text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (record.total_changes);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: (['text-xs', record.overall_risk === 'high' ? 'text-red-600' : record.overall_risk === 'medium' ? 'text-amber-600' : 'text-green-600']) },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    (record.overall_risk === 'high' ? '高风险' : record.overall_risk === 'medium' ? '中风险' : '低风险');
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'contract-compare'))
                                    return;
                                if (!(__VLS_ctx.compareStep === 4))
                                    return;
                                if (!!(__VLS_ctx.isLoadingCompareHistory))
                                    return;
                                if (!!(!__VLS_ctx.compareHistory.length))
                                    return;
                                __VLS_ctx.deleteCompareRecord(record.id);
                                // @ts-ignore
                                [deleteCompareRecord,];
                            } },
                        ...{ class: "p-2 text-slate-400 hover:text-red-500 transition-colors" },
                        title: "删除",
                    });
                    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-trash text-base" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-trash']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    // @ts-ignore
                    [];
                }
            }
        }
    }
    if (__VLS_ctx.currentView === 'proofread') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-8" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "text-2xl font-bold text-slate-800 flex items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-text-aa text-2xl text-emerald-600 mr-2" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-text-aa']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-emerald-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-slate-500 mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        if (__VLS_ctx.proofreadStep === 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-5" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-3 mb-4" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'proofread'))
                            return;
                        if (!(__VLS_ctx.proofreadStep === 1))
                            return;
                        __VLS_ctx.proofreadInputMode = 'file';
                        // @ts-ignore
                        [currentView, proofreadStep, proofreadInputMode,];
                    } },
                ...{ class: (['px-4 py-2 rounded-lg text-sm font-medium transition-colors', __VLS_ctx.proofreadInputMode === 'file' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']) },
            });
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-upload-simple mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-upload-simple']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'proofread'))
                            return;
                        if (!(__VLS_ctx.proofreadStep === 1))
                            return;
                        __VLS_ctx.proofreadInputMode = 'text';
                        // @ts-ignore
                        [proofreadInputMode, proofreadInputMode,];
                    } },
                ...{ class: (['px-4 py-2 rounded-lg text-sm font-medium transition-colors', __VLS_ctx.proofreadInputMode === 'text' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']) },
            });
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-text-aa mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-text-aa']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            if (__VLS_ctx.proofreadInputMode === 'file') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'proofread'))
                                return;
                            if (!(__VLS_ctx.proofreadStep === 1))
                                return;
                            if (!(__VLS_ctx.proofreadInputMode === 'file'))
                                return;
                            __VLS_ctx.proofreadFileInput?.click();
                            // @ts-ignore
                            [proofreadInputMode, proofreadInputMode, proofreadFileInput,];
                        } },
                    ...{ onDragover: () => { } },
                    ...{ onDrop: (__VLS_ctx.handleProofreadDrop) },
                    ...{ class: "proofread-upload-zone" },
                    ...{ class: ({ 'has-file': __VLS_ctx.proofreadFile }) },
                });
                /** @type {__VLS_StyleScopedClasses['proofread-upload-zone']} */ ;
                /** @type {__VLS_StyleScopedClasses['has-file']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ onChange: (__VLS_ctx.handleProofreadSelect) },
                    type: "file",
                    ref: "proofreadFileInput",
                    ...{ class: "hidden" },
                    accept: ".pdf,.docx,.txt",
                });
                /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
                if (!__VLS_ctx.proofreadFile) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-cloud-arrow-up text-5xl text-slate-300 mb-3" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-cloud-arrow-up']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-base font-medium text-slate-600" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm text-slate-400 mt-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-file-check text-4xl text-green-500 mb-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-file-check']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm font-medium text-slate-800 truncate" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                    (__VLS_ctx.proofreadFile.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs text-slate-400 mt-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                    ((__VLS_ctx.proofreadFile.size / 1024).toFixed(1));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'proofread'))
                                    return;
                                if (!(__VLS_ctx.proofreadStep === 1))
                                    return;
                                if (!(__VLS_ctx.proofreadInputMode === 'file'))
                                    return;
                                if (!!(!__VLS_ctx.proofreadFile))
                                    return;
                                __VLS_ctx.proofreadFile = null;
                                // @ts-ignore
                                [handleProofreadDrop, proofreadFile, proofreadFile, proofreadFile, proofreadFile, proofreadFile, handleProofreadSelect,];
                            } },
                        ...{ class: "mt-2 text-xs text-red-500 hover:text-red-700" },
                    });
                    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-red-700']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-x mr-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-x']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
                }
            }
            if (__VLS_ctx.proofreadInputMode === 'text') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                    value: (__VLS_ctx.proofreadTextInput),
                    ...{ class: "w-full h-48 p-4 border border-slate-200 rounded-lg text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" },
                    placeholder: "请粘贴或输入需要校对的文本内容（至少10个字符）...",
                });
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-48']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['resize-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:ring-emerald-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:border-transparent']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-slate-400 mt-1 text-right" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                ((__VLS_ctx.proofreadTextInput || '').length);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'proofread'))
                            return;
                        if (!(__VLS_ctx.proofreadStep === 1))
                            return;
                        __VLS_ctx.loadProofreadHistory();
                        // @ts-ignore
                        [proofreadInputMode, proofreadTextInput, proofreadTextInput, loadProofreadHistory,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-clock-counter-clockwise mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-clock-counter-clockwise']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.startProofread) },
                disabled: (__VLS_ctx.isProofreadDisabled),
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-text-aa mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-text-aa']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            (__VLS_ctx.isProofreading ? '校对中...' : '开始校对');
        }
        if (__VLS_ctx.proofreadStep === 2) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card text-center py-16" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "spinner-lg mx-auto mb-5" },
            });
            /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-lg font-medium text-slate-800 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.proofreadProgress);
        }
        if (__VLS_ctx.proofreadStep === 3 && __VLS_ctx.proofreadResult) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'proofread'))
                            return;
                        if (!(__VLS_ctx.proofreadStep === 3 && __VLS_ctx.proofreadResult))
                            return;
                        __VLS_ctx.proofreadStep = 1;
                        __VLS_ctx.proofreadResult = null;
                        // @ts-ignore
                        [proofreadStep, proofreadStep, proofreadStep, startProofread, isProofreadDisabled, isProofreading, proofreadProgress, proofreadResult, proofreadResult,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-3" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            if (__VLS_ctx.proofreadResult.errors?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (__VLS_ctx.applyAllCorrections) },
                    ...{ class: "btn-primary text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-check-circle mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-check-circle']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.exportProofreadReport) },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-download-simple mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-download-simple']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 lg:grid-cols-12 gap-5" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['lg:grid-cols-12']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-4 space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-semibold text-slate-800 mb-4" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-3 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.proofreadResult.summary?.total_errors || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-red-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
            (__VLS_ctx.proofreadResult.summary?.grammar_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-orange-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-orange-600']} */ ;
            (__VLS_ctx.proofreadResult.summary?.spelling_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-amber-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
            (__VLS_ctx.proofreadResult.summary?.punctuation_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-blue-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
            (__VLS_ctx.proofreadResult.summary?.fluency_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-purple-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-purple-600']} */ ;
            (__VLS_ctx.proofreadResult.summary?.wording_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.hr)({
                ...{ class: "border-slate-100" },
            });
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: (__VLS_ctx.qualityLabel(__VLS_ctx.proofreadResult.summary?.overall_quality).cls) },
                ...{ class: "font-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_ctx.qualityLabel(__VLS_ctx.proofreadResult.summary?.overall_quality).text);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-semibold text-slate-800 mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-3" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm text-slate-600 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-3 h-3 rounded-full bg-red-500 mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['w-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-red-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm font-bold text-red-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
            (__VLS_ctx.proofreadResult.summary?.high_severity_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm text-slate-600 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-3 h-3 rounded-full bg-amber-500 mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['w-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-amber-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm font-bold text-amber-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
            (__VLS_ctx.proofreadResult.summary?.medium_severity_count || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm text-slate-600 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-3 h-3 rounded-full bg-blue-500 mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['w-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm font-bold text-blue-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
            (__VLS_ctx.proofreadResult.summary?.low_severity_count || 0);
            if (__VLS_ctx.proofreadResult.summary?.recommendation) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card bg-emerald-50 border-emerald-100" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-emerald-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-emerald-100']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-emerald-900 mb-2 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-emerald-900']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-lightbulb text-base mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-lightbulb']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-emerald-800" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-emerald-800']} */ ;
                (__VLS_ctx.proofreadResult.summary.recommendation);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-8 card overflow-hidden !p-0" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
            /** @type {__VLS_StyleScopedClasses['!p-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "bg-slate-50 p-4 border-b border-slate-100 font-medium text-slate-800 text-sm flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-list-dashes mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-list-dashes']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-slate-400" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            (__VLS_ctx.proofreadResult.errors?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 space-y-4 max-h-[70vh] overflow-y-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-[70vh]']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            for (const [err, idx] of __VLS_vFor((__VLS_ctx.proofreadResult.errors))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: (['border-l-4 pl-4 p-4 rounded-r-lg', err.severity === 'high' ? 'border-red-500 bg-red-50' : err.severity === 'medium' ? 'border-amber-500 bg-amber-50' : 'border-blue-500 bg-blue-50']) },
                });
                /** @type {__VLS_StyleScopedClasses['border-l-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['pl-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-r-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "font-semibold text-slate-800 text-sm flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: (['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2', __VLS_ctx.errorTypeStyle(err.error_type).cls]) },
                });
                /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                (__VLS_ctx.errorTypeStyle(err.error_type).label);
                (err.position_hint || `第${err.id}处`);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: (['text-xs px-2 py-0.5 rounded', err.severity === 'high' ? 'bg-red-100 text-red-700' : err.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700']) },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                (err.severity === 'high' ? '严重' : err.severity === 'medium' ? '中等' : '轻微');
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs font-medium text-red-600 mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-x-circle mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-x-circle']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-slate-700 bg-white p-2 rounded border border-red-100" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-red-100']} */ ;
                (err.original_text);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs font-medium text-green-600 mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-green-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-check-circle mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-check-circle']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-slate-700 bg-white p-2 rounded border border-green-100" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-green-100']} */ ;
                (err.corrected_text);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-slate-600" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-info text-slate-400 mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-info']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                (err.error_description);
                if (err.suggestion) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "mt-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs font-medium text-emerald-600 mb-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-emerald-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-lightbulb mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-lightbulb']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm text-slate-600 bg-emerald-50 p-2 rounded" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-emerald-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                    (err.suggestion);
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mt-3 flex justify-end" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'proofread'))
                                return;
                            if (!(__VLS_ctx.proofreadStep === 3 && __VLS_ctx.proofreadResult))
                                return;
                            __VLS_ctx.applySingleCorrection(idx);
                            // @ts-ignore
                            [proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, proofreadResult, applyAllCorrections, exportProofreadReport, qualityLabel, qualityLabel, errorTypeStyle, errorTypeStyle, applySingleCorrection,];
                        } },
                    ...{ class: "text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-emerald-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:bg-emerald-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-check mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-check']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                // @ts-ignore
                [];
            }
            if (!__VLS_ctx.proofreadResult.errors?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-center py-10 text-slate-400" },
                });
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-check-circle text-5xl mb-3" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-check-circle']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-lg font-medium" },
                });
                /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            }
            if (__VLS_ctx.proofreadCorrectedText) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mb-3" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-slate-800 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-file-check text-base text-emerald-600 mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-file-check']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-emerald-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (__VLS_ctx.copyCorrectedText) },
                    ...{ class: "btn-outline text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-copy mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-copy']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "bg-slate-50 p-4 rounded-lg text-sm text-slate-700 max-h-96 overflow-y-auto whitespace-pre-wrap" },
                });
                /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                /** @type {__VLS_StyleScopedClasses['max-h-96']} */ ;
                /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
                (__VLS_ctx.proofreadCorrectedText);
            }
        }
        if (__VLS_ctx.proofreadStep === 4) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'proofread'))
                            return;
                        if (!(__VLS_ctx.proofreadStep === 4))
                            return;
                        __VLS_ctx.proofreadStep = 1;
                        // @ts-ignore
                        [proofreadStep, proofreadStep, proofreadResult, proofreadCorrectedText, proofreadCorrectedText, copyCorrectedText,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'proofread'))
                            return;
                        if (!(__VLS_ctx.proofreadStep === 4))
                            return;
                        __VLS_ctx.loadProofreadHistory();
                        // @ts-ignore
                        [loadProofreadHistory,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrows-clockwise mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrows-clockwise']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            if (__VLS_ctx.isLoadingProofreadHistory) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card text-center py-10" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "spinner-lg mx-auto mb-4" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-500 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            }
            else if (!__VLS_ctx.proofreadHistory.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card text-center py-16" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-clock-counter-clockwise text-5xl text-slate-200 mb-4" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-clock-counter-clockwise']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-200']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "text-lg font-medium text-slate-500 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-400 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'proofread'))
                                return;
                            if (!(__VLS_ctx.proofreadStep === 4))
                                return;
                            if (!!(__VLS_ctx.isLoadingProofreadHistory))
                                return;
                            if (!(!__VLS_ctx.proofreadHistory.length))
                                return;
                            __VLS_ctx.proofreadStep = 1;
                            // @ts-ignore
                            [proofreadStep, isLoadingProofreadHistory, proofreadHistory,];
                        } },
                    ...{ class: "btn-primary text-sm mt-4" },
                });
                /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-plus mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-3" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
                for (const [record] of __VLS_vFor((__VLS_ctx.proofreadHistory))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'proofread'))
                                    return;
                                if (!(__VLS_ctx.proofreadStep === 4))
                                    return;
                                if (!!(__VLS_ctx.isLoadingProofreadHistory))
                                    return;
                                if (!!(!__VLS_ctx.proofreadHistory.length))
                                    return;
                                __VLS_ctx.viewProofreadDetail(record.id);
                                // @ts-ignore
                                [proofreadHistory, viewProofreadDetail,];
                            } },
                        key: (record.id),
                        ...{ class: "card hover:shadow-md transition-shadow cursor-pointer" },
                    });
                    /** @type {__VLS_StyleScopedClasses['card']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:shadow-md']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition-shadow']} */ ;
                    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center justify-between" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center space-x-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "p-2.5 bg-emerald-50 text-emerald-600 rounded-lg" },
                    });
                    /** @type {__VLS_StyleScopedClasses['p-2.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-emerald-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-emerald-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-text-aa text-xl" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-text-aa']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm font-medium text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (record.filename);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs text-slate-400 mt-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    (record.created_at);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center space-x-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-right" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm font-medium text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (record.total_errors);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: (['text-xs', __VLS_ctx.qualityLabel(record.overall_quality).cls]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    (__VLS_ctx.qualityLabel(record.overall_quality).text);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'proofread'))
                                    return;
                                if (!(__VLS_ctx.proofreadStep === 4))
                                    return;
                                if (!!(__VLS_ctx.isLoadingProofreadHistory))
                                    return;
                                if (!!(!__VLS_ctx.proofreadHistory.length))
                                    return;
                                __VLS_ctx.deleteProofreadRecord(record.id);
                                // @ts-ignore
                                [qualityLabel, qualityLabel, deleteProofreadRecord,];
                            } },
                        ...{ class: "p-2 text-slate-400 hover:text-red-500 transition-colors" },
                        title: "删除",
                    });
                    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-trash text-base" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-trash']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    // @ts-ignore
                    [];
                }
            }
        }
    }
    if (__VLS_ctx.currentView === 'doc-interpret') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mb-8" },
        });
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "text-2xl font-bold text-slate-800 flex items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-book-open-text text-2xl text-amber-600 mr-2" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-book-open-text']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-slate-500 mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        if (__VLS_ctx.interpretStep === 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-5" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-3 mb-4" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'doc-interpret'))
                            return;
                        if (!(__VLS_ctx.interpretStep === 1))
                            return;
                        __VLS_ctx.interpretInputMode = 'file';
                        // @ts-ignore
                        [currentView, interpretStep, interpretInputMode,];
                    } },
                ...{ class: (['px-4 py-2 rounded-lg text-sm font-medium transition-colors', __VLS_ctx.interpretInputMode === 'file' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']) },
            });
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-upload-simple mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-upload-simple']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'doc-interpret'))
                            return;
                        if (!(__VLS_ctx.interpretStep === 1))
                            return;
                        __VLS_ctx.interpretInputMode = 'text';
                        // @ts-ignore
                        [interpretInputMode, interpretInputMode,];
                    } },
                ...{ class: (['px-4 py-2 rounded-lg text-sm font-medium transition-colors', __VLS_ctx.interpretInputMode === 'text' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']) },
            });
            /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-text-aa mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-text-aa']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            if (__VLS_ctx.interpretInputMode === 'file') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'doc-interpret'))
                                return;
                            if (!(__VLS_ctx.interpretStep === 1))
                                return;
                            if (!(__VLS_ctx.interpretInputMode === 'file'))
                                return;
                            __VLS_ctx.interpretFileInput?.click();
                            // @ts-ignore
                            [interpretInputMode, interpretInputMode, interpretFileInput,];
                        } },
                    ...{ onDragover: () => { } },
                    ...{ onDrop: (__VLS_ctx.handleInterpretDrop) },
                    ...{ class: "interpret-upload-zone" },
                    ...{ class: ({ 'has-file': __VLS_ctx.interpretFile }) },
                });
                /** @type {__VLS_StyleScopedClasses['interpret-upload-zone']} */ ;
                /** @type {__VLS_StyleScopedClasses['has-file']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ onChange: (__VLS_ctx.handleInterpretSelect) },
                    type: "file",
                    ref: "interpretFileInput",
                    ...{ class: "hidden" },
                    accept: ".pdf,.docx,.txt,.jpg,.jpeg,.png",
                });
                /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
                if (!__VLS_ctx.interpretFile) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-cloud-arrow-up text-5xl text-slate-300 mb-3" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-cloud-arrow-up']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-base font-medium text-slate-600" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm text-slate-400 mt-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-file-check text-4xl text-green-500 mb-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-file-check']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-green-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm font-medium text-slate-800 truncate" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                    (__VLS_ctx.interpretFile.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs text-slate-400 mt-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                    ((__VLS_ctx.interpretFile.size / 1024).toFixed(1));
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'doc-interpret'))
                                    return;
                                if (!(__VLS_ctx.interpretStep === 1))
                                    return;
                                if (!(__VLS_ctx.interpretInputMode === 'file'))
                                    return;
                                if (!!(!__VLS_ctx.interpretFile))
                                    return;
                                __VLS_ctx.interpretFile = null;
                                // @ts-ignore
                                [handleInterpretDrop, interpretFile, interpretFile, interpretFile, interpretFile, interpretFile, handleInterpretSelect,];
                            } },
                        ...{ class: "mt-2 text-xs text-red-500 hover:text-red-700" },
                    });
                    /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-red-700']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-x mr-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-x']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-0.5']} */ ;
                }
            }
            if (__VLS_ctx.interpretInputMode === 'text') {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                    value: (__VLS_ctx.interpretTextInput),
                    ...{ class: "w-full h-48 p-4 border border-slate-200 rounded-lg text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" },
                    placeholder: "请粘贴或输入需要解读的法律文书内容（至少10个字符）...",
                });
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-48']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['resize-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:ring-amber-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['focus:border-transparent']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-slate-400 mt-1 text-right" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                ((__VLS_ctx.interpretTextInput || '').length);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'doc-interpret'))
                            return;
                        if (!(__VLS_ctx.interpretStep === 1))
                            return;
                        __VLS_ctx.loadInterpretHistory();
                        // @ts-ignore
                        [interpretInputMode, interpretTextInput, interpretTextInput, loadInterpretHistory,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-clock-counter-clockwise mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-clock-counter-clockwise']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.startInterpret) },
                disabled: (__VLS_ctx.isInterpretDisabled),
                ...{ class: "btn-primary text-sm" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-book-open-text mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-book-open-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            (__VLS_ctx.isInterpreting ? '解读中...' : '开始解读');
        }
        if (__VLS_ctx.interpretStep === 2) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-semibold text-slate-800 mb-4 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-eye text-base text-amber-500 mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-eye']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-amber-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            if (__VLS_ctx.interpretFile) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-3 mb-4 p-3 bg-slate-50 rounded-lg" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-file text-2xl text-amber-500" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-file']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-amber-500']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm font-medium text-slate-800" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                (__VLS_ctx.interpretFile.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-slate-400" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                ((__VLS_ctx.interpretFile.size / 1024).toFixed(1));
            }
            if (__VLS_ctx.interpretPreviewText) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "bg-slate-50 p-4 rounded-lg text-sm text-slate-700 max-h-64 overflow-y-auto whitespace-pre-wrap" },
                });
                /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                /** @type {__VLS_StyleScopedClasses['max-h-64']} */ ;
                /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
                (__VLS_ctx.interpretPreviewText);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-center py-8 text-slate-400" },
                });
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "spinner-lg mx-auto mb-3" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'doc-interpret'))
                            return;
                        if (!(__VLS_ctx.interpretStep === 2))
                            return;
                        __VLS_ctx.interpretStep = 1;
                        __VLS_ctx.interpretPreviewText = '';
                        // @ts-ignore
                        [interpretStep, interpretStep, interpretFile, interpretFile, interpretFile, startInterpret, isInterpretDisabled, isInterpreting, interpretPreviewText, interpretPreviewText, interpretPreviewText,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.confirmInterpret) },
                disabled: (!__VLS_ctx.interpretPreviewText || __VLS_ctx.isInterpreting),
                ...{ class: "btn-primary text-sm" },
                ...{ style: {} },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-book-open-text mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-book-open-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            (__VLS_ctx.isInterpreting ? '解读中...' : '确认并解读');
        }
        if (__VLS_ctx.interpretStep === 3) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card text-center py-16" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "spinner-lg mx-auto mb-5" },
            });
            /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-lg font-medium text-slate-800 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.interpretProgress);
        }
        if (__VLS_ctx.interpretStep === 4 && __VLS_ctx.interpretResult) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'doc-interpret'))
                            return;
                        if (!(__VLS_ctx.interpretStep === 4 && __VLS_ctx.interpretResult))
                            return;
                        __VLS_ctx.interpretStep = 1;
                        __VLS_ctx.interpretResult = null;
                        __VLS_ctx.interpretPreviewText = '';
                        // @ts-ignore
                        [interpretStep, interpretStep, interpretStep, isInterpreting, isInterpreting, interpretPreviewText, interpretPreviewText, confirmInterpret, interpretProgress, interpretResult, interpretResult,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-3" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.exportInterpretReport) },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-download-simple mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-download-simple']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 lg:grid-cols-12 gap-5" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['lg:grid-cols-12']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-4 space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-semibold text-slate-800 mb-4" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-3 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.interpretResult.document_type);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: (__VLS_ctx.difficultyStyle(__VLS_ctx.interpretResult.difficulty_level).cls) },
                ...{ class: "font-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_ctx.difficultyStyle(__VLS_ctx.interpretResult.difficulty_level).text);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: (__VLS_ctx.interpretResult.interpretation_score >= 80 ? 'text-green-600' : __VLS_ctx.interpretResult.interpretation_score >= 60 ? 'text-amber-600' : 'text-red-600') },
                ...{ class: "font-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_ctx.interpretResult.interpretation_score);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            (__VLS_ctx.interpretResult.key_clauses?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-red-600" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
            (__VLS_ctx.interpretResult.risk_warnings?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-600" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            (__VLS_ctx.interpretResult.key_deadlines?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.hr)({
                ...{ class: "my-4 border-slate-100" },
            });
            /** @type {__VLS_StyleScopedClasses['my-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            if (__VLS_ctx.interpretResult.parties?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mb-3" },
                });
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs font-medium text-slate-500 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex flex-wrap gap-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                for (const [party] of __VLS_vFor((__VLS_ctx.interpretResult.parties))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        key: (party),
                        ...{ class: "px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200" },
                    });
                    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-amber-200']} */ ;
                    (party);
                    // @ts-ignore
                    [interpretResult, interpretResult, interpretResult, interpretResult, interpretResult, interpretResult, interpretResult, interpretResult, interpretResult, interpretResult, interpretResult, exportInterpretReport, difficultyStyle, difficultyStyle,];
                }
            }
            if (__VLS_ctx.interpretResult.risk_warnings?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-slate-800 mb-3 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-warning text-base text-red-500 mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-warning']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-2" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
                for (const [risk, idx] of __VLS_vFor((__VLS_ctx.interpretResult.risk_warnings))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (idx),
                        ...{ class: "flex items-start text-sm" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: (risk.severity === 'high' ? 'ph ph-warning-circle text-red-500' : risk.severity === 'medium' ? 'ph ph-warning text-amber-500' : 'ph ph-info text-blue-500') },
                        ...{ class: "text-base mr-2 mt-0.5 flex-shrink-0" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "font-medium text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (risk.risk_title);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-slate-500 text-xs mt-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    (risk.description);
                    // @ts-ignore
                    [interpretResult, interpretResult,];
                }
            }
            if (__VLS_ctx.interpretResult.key_deadlines?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-slate-800 mb-3 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-timer text-base text-amber-500 mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-timer']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-amber-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-3" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
                for (const [dl, idx] of __VLS_vFor((__VLS_ctx.interpretResult.key_deadlines))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (idx),
                        ...{ class: "text-sm" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "font-medium text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (dl.deadline_desc);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-amber-600 text-xs mt-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    (dl.date_or_period);
                    if (dl.consequence) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "text-red-500 text-xs mt-0.5" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                        (dl.consequence);
                    }
                    // @ts-ignore
                    [interpretResult, interpretResult,];
                }
            }
            if (__VLS_ctx.interpretResult.action_suggestions?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card bg-amber-50 border-amber-100" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-amber-100']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-amber-900 mb-2 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-amber-900']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-lightbulb text-base mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-lightbulb']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-2" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
                for (const [suggestion, idx] of __VLS_vFor((__VLS_ctx.interpretResult.action_suggestions))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (idx),
                        ...{ class: "flex items-start text-sm text-amber-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-amber-800']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-amber-200']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-amber-800']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    (idx + 1);
                    (suggestion);
                    // @ts-ignore
                    [interpretResult, interpretResult,];
                }
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-8 space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-semibold text-slate-800 mb-3 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-article text-base text-amber-500 mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-article']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-amber-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm text-slate-700 leading-relaxed" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
            (__VLS_ctx.interpretResult.summary);
            if (__VLS_ctx.interpretResult.overall_assessment) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mt-3 p-3 bg-slate-50 rounded-lg" },
                });
                /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs font-medium text-slate-500 mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-slate-700" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                (__VLS_ctx.interpretResult.overall_assessment);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card overflow-hidden !p-0" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
            /** @type {__VLS_StyleScopedClasses['!p-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "bg-slate-50 p-4 border-b border-slate-100 font-medium text-slate-800 text-sm flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-list-dashes mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-list-dashes']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-slate-400" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            (__VLS_ctx.interpretResult.key_clauses?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 space-y-4 max-h-[70vh] overflow-y-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-[70vh]']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            for (const [clause, idx] of __VLS_vFor((__VLS_ctx.interpretResult.key_clauses))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: (['border-l-4 pl-4 p-4 rounded-r-lg', clause.risk_level === 'high' ? 'border-red-500 bg-red-50' : clause.risk_level === 'medium' ? 'border-amber-500 bg-amber-50' : 'border-green-500 bg-green-50']) },
                });
                /** @type {__VLS_StyleScopedClasses['border-l-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['pl-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-r-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center justify-between mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "font-semibold text-slate-800 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                (idx + 1);
                (clause.clause_title);
                if (clause.risk_level !== 'none') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: (['text-xs px-2 py-0.5 rounded', clause.risk_level === 'high' ? 'bg-red-100 text-red-700' : clause.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700']) },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                    (clause.risk_level === 'high' ? '高风险' : clause.risk_level === 'medium' ? '中风险' : '低风险');
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs font-medium text-slate-500 mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-quotes mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-quotes']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-slate-600 bg-white p-2 rounded border border-slate-100" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
                (clause.original_text);
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs font-medium text-amber-600 mb-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-lightbulb mr-1" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-lightbulb']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-sm text-slate-800" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                (clause.interpretation);
                if (clause.legal_significance) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs font-medium text-blue-600 mb-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-scales mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-scales']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm text-slate-600" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    (clause.legal_significance);
                }
                // @ts-ignore
                [interpretResult, interpretResult, interpretResult, interpretResult, interpretResult,];
            }
            if (!__VLS_ctx.interpretResult.key_clauses?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-center py-10 text-slate-400" },
                });
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-check-circle text-4xl mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-check-circle']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
            }
            if (__VLS_ctx.interpretResult.rights_obligations?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-slate-800 mb-3 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-users text-base text-blue-500 mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-users']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-blue-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-4" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
                for (const [ro, idx] of __VLS_vFor((__VLS_ctx.interpretResult.rights_obligations))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (idx),
                        ...{ class: "p-4 bg-slate-50 rounded-lg" },
                    });
                    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                        ...{ class: "font-semibold text-slate-800 text-sm mb-3" },
                    });
                    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                    (ro.party);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                    });
                    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs font-medium text-green-600 mb-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-green-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-shield-check mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-shield-check']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "space-y-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
                    for (const [right, ri] of __VLS_vFor((ro.rights))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            key: (ri),
                            ...{ class: "text-sm text-slate-700 flex items-start" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "w-1.5 h-1.5 rounded-full bg-green-500 mr-2 mt-1.5 flex-shrink-0" },
                        });
                        /** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-green-500']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                        (right);
                        // @ts-ignore
                        [interpretResult, interpretResult, interpretResult,];
                    }
                    if (!ro.rights?.length) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "text-xs text-slate-400" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    }
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs font-medium text-red-600 mb-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-hand mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-hand']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "space-y-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
                    for (const [obligation, oi] of __VLS_vFor((ro.obligations))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            key: (oi),
                            ...{ class: "text-sm text-slate-700 flex items-start" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "w-1.5 h-1.5 rounded-full bg-red-500 mr-2 mt-1.5 flex-shrink-0" },
                        });
                        /** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-red-500']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                        (obligation);
                        // @ts-ignore
                        [];
                    }
                    if (!ro.obligations?.length) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "text-xs text-slate-400" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    }
                    // @ts-ignore
                    [];
                }
            }
            if (__VLS_ctx.interpretResult.legal_terms?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-slate-800 mb-3 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-book-open text-base text-purple-500 mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-book-open']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-purple-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                });
                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
                for (const [term, idx] of __VLS_vFor((__VLS_ctx.interpretResult.legal_terms))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (idx),
                        ...{ class: "p-3 bg-purple-50 rounded-lg border border-purple-100" },
                    });
                    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-purple-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-purple-100']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "font-medium text-purple-900 text-sm" },
                    });
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-purple-900']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    (term.term);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-xs text-purple-700 mt-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-purple-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                    (term.definition);
                    // @ts-ignore
                    [interpretResult, interpretResult,];
                }
            }
        }
        if (__VLS_ctx.interpretStep === 5) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'doc-interpret'))
                            return;
                        if (!(__VLS_ctx.interpretStep === 5))
                            return;
                        __VLS_ctx.interpretStep = 1;
                        // @ts-ignore
                        [interpretStep, interpretStep,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'doc-interpret'))
                            return;
                        if (!(__VLS_ctx.interpretStep === 5))
                            return;
                        __VLS_ctx.loadInterpretHistory();
                        // @ts-ignore
                        [loadInterpretHistory,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrows-clockwise mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrows-clockwise']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            if (__VLS_ctx.isLoadingInterpretHistory) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card text-center py-10" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "spinner-lg mx-auto mb-4" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-500 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            }
            else if (!__VLS_ctx.interpretHistory.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card text-center py-16" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-clock-counter-clockwise text-5xl text-slate-200 mb-4" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-clock-counter-clockwise']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-5xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-200']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "text-lg font-medium text-slate-500 mb-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-400 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'doc-interpret'))
                                return;
                            if (!(__VLS_ctx.interpretStep === 5))
                                return;
                            if (!!(__VLS_ctx.isLoadingInterpretHistory))
                                return;
                            if (!(!__VLS_ctx.interpretHistory.length))
                                return;
                            __VLS_ctx.interpretStep = 1;
                            // @ts-ignore
                            [interpretStep, isLoadingInterpretHistory, interpretHistory,];
                        } },
                    ...{ class: "btn-primary text-sm mt-4" },
                    ...{ style: {} },
                });
                /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-plus mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-3" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
                for (const [record] of __VLS_vFor((__VLS_ctx.interpretHistory))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'doc-interpret'))
                                    return;
                                if (!(__VLS_ctx.interpretStep === 5))
                                    return;
                                if (!!(__VLS_ctx.isLoadingInterpretHistory))
                                    return;
                                if (!!(!__VLS_ctx.interpretHistory.length))
                                    return;
                                __VLS_ctx.viewInterpretDetail(record.id);
                                // @ts-ignore
                                [interpretHistory, viewInterpretDetail,];
                            } },
                        key: (record.id),
                        ...{ class: "card hover:shadow-md transition-shadow cursor-pointer" },
                    });
                    /** @type {__VLS_StyleScopedClasses['card']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:shadow-md']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition-shadow']} */ ;
                    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center justify-between" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center space-x-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "p-2.5 bg-amber-50 text-amber-600 rounded-lg" },
                    });
                    /** @type {__VLS_StyleScopedClasses['p-2.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-amber-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-book-open-text text-xl" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-book-open-text']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm font-medium text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (record.filename);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center space-x-2 mt-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-xs text-slate-400" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    (record.created_at);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded" },
                    });
                    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded']} */ ;
                    (record.document_type);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center space-x-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-right" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm font-medium text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (record.interpretation_score);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: (['text-xs', __VLS_ctx.difficultyStyle(record.difficulty_level).cls]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    (__VLS_ctx.difficultyStyle(record.difficulty_level).text);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'doc-interpret'))
                                    return;
                                if (!(__VLS_ctx.interpretStep === 5))
                                    return;
                                if (!!(__VLS_ctx.isLoadingInterpretHistory))
                                    return;
                                if (!!(!__VLS_ctx.interpretHistory.length))
                                    return;
                                __VLS_ctx.deleteInterpretRecord(record.id);
                                // @ts-ignore
                                [difficultyStyle, difficultyStyle, deleteInterpretRecord,];
                            } },
                        ...{ class: "p-2 text-slate-400 hover:text-red-500 transition-colors" },
                        title: "删除",
                    });
                    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-trash text-base" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-trash']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    // @ts-ignore
                    [];
                }
            }
        }
    }
    if (__VLS_ctx.currentView === 'contract-draft') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        if (__VLS_ctx.draftStep === 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-6" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
                ...{ class: "text-2xl font-bold text-slate-800 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-note-pencil text-2xl text-teal-600 mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-note-pencil']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            if (__VLS_ctx.isLoadingCategories) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-center py-16" },
                });
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "spinner-lg mx-auto mb-5" },
                });
                /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-500 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "draft-search-bar" },
                });
                /** @type {__VLS_StyleScopedClasses['draft-search-bar']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "draft-search-input-wrap" },
                });
                /** @type {__VLS_StyleScopedClasses['draft-search-input-wrap']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-magnifying-glass text-slate-400 text-base" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-magnifying-glass']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ onInput: (__VLS_ctx.handleDraftSearch) },
                    type: "text",
                    value: (__VLS_ctx.draftSearchKeyword),
                    placeholder: "搜索合同模板，如：买卖、租赁、劳动...",
                    ...{ class: "draft-search-input" },
                });
                /** @type {__VLS_StyleScopedClasses['draft-search-input']} */ ;
                if (__VLS_ctx.draftSearchKeyword) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (__VLS_ctx.clearDraftSearch) },
                        ...{ class: "draft-search-clear" },
                    });
                    /** @type {__VLS_StyleScopedClasses['draft-search-clear']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-x text-sm" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-x']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                }
                if (__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "draft-search-results" },
                    });
                    /** @type {__VLS_StyleScopedClasses['draft-search-results']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center justify-between mb-3" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-sm text-slate-500" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "font-semibold text-slate-800" },
                    });
                    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    (__VLS_ctx.draftSearchResults.length);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (__VLS_ctx.clearDraftSearch) },
                        ...{ class: "text-xs text-teal-600 hover:text-teal-700 font-medium" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-teal-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-teal-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "draft-template-grid" },
                    });
                    /** @type {__VLS_StyleScopedClasses['draft-template-grid']} */ ;
                    for (const [tpl] of __VLS_vFor((__VLS_ctx.draftSearchResults))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ onClick: (...[$event]) => {
                                    if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                        return;
                                    if (!(__VLS_ctx.currentView === 'contract-draft'))
                                        return;
                                    if (!(__VLS_ctx.draftStep === 1))
                                        return;
                                    if (!!(__VLS_ctx.isLoadingCategories))
                                        return;
                                    if (!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                        return;
                                    __VLS_ctx.loadAndSelectTemplate(tpl.id);
                                    // @ts-ignore
                                    [currentView, draftStep, isLoadingCategories, handleDraftSearch, draftSearchKeyword, draftSearchKeyword, draftSearchKeyword, clearDraftSearch, clearDraftSearch, draftSearchResults, draftSearchResults, draftSearchResults, loadAndSelectTemplate,];
                                } },
                            key: (tpl.id),
                            ...{ class: "draft-tpl-card" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-card']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-tpl-card-header" },
                            ...{ style: ({ background: __VLS_ctx.getCategoryGradient(tpl.category_id) }) },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-card-header']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: (['ph', __VLS_ctx.getCategoryIcon(tpl.category_id), 'text-2xl text-white/90']) },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-white/90']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                            ...{ onClick: (...[$event]) => {
                                    if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                        return;
                                    if (!(__VLS_ctx.currentView === 'contract-draft'))
                                        return;
                                    if (!(__VLS_ctx.draftStep === 1))
                                        return;
                                    if (!!(__VLS_ctx.isLoadingCategories))
                                        return;
                                    if (!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                        return;
                                    __VLS_ctx.toggleFavorite(tpl.id);
                                    // @ts-ignore
                                    [getCategoryGradient, getCategoryIcon, toggleFavorite,];
                                } },
                            ...{ class: (['draft-tpl-fav-btn', { 'is-fav': __VLS_ctx.draftFavorites.includes(tpl.id) }]) },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-fav-btn']} */ ;
                        /** @type {__VLS_StyleScopedClasses['is-fav']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: (__VLS_ctx.draftFavorites.includes(tpl.id) ? 'ph ph-star-fill' : 'ph ph-star') },
                            ...{ class: "text-sm" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-tpl-card-body" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-card-body']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "flex items-center gap-1.5 mb-1.5" },
                        });
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "draft-tpl-cat-badge" },
                            ...{ style: ({ background: __VLS_ctx.getCategoryBadgeBg(tpl.category_id), color: __VLS_ctx.getCategoryBadgeColor(tpl.category_id) }) },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-cat-badge']} */ ;
                        (__VLS_ctx.getCategoryName(tpl.category_id));
                        if (!tpl.is_system) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-custom-badge" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-custom-badge']} */ ;
                        }
                        __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                            ...{ class: "draft-tpl-card-title" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-card-title']} */ ;
                        (tpl.name);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "draft-tpl-card-desc" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-card-desc']} */ ;
                        (tpl.description);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-tpl-card-footer" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-card-footer']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "draft-tpl-field-count" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-field-count']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: "ph ph-textbox text-xs mr-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                        (tpl.field_count || tpl.fields?.length || '?');
                        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                            ...{ onClick: (...[$event]) => {
                                    if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                        return;
                                    if (!(__VLS_ctx.currentView === 'contract-draft'))
                                        return;
                                    if (!(__VLS_ctx.draftStep === 1))
                                        return;
                                    if (!!(__VLS_ctx.isLoadingCategories))
                                        return;
                                    if (!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                        return;
                                    __VLS_ctx.openPreview(tpl);
                                    // @ts-ignore
                                    [draftFavorites, draftFavorites, getCategoryBadgeBg, getCategoryBadgeColor, getCategoryName, openPreview,];
                                } },
                            ...{ class: "draft-tpl-preview-btn" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-tpl-preview-btn']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: "ph ph-eye text-xs mr-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['ph-eye']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                        // @ts-ignore
                        [];
                    }
                }
                else if (__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "draft-empty-state" },
                    });
                    /** @type {__VLS_StyleScopedClasses['draft-empty-state']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
                    /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-slate-100']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-magnifying-glass text-3xl text-slate-300" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-magnifying-glass']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-slate-500 text-sm mb-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                        ...{ class: "text-slate-400 text-xs" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "draft-cat-tabs" },
                    });
                    /** @type {__VLS_StyleScopedClasses['draft-cat-tabs']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'contract-draft'))
                                    return;
                                if (!(__VLS_ctx.draftStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingCategories))
                                    return;
                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                    return;
                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                    return;
                                __VLS_ctx.draftActiveCategory = 'all';
                                // @ts-ignore
                                [draftSearchKeyword, draftSearchResults, isSearchingTemplates, draftActiveCategory,];
                            } },
                        ...{ class: (['draft-cat-tab', { active: __VLS_ctx.draftActiveCategory === 'all' }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['draft-cat-tab']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-squares-four text-base mr-1.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-squares-four']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                    if (__VLS_ctx.totalTemplateCount) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600" },
                        });
                        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                        (__VLS_ctx.totalTemplateCount);
                    }
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'contract-draft'))
                                    return;
                                if (!(__VLS_ctx.draftStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingCategories))
                                    return;
                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                    return;
                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                    return;
                                __VLS_ctx.draftActiveCategory = 'favorites';
                                // @ts-ignore
                                [draftActiveCategory, draftActiveCategory, totalTemplateCount, totalTemplateCount,];
                            } },
                        ...{ class: (['draft-cat-tab', { active: __VLS_ctx.draftActiveCategory === 'favorites' }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['draft-cat-tab']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-star text-base mr-1.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-star']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                    if (__VLS_ctx.draftFavorites.length) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700" },
                        });
                        /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                        /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-amber-100']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
                        (__VLS_ctx.draftFavorites.length);
                    }
                    for (const [cat] of __VLS_vFor((__VLS_ctx.contractCategories))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                            ...{ onClick: (...[$event]) => {
                                    if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                        return;
                                    if (!(__VLS_ctx.currentView === 'contract-draft'))
                                        return;
                                    if (!(__VLS_ctx.draftStep === 1))
                                        return;
                                    if (!!(__VLS_ctx.isLoadingCategories))
                                        return;
                                    if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                        return;
                                    if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                        return;
                                    __VLS_ctx.draftActiveCategory = cat.id;
                                    // @ts-ignore
                                    [draftFavorites, draftFavorites, draftActiveCategory, draftActiveCategory, contractCategories,];
                                } },
                            key: (cat.id),
                            ...{ class: (['draft-cat-tab', { active: __VLS_ctx.draftActiveCategory === cat.id }]) },
                        });
                        /** @type {__VLS_StyleScopedClasses['active']} */ ;
                        /** @type {__VLS_StyleScopedClasses['draft-cat-tab']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: (['ph', cat.icon, 'text-base mr-1.5']) },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                        (cat.name);
                        // @ts-ignore
                        [draftActiveCategory,];
                    }
                    if (__VLS_ctx.draftActiveCategory === 'favorites') {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        if (__VLS_ctx.favoriteTemplates.length === 0) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-empty-state" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-empty-state']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4" },
                            });
                            /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
                            /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
                            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                            /** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
                            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-star text-3xl text-amber-300" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-star']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-amber-300']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                ...{ class: "text-slate-500 text-sm mb-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                ...{ class: "text-slate-400 text-xs" },
                            });
                            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        }
                        else {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-template-grid" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-template-grid']} */ ;
                            for (const [tpl] of __VLS_vFor((__VLS_ctx.favoriteTemplates))) {
                                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                    ...{ onClick: (...[$event]) => {
                                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                                return;
                                            if (!(__VLS_ctx.currentView === 'contract-draft'))
                                                return;
                                            if (!(__VLS_ctx.draftStep === 1))
                                                return;
                                            if (!!(__VLS_ctx.isLoadingCategories))
                                                return;
                                            if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                                return;
                                            if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                                return;
                                            if (!(__VLS_ctx.draftActiveCategory === 'favorites'))
                                                return;
                                            if (!!(__VLS_ctx.favoriteTemplates.length === 0))
                                                return;
                                            __VLS_ctx.loadAndSelectTemplate(tpl.id);
                                            // @ts-ignore
                                            [loadAndSelectTemplate, draftActiveCategory, favoriteTemplates, favoriteTemplates,];
                                        } },
                                    key: (tpl.id),
                                    ...{ class: "draft-tpl-card" },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-card']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                    ...{ class: "draft-tpl-card-header" },
                                    ...{ style: ({ background: __VLS_ctx.getCategoryGradient(tpl.category_id) }) },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-card-header']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                    ...{ class: (['ph', __VLS_ctx.getCategoryIcon(tpl.category_id), 'text-2xl text-white/90']) },
                                });
                                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                                /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
                                /** @type {__VLS_StyleScopedClasses['text-white/90']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                    ...{ onClick: (...[$event]) => {
                                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                                return;
                                            if (!(__VLS_ctx.currentView === 'contract-draft'))
                                                return;
                                            if (!(__VLS_ctx.draftStep === 1))
                                                return;
                                            if (!!(__VLS_ctx.isLoadingCategories))
                                                return;
                                            if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                                return;
                                            if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                                return;
                                            if (!(__VLS_ctx.draftActiveCategory === 'favorites'))
                                                return;
                                            if (!!(__VLS_ctx.favoriteTemplates.length === 0))
                                                return;
                                            __VLS_ctx.toggleFavorite(tpl.id);
                                            // @ts-ignore
                                            [getCategoryGradient, getCategoryIcon, toggleFavorite,];
                                        } },
                                    ...{ class: "draft-tpl-fav-btn is-fav" },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-fav-btn']} */ ;
                                /** @type {__VLS_StyleScopedClasses['is-fav']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                    ...{ class: "ph ph-star-fill text-sm" },
                                });
                                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                                /** @type {__VLS_StyleScopedClasses['ph-star-fill']} */ ;
                                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                    ...{ class: "draft-tpl-card-body" },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-card-body']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                    ...{ class: "flex items-center gap-1.5 mb-1.5" },
                                });
                                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                                /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                                /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                    ...{ class: "draft-tpl-cat-badge" },
                                    ...{ style: ({ background: __VLS_ctx.getCategoryBadgeBg(tpl.category_id), color: __VLS_ctx.getCategoryBadgeColor(tpl.category_id) }) },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-cat-badge']} */ ;
                                (__VLS_ctx.getCategoryName(tpl.category_id));
                                if (!tpl.is_system) {
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                        ...{ class: "draft-tpl-custom-badge" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-custom-badge']} */ ;
                                }
                                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                                    ...{ class: "draft-tpl-card-title" },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-card-title']} */ ;
                                (tpl.name);
                                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                    ...{ class: "draft-tpl-card-desc" },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-card-desc']} */ ;
                                (tpl.description);
                                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                    ...{ class: "draft-tpl-card-footer" },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-card-footer']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                    ...{ class: "draft-tpl-field-count" },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-field-count']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                    ...{ class: "ph ph-textbox text-xs mr-1" },
                                });
                                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                                /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                                (tpl.field_count || 0);
                                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                    ...{ onClick: (...[$event]) => {
                                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                                return;
                                            if (!(__VLS_ctx.currentView === 'contract-draft'))
                                                return;
                                            if (!(__VLS_ctx.draftStep === 1))
                                                return;
                                            if (!!(__VLS_ctx.isLoadingCategories))
                                                return;
                                            if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                                return;
                                            if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                                return;
                                            if (!(__VLS_ctx.draftActiveCategory === 'favorites'))
                                                return;
                                            if (!!(__VLS_ctx.favoriteTemplates.length === 0))
                                                return;
                                            __VLS_ctx.openPreview(tpl);
                                            // @ts-ignore
                                            [getCategoryBadgeBg, getCategoryBadgeColor, getCategoryName, openPreview,];
                                        } },
                                    ...{ class: "draft-tpl-preview-btn" },
                                });
                                /** @type {__VLS_StyleScopedClasses['draft-tpl-preview-btn']} */ ;
                                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                    ...{ class: "ph ph-eye text-xs mr-1" },
                                });
                                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                                /** @type {__VLS_StyleScopedClasses['ph-eye']} */ ;
                                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                                /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                                // @ts-ignore
                                [];
                            }
                        }
                    }
                    else {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        for (const [cat] of __VLS_vFor((__VLS_ctx.displayedCategories))) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                key: (cat.id),
                                ...{ class: "draft-category-section" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-category-section']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-category-header" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-category-header']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-category-icon" },
                                ...{ style: ({ background: __VLS_ctx.getCategoryGradient(cat.id) }) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-category-icon']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: (['ph', cat.icon, 'text-lg text-white']) },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "flex-1 min-w-0" },
                            });
                            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                                ...{ class: "text-base font-bold text-slate-800" },
                            });
                            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                            (cat.name);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                ...{ class: "text-xs text-slate-400 mt-0.5" },
                            });
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                            (cat.description);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-category-count" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-category-count']} */ ;
                            (cat.template_count);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-template-grid" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-template-grid']} */ ;
                            for (const [sub] of __VLS_vFor((cat.subcategories))) {
                                (sub.id);
                                for (const [tpl] of __VLS_vFor((sub.templates || []))) {
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                        ...{ onClick: (...[$event]) => {
                                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                                    return;
                                                if (!(__VLS_ctx.currentView === 'contract-draft'))
                                                    return;
                                                if (!(__VLS_ctx.draftStep === 1))
                                                    return;
                                                if (!!(__VLS_ctx.isLoadingCategories))
                                                    return;
                                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                                    return;
                                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                                    return;
                                                if (!!(__VLS_ctx.draftActiveCategory === 'favorites'))
                                                    return;
                                                __VLS_ctx.loadAndSelectTemplate(tpl.id);
                                                // @ts-ignore
                                                [loadAndSelectTemplate, getCategoryGradient, displayedCategories,];
                                            } },
                                        key: (tpl.id),
                                        ...{ class: "draft-tpl-card" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-card']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                        ...{ class: "draft-tpl-card-header" },
                                        ...{ style: ({ background: __VLS_ctx.getCategoryGradient(cat.id) }) },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-card-header']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                        ...{ class: (['ph', sub.icon, 'text-2xl text-white/90']) },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['text-white/90']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                        ...{ onClick: (...[$event]) => {
                                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                                    return;
                                                if (!(__VLS_ctx.currentView === 'contract-draft'))
                                                    return;
                                                if (!(__VLS_ctx.draftStep === 1))
                                                    return;
                                                if (!!(__VLS_ctx.isLoadingCategories))
                                                    return;
                                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                                    return;
                                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                                    return;
                                                if (!!(__VLS_ctx.draftActiveCategory === 'favorites'))
                                                    return;
                                                __VLS_ctx.toggleFavorite(tpl.id);
                                                // @ts-ignore
                                                [getCategoryGradient, toggleFavorite,];
                                            } },
                                        ...{ class: (['draft-tpl-fav-btn', { 'is-fav': __VLS_ctx.draftFavorites.includes(tpl.id) }]) },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-fav-btn']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['is-fav']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                        ...{ class: (__VLS_ctx.draftFavorites.includes(tpl.id) ? 'ph ph-star-fill' : 'ph ph-star') },
                                        ...{ class: "text-sm" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                        ...{ class: "draft-tpl-card-body" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-card-body']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                        ...{ class: "flex items-center gap-1.5 mb-1.5" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                        ...{ class: "draft-tpl-cat-badge" },
                                        ...{ style: ({ background: __VLS_ctx.getCategoryBadgeBg(cat.id), color: __VLS_ctx.getCategoryBadgeColor(cat.id) }) },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-cat-badge']} */ ;
                                    (sub.name);
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                                        ...{ class: "draft-tpl-card-title" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-card-title']} */ ;
                                    (tpl.name);
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                        ...{ class: "draft-tpl-card-desc" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-card-desc']} */ ;
                                    (tpl.description);
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                        ...{ class: "draft-tpl-card-footer" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-card-footer']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                        ...{ class: "draft-tpl-field-count" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-field-count']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                        ...{ class: "ph ph-textbox text-xs mr-1" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                                    (tpl.field_count || 0);
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                        ...{ onClick: (...[$event]) => {
                                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                                    return;
                                                if (!(__VLS_ctx.currentView === 'contract-draft'))
                                                    return;
                                                if (!(__VLS_ctx.draftStep === 1))
                                                    return;
                                                if (!!(__VLS_ctx.isLoadingCategories))
                                                    return;
                                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                                    return;
                                                if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                                    return;
                                                if (!!(__VLS_ctx.draftActiveCategory === 'favorites'))
                                                    return;
                                                __VLS_ctx.openPreview(tpl);
                                                // @ts-ignore
                                                [draftFavorites, draftFavorites, getCategoryBadgeBg, getCategoryBadgeColor, openPreview,];
                                            } },
                                        ...{ class: "draft-tpl-preview-btn" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['draft-tpl-preview-btn']} */ ;
                                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                        ...{ class: "ph ph-eye text-xs mr-1" },
                                    });
                                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['ph-eye']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                                    // @ts-ignore
                                    [];
                                }
                                // @ts-ignore
                                [];
                            }
                            // @ts-ignore
                            [];
                        }
                    }
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "mt-8 pt-6 border-t border-slate-100" },
                    });
                    /** @type {__VLS_StyleScopedClasses['mt-8']} */ ;
                    /** @type {__VLS_StyleScopedClasses['pt-6']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
                    /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center justify-between mb-4" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                        ...{ class: "text-sm font-semibold text-slate-600 flex items-center" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-folder-open text-base mr-1.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-folder-open']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (__VLS_ctx.openCreateTemplateForm) },
                        ...{ class: "text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-teal-600']} */ ;
                    /** @type {__VLS_StyleScopedClasses['hover:text-teal-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-plus text-sm mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    if (__VLS_ctx.userTemplates.length === 0) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "text-center py-6 text-slate-400 text-sm" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['py-6']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: "ph ph-folder-open text-3xl text-slate-200 mb-2 block" },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['ph-folder-open']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-200']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['block']} */ ;
                    }
                    else {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-template-grid" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-template-grid']} */ ;
                        for (const [ut] of __VLS_vFor((__VLS_ctx.userTemplates))) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                                            return;
                                        if (!(__VLS_ctx.draftStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingCategories))
                                            return;
                                        if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                            return;
                                        if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                            return;
                                        if (!!(__VLS_ctx.userTemplates.length === 0))
                                            return;
                                        __VLS_ctx.selectDraftTemplate(ut);
                                        // @ts-ignore
                                        [openCreateTemplateForm, userTemplates, userTemplates, selectDraftTemplate,];
                                    } },
                                key: (ut.id),
                                ...{ class: "draft-tpl-card draft-tpl-card-custom" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card']} */ ;
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-custom']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-header" },
                                ...{ style: {} },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-header']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-user-circle text-2xl text-white/90" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-user-circle']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-white/90']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "flex items-center gap-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                            /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                                            return;
                                        if (!(__VLS_ctx.draftStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingCategories))
                                            return;
                                        if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                            return;
                                        if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                            return;
                                        if (!!(__VLS_ctx.userTemplates.length === 0))
                                            return;
                                        __VLS_ctx.editUserTemplate(ut);
                                        // @ts-ignore
                                        [editUserTemplate,];
                                    } },
                                ...{ class: "draft-tpl-action-btn" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-action-btn']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-pencil text-xs" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-pencil']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                                            return;
                                        if (!(__VLS_ctx.draftStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingCategories))
                                            return;
                                        if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                            return;
                                        if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                            return;
                                        if (!!(__VLS_ctx.userTemplates.length === 0))
                                            return;
                                        __VLS_ctx.deleteUserTemplate(ut.id);
                                        // @ts-ignore
                                        [deleteUserTemplate,];
                                    } },
                                ...{ class: "draft-tpl-action-btn" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-action-btn']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-trash text-xs" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-trash']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-body" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-body']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "flex items-center gap-1.5 mb-1.5" },
                            });
                            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                            /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-custom-badge" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-custom-badge']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                                ...{ class: "draft-tpl-card-title" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-title']} */ ;
                            (ut.name);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                ...{ class: "draft-tpl-card-desc" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-desc']} */ ;
                            (ut.description || '自定义合同模板');
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-footer" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-footer']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-field-count" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-field-count']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-textbox text-xs mr-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                            (ut.fields?.length || 0);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                                            return;
                                        if (!(__VLS_ctx.draftStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingCategories))
                                            return;
                                        if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length > 0))
                                            return;
                                        if (!!(__VLS_ctx.draftSearchKeyword && __VLS_ctx.draftSearchResults.length === 0 && !__VLS_ctx.isSearchingTemplates))
                                            return;
                                        if (!!(__VLS_ctx.userTemplates.length === 0))
                                            return;
                                        __VLS_ctx.openPreview(ut);
                                        // @ts-ignore
                                        [openPreview,];
                                    } },
                                ...{ class: "draft-tpl-preview-btn" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-preview-btn']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-eye text-xs mr-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-eye']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                            // @ts-ignore
                            [];
                        }
                    }
                }
            }
        }
        if (__VLS_ctx.showPreviewModal) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.showPreviewModal))
                            return;
                        __VLS_ctx.showPreviewModal = false;
                        // @ts-ignore
                        [showPreviewModal, showPreviewModal,];
                    } },
                ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
            /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-black/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['backdrop-blur-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-fade-in" },
            });
            /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-[85vh]']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
            /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "preview-modal-header" },
                ...{ style: ({ background: __VLS_ctx.getCategoryGradient(__VLS_ctx.previewTemplate?.category_id || '') }) },
            });
            /** @type {__VLS_StyleScopedClasses['preview-modal-header']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center gap-3 flex-1 min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['w-10']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-10']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-white/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: (['ph', __VLS_ctx.getCategoryIcon(__VLS_ctx.previewTemplate?.category_id || ''), 'text-xl text-white']) },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "min-w-0" },
            });
            /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-lg font-bold text-white truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (__VLS_ctx.previewTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-white/70 text-xs mt-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['text-white/70']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            (__VLS_ctx.getCategoryName(__VLS_ctx.previewTemplate?.category_id));
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.showPreviewModal))
                            return;
                        __VLS_ctx.showPreviewModal = false;
                        // @ts-ignore
                        [getCategoryGradient, getCategoryIcon, getCategoryName, showPreviewModal, previewTemplate, previewTemplate, previewTemplate, previewTemplate,];
                    } },
                ...{ class: "w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-8']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-white/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-white/30']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-x text-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-x']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex-1 overflow-y-auto p-6 space-y-5" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-600 text-sm leading-relaxed" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
            (__VLS_ctx.previewTemplate?.description);
            if (__VLS_ctx.previewTemplate?.outline_sections?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "text-sm font-semibold text-slate-800 mb-2 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-list text-base mr-1.5 text-teal-500" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-list']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-teal-500']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                });
                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                for (const [section, idx] of __VLS_vFor((__VLS_ctx.previewTemplate.outline_sections))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (idx),
                        ...{ class: "flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center flex-shrink-0 font-medium" },
                    });
                    /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-teal-100']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-teal-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    (idx + 1);
                    (section);
                    // @ts-ignore
                    [previewTemplate, previewTemplate, previewTemplate,];
                }
            }
            if (__VLS_ctx.previewTemplate?.fields?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "text-sm font-semibold text-slate-800 mb-2 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-textbox text-base mr-1.5 text-blue-500" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-blue-500']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex flex-wrap gap-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                for (const [field] of __VLS_vFor((__VLS_ctx.previewTemplate.fields))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        key: (field.key),
                        ...{ class: "inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium" },
                    });
                    /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                    (field.label);
                    if (field.required) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: "ph ph-asterisk text-red-400" },
                            ...{ style: {} },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['ph-asterisk']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-red-400']} */ ;
                    }
                    // @ts-ignore
                    [previewTemplate, previewTemplate,];
                }
            }
            if (__VLS_ctx.previewTemplate?.law_references?.length) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "text-sm font-semibold text-slate-800 mb-2 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-book-open text-base mr-1.5 text-indigo-500" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-book-open']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-indigo-500']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "space-y-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
                for (const [ref] of __VLS_vFor((__VLS_ctx.previewTemplate.law_references))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        key: (ref),
                        ...{ class: "flex items-center gap-2 text-sm text-slate-600" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-bookmark text-indigo-400 text-xs flex-shrink-0" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-bookmark']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-indigo-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                    (ref);
                    // @ts-ignore
                    [previewTemplate, previewTemplate,];
                }
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50/50']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.showPreviewModal))
                            return;
                        __VLS_ctx.toggleFavorite(__VLS_ctx.previewTemplate?.id);
                        // @ts-ignore
                        [toggleFavorite, previewTemplate,];
                    } },
                ...{ class: (['flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors', __VLS_ctx.draftFavorites.includes(__VLS_ctx.previewTemplate?.id) ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200']) },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: (__VLS_ctx.draftFavorites.includes(__VLS_ctx.previewTemplate?.id) ? 'ph ph-star-fill' : 'ph ph-star') },
                ...{ class: "text-base" },
            });
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            (__VLS_ctx.draftFavorites.includes(__VLS_ctx.previewTemplate?.id) ? '已收藏' : '收藏');
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.startDraftFromPreview) },
                ...{ class: "btn-primary text-sm px-6" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-note-pencil mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-note-pencil']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
        }
        if (__VLS_ctx.showCreateTemplateForm) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.showCreateTemplateForm))
                            return;
                        __VLS_ctx.showCreateTemplateForm = false;
                        // @ts-ignore
                        [draftFavorites, draftFavorites, draftFavorites, previewTemplate, previewTemplate, previewTemplate, startDraftFromPreview, showCreateTemplateForm, showCreateTemplateForm,];
                    } },
                ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/40" },
            });
            /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
            /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-black/40']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['shadow-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-w-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-[85vh]']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 border-b border-slate-100 flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "text-lg font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.showCreateTemplateForm))
                            return;
                        __VLS_ctx.showCreateTemplateForm = false;
                        // @ts-ignore
                        [showCreateTemplateForm,];
                    } },
                ...{ class: "p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" },
            });
            /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-x text-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-x']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 space-y-4" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-red-400" },
            });
            /** @type {__VLS_StyleScopedClasses['text-red-400']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "text",
                value: (__VLS_ctx.newTemplateForm.name),
                placeholder: "如：技术服务合同",
                ...{ class: "form-input text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                value: (__VLS_ctx.newTemplateForm.description),
                placeholder: "简要描述模板适用场景",
                rows: "2",
                ...{ class: "form-input text-sm resize-none" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['resize-none']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-2 gap-3" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                value: (__VLS_ctx.newTemplateForm.category_id),
                ...{ class: "form-input text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                value: "",
            });
            for (const [cat] of __VLS_vFor((__VLS_ctx.contractCategories))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    key: (cat.id),
                    value: (cat.id),
                });
                (cat.name);
                // @ts-ignore
                [contractCategories, newTemplateForm, newTemplateForm, newTemplateForm,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                value: (__VLS_ctx.newTemplateForm.subcategory_id),
                ...{ class: "form-input text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                value: "",
            });
            for (const [sub] of __VLS_vFor((__VLS_ctx.getSubcategoriesForCategory(__VLS_ctx.newTemplateForm.category_id)))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    key: (sub.id),
                    value: (sub.id),
                });
                (sub.name);
                // @ts-ignore
                [newTemplateForm, newTemplateForm, getSubcategoriesForCategory,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-slate-400 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            for (const [f, idx] of __VLS_vFor((__VLS_ctx.newTemplateForm.fields))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: "flex items-center space-x-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    type: "text",
                    value: (f.label),
                    placeholder: (`字段 ${idx + 1}`),
                    ...{ class: "form-input text-sm flex-1" },
                });
                /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'contract-draft'))
                                return;
                            if (!(__VLS_ctx.showCreateTemplateForm))
                                return;
                            __VLS_ctx.newTemplateForm.fields.splice(idx, 1);
                            // @ts-ignore
                            [newTemplateForm, newTemplateForm,];
                        } },
                    ...{ class: "p-1.5 text-slate-400 hover:text-red-500" },
                });
                /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-minus text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-minus']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.showCreateTemplateForm))
                            return;
                        __VLS_ctx.newTemplateForm.fields.push({ label: '', field_type: 'text', required: true });
                        // @ts-ignore
                        [newTemplateForm,];
                    } },
                ...{ class: "text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:text-teal-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-plus text-sm mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-slate-400 mb-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            for (const [s, idx] of __VLS_vFor((__VLS_ctx.newTemplateForm.outline_sections))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: "flex items-center space-x-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    type: "text",
                    value: (__VLS_ctx.newTemplateForm.outline_sections[idx]),
                    placeholder: (`章节 ${idx + 1}`),
                    ...{ class: "form-input text-sm flex-1" },
                });
                /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'contract-draft'))
                                return;
                            if (!(__VLS_ctx.showCreateTemplateForm))
                                return;
                            __VLS_ctx.newTemplateForm.outline_sections.splice(idx, 1);
                            // @ts-ignore
                            [newTemplateForm, newTemplateForm, newTemplateForm,];
                        } },
                    ...{ class: "p-1.5 text-slate-400 hover:text-red-500" },
                });
                /** @type {__VLS_StyleScopedClasses['p-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-minus text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-minus']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.showCreateTemplateForm))
                            return;
                        __VLS_ctx.newTemplateForm.outline_sections.push('');
                        // @ts-ignore
                        [newTemplateForm,];
                    } },
                ...{ class: "text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:text-teal-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-plus text-sm mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 border-t border-slate-100 flex justify-end space-x-3" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.showCreateTemplateForm))
                            return;
                        __VLS_ctx.showCreateTemplateForm = false;
                        // @ts-ignore
                        [showCreateTemplateForm,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleCreateUserTemplate) },
                disabled: (!__VLS_ctx.newTemplateForm.name.trim() || __VLS_ctx.isCreatingTemplate),
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            if (__VLS_ctx.isCreatingTemplate) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-spinner animate-spin mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-spinner']} */ ;
                /** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            (__VLS_ctx.isCreatingTemplate ? '创建中...' : '创建模板');
        }
        if (__VLS_ctx.draftStep === 2) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "max-w-4xl mx-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2 mb-6" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.draftStep === 2))
                            return;
                        __VLS_ctx.draftStep = 1;
                        // @ts-ignore
                        [draftStep, draftStep, newTemplateForm, handleCreateUserTemplate, isCreatingTemplate, isCreatingTemplate, isCreatingTemplate,];
                    } },
                ...{ class: "p-2 rounded-lg hover:bg-slate-100 text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left text-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
                ...{ class: "text-xl font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.selectedTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.selectedTemplate?.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-t-xl']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-4 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center text-teal-600 font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center" },
                ...{ class: (__VLS_ctx.draftStep >= 3 ? 'text-teal-600 font-medium' : 'text-slate-400') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full text-xs flex items-center justify-center mr-1.5" },
                ...{ class: (__VLS_ctx.draftStep >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500') },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center" },
                ...{ class: (__VLS_ctx.draftStep >= 4 ? 'text-teal-600 font-medium' : 'text-slate-400') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full text-xs flex items-center justify-center mr-1.5" },
                ...{ class: (__VLS_ctx.draftStep >= 4 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500') },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 space-y-4" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            for (const [field] of __VLS_vFor((__VLS_ctx.selectedTemplate?.fields || []))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (field.key),
                    ...{ class: "grid grid-cols-1 sm:grid-cols-12 gap-2 items-start" },
                });
                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['sm:grid-cols-12']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "sm:col-span-3" },
                });
                /** @type {__VLS_StyleScopedClasses['sm:col-span-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                    ...{ class: "form-label !mb-0 sm:pt-2" },
                });
                /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
                /** @type {__VLS_StyleScopedClasses['!mb-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['sm:pt-2']} */ ;
                (field.label);
                if (field.required) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-red-400 ml-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-red-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "sm:col-span-9" },
                });
                /** @type {__VLS_StyleScopedClasses['sm:col-span-9']} */ ;
                if (field.options && field.options.length > 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                        value: (__VLS_ctx.draftElements[field.key]),
                        ...{ class: "form-input text-sm" },
                    });
                    /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                        value: "",
                    });
                    for (const [opt] of __VLS_vFor((field.options))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                            key: (opt),
                            value: (opt),
                        });
                        (opt);
                        // @ts-ignore
                        [draftStep, draftStep, draftStep, draftStep, selectedTemplate, selectedTemplate, selectedTemplate, draftElements,];
                    }
                }
                else if (field.field_type === 'textarea') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                        value: (__VLS_ctx.draftElements[field.key]),
                        placeholder: (field.placeholder),
                        rows: "3",
                        ...{ class: "form-input text-sm resize-none" },
                    });
                    /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['resize-none']} */ ;
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                        type: (field.field_type === 'number' ? 'number' : 'text'),
                        placeholder: (field.placeholder),
                        ...{ class: "form-input text-sm" },
                    });
                    (__VLS_ctx.draftElements[field.key]);
                    /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                }
                // @ts-ignore
                [draftElements, draftElements,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-t border-slate-100 flex justify-end space-x-3" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.draftStep === 2))
                            return;
                        __VLS_ctx.draftStep = 1;
                        // @ts-ignore
                        [draftStep,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleGenerateOutline) },
                disabled: (__VLS_ctx.isGeneratingOutline || !__VLS_ctx.hasRequiredFields),
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            if (__VLS_ctx.isGeneratingOutline) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-spinner animate-spin mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-spinner']} */ ;
                /** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-list-magnifying-glass mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-list-magnifying-glass']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            (__VLS_ctx.isGeneratingOutline ? '生成中...' : '生成大纲');
        }
        if (__VLS_ctx.draftStep === 3) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "max-w-4xl mx-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2 mb-6" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.draftStep === 3))
                            return;
                        __VLS_ctx.draftStep = 2;
                        // @ts-ignore
                        [draftStep, draftStep, handleGenerateOutline, isGeneratingOutline, isGeneratingOutline, isGeneratingOutline, hasRequiredFields,];
                    } },
                ...{ class: "p-2 rounded-lg hover:bg-slate-100 text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left text-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
                ...{ class: "text-xl font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.selectedTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-t-xl']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-4 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center text-teal-600 font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center text-teal-600 font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-teal-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center text-slate-400" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-blue-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-info text-sm mr-2 mt-0.5 flex-shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-info']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                value: (__VLS_ctx.draftOutline),
                rows: "20",
                ...{ class: "form-input text-sm resize-y font-serif leading-relaxed" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['resize-y']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-serif']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-t border-slate-100 flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.draftStep === 3))
                            return;
                        __VLS_ctx.draftStep = 2;
                        // @ts-ignore
                        [draftStep, selectedTemplate, draftOutline,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleGenerateContract) },
                disabled: (__VLS_ctx.isGeneratingContract),
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            if (__VLS_ctx.isGeneratingContract) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-spinner animate-spin mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-spinner']} */ ;
                /** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-file-text mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-file-text']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            (__VLS_ctx.isGeneratingContract ? 'AI 正在起草合同...' : '生成合同');
        }
        if (__VLS_ctx.draftStep === 4) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "max-w-5xl mx-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['max-w-5xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2 mb-6" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'contract-draft'))
                            return;
                        if (!(__VLS_ctx.draftStep === 4))
                            return;
                        __VLS_ctx.draftStep = 3;
                        // @ts-ignore
                        [draftStep, draftStep, handleGenerateContract, isGeneratingContract, isGeneratingContract, isGeneratingContract,];
                    } },
                ...{ class: "p-2 rounded-lg hover:bg-slate-100 text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left text-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
                ...{ class: "text-xl font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.selectedTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 lg:grid-cols-12 gap-5" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['lg:grid-cols-12']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-8" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-8']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card !p-0 overflow-hidden" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['!p-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-800 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleContractQualityCheck) },
                disabled: (__VLS_ctx.isCheckingQuality),
                ...{ class: "px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center text-xs border border-green-200" },
            });
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-green-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-green-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-green-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-green-200']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: (__VLS_ctx.isCheckingQuality ? 'ph ph-spinner animate-spin' : 'ph ph-check-circle') },
                ...{ class: "text-sm mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleExportContract) },
                ...{ class: "px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center text-xs border border-slate-200" },
            });
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-download-simple text-sm mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-download-simple']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-6 max-h-[65vh] overflow-y-auto whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-[65vh]']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-serif']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.generatedContractText);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-4 space-y-4" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            if (__VLS_ctx.contractQualityResult) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "font-semibold text-sm mb-2" },
                    ...{ class: (__VLS_ctx.contractQualityResult.is_qualified ? 'text-green-600' : 'text-orange-600') },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                (__VLS_ctx.contractQualityResult.is_qualified ? '✓ 文书质量合格' : '⚠ 文书存在以下问题');
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-600 whitespace-pre-wrap text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (__VLS_ctx.contractQualityResult.quality_check);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "font-semibold text-slate-800 text-sm mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-2 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-700" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            (__VLS_ctx.selectedTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-700" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            (__VLS_ctx.getCategoryName(__VLS_ctx.selectedTemplate?.category_id));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-700" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            (__VLS_ctx.selectedTemplate?.law_references?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "font-semibold text-slate-800 text-sm mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
            for (const [ref] of __VLS_vFor(((__VLS_ctx.selectedTemplate?.law_references || [])))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (ref),
                    ...{ class: "text-xs text-slate-600 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-book-open text-slate-400 mr-1.5 flex-shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-book-open']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                (ref);
                // @ts-ignore
                [getCategoryName, selectedTemplate, selectedTemplate, selectedTemplate, selectedTemplate, selectedTemplate, handleContractQualityCheck, isCheckingQuality, isCheckingQuality, handleExportContract, generatedContractText, contractQualityResult, contractQualityResult, contractQualityResult, contractQualityResult,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.resetDraft) },
                ...{ class: "btn-outline w-full text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-counter-clockwise mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-counter-clockwise']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
        }
    }
    if (__VLS_ctx.currentView === 'docgen') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        if (__VLS_ctx.docStep === 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-6" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
                ...{ class: "text-2xl font-bold text-slate-800 flex items-center" },
            });
            /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-file-text text-2xl text-blue-600 mr-2" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-file-text']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            if (__VLS_ctx.isLoadingDocCategories) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-center py-16" },
                });
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-16']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "spinner-lg mx-auto mb-5" },
                });
                /** @type {__VLS_StyleScopedClasses['spinner-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-500 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "draft-cat-tabs" },
                });
                /** @type {__VLS_StyleScopedClasses['draft-cat-tabs']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'docgen'))
                                return;
                            if (!(__VLS_ctx.docStep === 1))
                                return;
                            if (!!(__VLS_ctx.isLoadingDocCategories))
                                return;
                            __VLS_ctx.docActiveCategory = 'all';
                            // @ts-ignore
                            [currentView, resetDraft, docStep, isLoadingDocCategories, docActiveCategory,];
                        } },
                    ...{ class: (['draft-cat-tab', { active: __VLS_ctx.docActiveCategory === 'all' }]) },
                });
                /** @type {__VLS_StyleScopedClasses['active']} */ ;
                /** @type {__VLS_StyleScopedClasses['draft-cat-tab']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-squares-four text-base mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-squares-four']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                if (__VLS_ctx.totalDocTemplateCount) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    (__VLS_ctx.totalDocTemplateCount);
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'docgen'))
                                return;
                            if (!(__VLS_ctx.docStep === 1))
                                return;
                            if (!!(__VLS_ctx.isLoadingDocCategories))
                                return;
                            __VLS_ctx.docActiveCategory = 'recent';
                            // @ts-ignore
                            [docActiveCategory, docActiveCategory, totalDocTemplateCount, totalDocTemplateCount,];
                        } },
                    ...{ class: (['draft-cat-tab', { active: __VLS_ctx.docActiveCategory === 'recent' }]) },
                });
                /** @type {__VLS_StyleScopedClasses['active']} */ ;
                /** @type {__VLS_StyleScopedClasses['draft-cat-tab']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-clock-counter-clockwise text-base mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-clock-counter-clockwise']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                if (__VLS_ctx.docRecentUsed.length) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-blue-100']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
                    (__VLS_ctx.docRecentUsed.length);
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'docgen'))
                                return;
                            if (!(__VLS_ctx.docStep === 1))
                                return;
                            if (!!(__VLS_ctx.isLoadingDocCategories))
                                return;
                            __VLS_ctx.docActiveCategory = 'favorites';
                            // @ts-ignore
                            [docActiveCategory, docActiveCategory, docRecentUsed, docRecentUsed,];
                        } },
                    ...{ class: (['draft-cat-tab', { active: __VLS_ctx.docActiveCategory === 'favorites' }]) },
                });
                /** @type {__VLS_StyleScopedClasses['active']} */ ;
                /** @type {__VLS_StyleScopedClasses['draft-cat-tab']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-star text-base mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-star']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                if (__VLS_ctx.docFavorites.length) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-amber-100']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
                    (__VLS_ctx.docFavorites.length);
                }
                for (const [cat] of __VLS_vFor((__VLS_ctx.docCategories))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'docgen'))
                                    return;
                                if (!(__VLS_ctx.docStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingDocCategories))
                                    return;
                                __VLS_ctx.docActiveCategory = cat.id;
                                // @ts-ignore
                                [docActiveCategory, docActiveCategory, docFavorites, docFavorites, docCategories,];
                            } },
                        key: (cat.id),
                        ...{ class: (['draft-cat-tab', { active: __VLS_ctx.docActiveCategory === cat.id }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['draft-cat-tab']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: (['ph', cat.icon, 'text-base mr-1.5']) },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                    (cat.name);
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['px-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                    /** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                    (cat.template_count);
                    // @ts-ignore
                    [docActiveCategory,];
                }
                if (__VLS_ctx.docActiveCategory === 'all') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "mb-5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex items-center gap-2 flex-wrap" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-xs text-slate-400 mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'docgen'))
                                    return;
                                if (!(__VLS_ctx.docStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingDocCategories))
                                    return;
                                if (!(__VLS_ctx.docActiveCategory === 'all'))
                                    return;
                                __VLS_ctx.docUsageFilter = '';
                                // @ts-ignore
                                [docActiveCategory, docUsageFilter,];
                            } },
                        ...{ class: (['doc-usage-chip', { active: __VLS_ctx.docUsageFilter === '' }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['doc-usage-chip']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'docgen'))
                                    return;
                                if (!(__VLS_ctx.docStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingDocCategories))
                                    return;
                                if (!(__VLS_ctx.docActiveCategory === 'all'))
                                    return;
                                __VLS_ctx.docUsageFilter = '诉讼';
                                // @ts-ignore
                                [docUsageFilter, docUsageFilter,];
                            } },
                        ...{ class: (['doc-usage-chip', { active: __VLS_ctx.docUsageFilter === '诉讼' }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['doc-usage-chip']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-scales text-xs mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-scales']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'docgen'))
                                    return;
                                if (!(__VLS_ctx.docStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingDocCategories))
                                    return;
                                if (!(__VLS_ctx.docActiveCategory === 'all'))
                                    return;
                                __VLS_ctx.docUsageFilter = '非诉';
                                // @ts-ignore
                                [docUsageFilter, docUsageFilter,];
                            } },
                        ...{ class: (['doc-usage-chip', { active: __VLS_ctx.docUsageFilter === '非诉' }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['doc-usage-chip']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-handshake text-xs mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-handshake']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'docgen'))
                                    return;
                                if (!(__VLS_ctx.docStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingDocCategories))
                                    return;
                                if (!(__VLS_ctx.docActiveCategory === 'all'))
                                    return;
                                __VLS_ctx.docUsageFilter = '仲裁';
                                // @ts-ignore
                                [docUsageFilter, docUsageFilter,];
                            } },
                        ...{ class: (['doc-usage-chip', { active: __VLS_ctx.docUsageFilter === '仲裁' }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['doc-usage-chip']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-gavel text-xs mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-gavel']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'docgen'))
                                    return;
                                if (!(__VLS_ctx.docStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingDocCategories))
                                    return;
                                if (!(__VLS_ctx.docActiveCategory === 'all'))
                                    return;
                                __VLS_ctx.docUsageFilter = '日常';
                                // @ts-ignore
                                [docUsageFilter, docUsageFilter,];
                            } },
                        ...{ class: (['doc-usage-chip', { active: __VLS_ctx.docUsageFilter === '日常' }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['doc-usage-chip']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-house text-xs mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-house']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                    return;
                                if (!(__VLS_ctx.currentView === 'docgen'))
                                    return;
                                if (!(__VLS_ctx.docStep === 1))
                                    return;
                                if (!!(__VLS_ctx.isLoadingDocCategories))
                                    return;
                                if (!(__VLS_ctx.docActiveCategory === 'all'))
                                    return;
                                __VLS_ctx.docUsageFilter = '律师';
                                // @ts-ignore
                                [docUsageFilter, docUsageFilter,];
                            } },
                        ...{ class: (['doc-usage-chip', { active: __VLS_ctx.docUsageFilter === '律师' }]) },
                    });
                    /** @type {__VLS_StyleScopedClasses['active']} */ ;
                    /** @type {__VLS_StyleScopedClasses['doc-usage-chip']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-briefcase text-xs mr-1" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-briefcase']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                }
                if (__VLS_ctx.docActiveCategory === 'recent') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    if (__VLS_ctx.recentDocTemplates.length === 0) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-empty-state" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-empty-state']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4" },
                        });
                        /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
                        /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: "ph ph-clock-counter-clockwise text-3xl text-blue-300" },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['ph-clock-counter-clockwise']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-blue-300']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "text-slate-500 text-sm mb-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "text-slate-400 text-xs" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    }
                    else {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-template-grid" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-template-grid']} */ ;
                        for (const [tpl] of __VLS_vFor((__VLS_ctx.recentDocTemplates))) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!!(__VLS_ctx.recentDocTemplates.length === 0))
                                            return;
                                        __VLS_ctx.loadAndSelectDocTemplate(tpl.id);
                                        // @ts-ignore
                                        [docActiveCategory, docUsageFilter, recentDocTemplates, recentDocTemplates, loadAndSelectDocTemplate,];
                                    } },
                                key: (tpl.id),
                                ...{ class: "draft-tpl-card" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-header" },
                                ...{ style: ({ background: __VLS_ctx.getDocCategoryGradient(tpl.category_id) }) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-header']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: (['ph', __VLS_ctx.getDocCategoryIcon(tpl.category_id), 'text-2xl text-white/90']) },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-white/90']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!!(__VLS_ctx.recentDocTemplates.length === 0))
                                            return;
                                        __VLS_ctx.toggleDocFavorite(tpl.id);
                                        // @ts-ignore
                                        [getDocCategoryGradient, getDocCategoryIcon, toggleDocFavorite,];
                                    } },
                                ...{ class: (['draft-tpl-fav-btn', { 'is-fav': __VLS_ctx.docFavorites.includes(tpl.id) }]) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-fav-btn']} */ ;
                            /** @type {__VLS_StyleScopedClasses['is-fav']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: (__VLS_ctx.docFavorites.includes(tpl.id) ? 'ph ph-star-fill' : 'ph ph-star') },
                                ...{ class: "text-sm" },
                            });
                            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-body" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-body']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "flex items-center gap-1.5 mb-1.5" },
                            });
                            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                            /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-cat-badge" },
                                ...{ style: ({ background: __VLS_ctx.getDocCategoryBadgeBg(tpl.category_id), color: __VLS_ctx.getDocCategoryBadgeColor(tpl.category_id) }) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-cat-badge']} */ ;
                            (__VLS_ctx.getDocCategoryName(tpl.category_id));
                            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                                ...{ class: "draft-tpl-card-title" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-title']} */ ;
                            (tpl.name);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                ...{ class: "draft-tpl-card-desc" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-desc']} */ ;
                            (tpl.description);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-footer" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-footer']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-field-count" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-field-count']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-textbox text-xs mr-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                            (tpl.field_count || 0);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!!(__VLS_ctx.recentDocTemplates.length === 0))
                                            return;
                                        __VLS_ctx.openDocPreview(tpl);
                                        // @ts-ignore
                                        [docFavorites, docFavorites, getDocCategoryBadgeBg, getDocCategoryBadgeColor, getDocCategoryName, openDocPreview,];
                                    } },
                                ...{ class: "draft-tpl-preview-btn" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-preview-btn']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-eye text-xs mr-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-eye']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                            // @ts-ignore
                            [];
                        }
                    }
                }
                else if (__VLS_ctx.docActiveCategory === 'favorites') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    if (__VLS_ctx.favoriteDocTemplates.length === 0) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-empty-state" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-empty-state']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4" },
                        });
                        /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
                        /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: "ph ph-star text-3xl text-amber-300" },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['ph-star']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-amber-300']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "text-slate-500 text-sm mb-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "text-slate-400 text-xs" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    }
                    else {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-template-grid" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-template-grid']} */ ;
                        for (const [tpl] of __VLS_vFor((__VLS_ctx.favoriteDocTemplates))) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!(__VLS_ctx.docActiveCategory === 'favorites'))
                                            return;
                                        if (!!(__VLS_ctx.favoriteDocTemplates.length === 0))
                                            return;
                                        __VLS_ctx.loadAndSelectDocTemplate(tpl.id);
                                        // @ts-ignore
                                        [docActiveCategory, loadAndSelectDocTemplate, favoriteDocTemplates, favoriteDocTemplates,];
                                    } },
                                key: (tpl.id),
                                ...{ class: "draft-tpl-card" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-header" },
                                ...{ style: ({ background: __VLS_ctx.getDocCategoryGradient(tpl.category_id) }) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-header']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: (['ph', __VLS_ctx.getDocCategoryIcon(tpl.category_id), 'text-2xl text-white/90']) },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-white/90']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!(__VLS_ctx.docActiveCategory === 'favorites'))
                                            return;
                                        if (!!(__VLS_ctx.favoriteDocTemplates.length === 0))
                                            return;
                                        __VLS_ctx.toggleDocFavorite(tpl.id);
                                        // @ts-ignore
                                        [getDocCategoryGradient, getDocCategoryIcon, toggleDocFavorite,];
                                    } },
                                ...{ class: "draft-tpl-fav-btn is-fav" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-fav-btn']} */ ;
                            /** @type {__VLS_StyleScopedClasses['is-fav']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-star-fill text-sm" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-star-fill']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-body" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-body']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "flex items-center gap-1.5 mb-1.5" },
                            });
                            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                            /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-cat-badge" },
                                ...{ style: ({ background: __VLS_ctx.getDocCategoryBadgeBg(tpl.category_id), color: __VLS_ctx.getDocCategoryBadgeColor(tpl.category_id) }) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-cat-badge']} */ ;
                            (__VLS_ctx.getDocCategoryName(tpl.category_id));
                            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                                ...{ class: "draft-tpl-card-title" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-title']} */ ;
                            (tpl.name);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                ...{ class: "draft-tpl-card-desc" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-desc']} */ ;
                            (tpl.description);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-footer" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-footer']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-field-count" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-field-count']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-textbox text-xs mr-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                            (tpl.field_count || 0);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!(__VLS_ctx.docActiveCategory === 'favorites'))
                                            return;
                                        if (!!(__VLS_ctx.favoriteDocTemplates.length === 0))
                                            return;
                                        __VLS_ctx.openDocPreview(tpl);
                                        // @ts-ignore
                                        [getDocCategoryBadgeBg, getDocCategoryBadgeColor, getDocCategoryName, openDocPreview,];
                                    } },
                                ...{ class: "draft-tpl-preview-btn" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-preview-btn']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-eye text-xs mr-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-eye']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                            // @ts-ignore
                            [];
                        }
                    }
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    for (const [cat] of __VLS_vFor((__VLS_ctx.displayedDocCategories))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            key: (cat.id),
                            ...{ class: "draft-category-section" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-category-section']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-category-header" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-category-header']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-category-icon" },
                            ...{ style: ({ background: __VLS_ctx.getDocCategoryGradient(cat.id) }) },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-category-icon']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: (['ph', cat.icon, 'text-lg text-white']) },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "flex-1 min-w-0" },
                        });
                        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                        /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                            ...{ class: "text-base font-bold text-slate-800" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                        (cat.name);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                            ...{ class: "text-xs text-slate-400 mt-0.5" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                        (cat.description);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "draft-category-count" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-category-count']} */ ;
                        (__VLS_ctx.getFilteredTemplatesForCategory(cat).length);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "draft-template-grid" },
                        });
                        /** @type {__VLS_StyleScopedClasses['draft-template-grid']} */ ;
                        for (const [tpl] of __VLS_vFor((__VLS_ctx.getFilteredTemplatesForCategory(cat)))) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'favorites'))
                                            return;
                                        __VLS_ctx.loadAndSelectDocTemplate(tpl.id);
                                        // @ts-ignore
                                        [loadAndSelectDocTemplate, getDocCategoryGradient, displayedDocCategories, getFilteredTemplatesForCategory, getFilteredTemplatesForCategory,];
                                    } },
                                key: (tpl.id),
                                ...{ class: "draft-tpl-card" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-header" },
                                ...{ style: ({ background: __VLS_ctx.getDocCategoryGradient(cat.id) }) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-header']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: (['ph', cat.icon, 'text-2xl text-white/90']) },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-white/90']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'favorites'))
                                            return;
                                        __VLS_ctx.toggleDocFavorite(tpl.id);
                                        // @ts-ignore
                                        [getDocCategoryGradient, toggleDocFavorite,];
                                    } },
                                ...{ class: (['draft-tpl-fav-btn', { 'is-fav': __VLS_ctx.docFavorites.includes(tpl.id) }]) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-fav-btn']} */ ;
                            /** @type {__VLS_StyleScopedClasses['is-fav']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: (__VLS_ctx.docFavorites.includes(tpl.id) ? 'ph ph-star-fill' : 'ph ph-star') },
                                ...{ class: "text-sm" },
                            });
                            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-body" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-body']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "flex items-center gap-1.5 mb-1.5" },
                            });
                            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                            /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mb-1.5']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-cat-badge" },
                                ...{ style: ({ background: __VLS_ctx.getDocCategoryBadgeBg(cat.id), color: __VLS_ctx.getDocCategoryBadgeColor(cat.id) }) },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-cat-badge']} */ ;
                            (cat.name);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                                ...{ class: "draft-tpl-card-title" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-title']} */ ;
                            (tpl.name);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                                ...{ class: "draft-tpl-card-desc" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-desc']} */ ;
                            (tpl.description);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                                ...{ class: "draft-tpl-card-footer" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-card-footer']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                                ...{ class: "draft-tpl-field-count" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-field-count']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-textbox text-xs mr-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                            (tpl.field_count || 0);
                            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                                ...{ onClick: (...[$event]) => {
                                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                            return;
                                        if (!(__VLS_ctx.currentView === 'docgen'))
                                            return;
                                        if (!(__VLS_ctx.docStep === 1))
                                            return;
                                        if (!!(__VLS_ctx.isLoadingDocCategories))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'recent'))
                                            return;
                                        if (!!(__VLS_ctx.docActiveCategory === 'favorites'))
                                            return;
                                        __VLS_ctx.openDocPreview(tpl);
                                        // @ts-ignore
                                        [docFavorites, docFavorites, getDocCategoryBadgeBg, getDocCategoryBadgeColor, openDocPreview,];
                                    } },
                                ...{ class: "draft-tpl-preview-btn" },
                            });
                            /** @type {__VLS_StyleScopedClasses['draft-tpl-preview-btn']} */ ;
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-eye text-xs mr-1" },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-eye']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
                            // @ts-ignore
                            [];
                        }
                        // @ts-ignore
                        [];
                    }
                }
            }
            if (__VLS_ctx.showDocPreviewModal) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'docgen'))
                                return;
                            if (!(__VLS_ctx.docStep === 1))
                                return;
                            if (!(__VLS_ctx.showDocPreviewModal))
                                return;
                            __VLS_ctx.showDocPreviewModal = false;
                            // @ts-ignore
                            [showDocPreviewModal, showDocPreviewModal,];
                        } },
                    ...{ class: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
                /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-black/50']} */ ;
                /** @type {__VLS_StyleScopedClasses['backdrop-blur-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-fade-in" },
                });
                /** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-2xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['shadow-2xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
                /** @type {__VLS_StyleScopedClasses['max-w-2xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['mx-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['max-h-[85vh]']} */ ;
                /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
                /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "preview-modal-header" },
                    ...{ style: ({ background: __VLS_ctx.getDocCategoryGradient(__VLS_ctx.docPreviewTemplate?.category_id || '') }) },
                });
                /** @type {__VLS_StyleScopedClasses['preview-modal-header']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center gap-3 flex-1 min-w-0" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['w-10']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-white/20']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: (['ph', __VLS_ctx.getDocCategoryIcon(__VLS_ctx.docPreviewTemplate?.category_id || ''), 'text-xl text-white']) },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "min-w-0" },
                });
                /** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "text-lg font-bold text-white truncate" },
                });
                /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
                /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
                (__VLS_ctx.docPreviewTemplate?.name);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-white/70 text-xs mt-0.5" },
                });
                /** @type {__VLS_StyleScopedClasses['text-white/70']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
                (__VLS_ctx.getDocCategoryName(__VLS_ctx.docPreviewTemplate?.category_id));
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'docgen'))
                                return;
                            if (!(__VLS_ctx.docStep === 1))
                                return;
                            if (!(__VLS_ctx.showDocPreviewModal))
                                return;
                            __VLS_ctx.showDocPreviewModal = false;
                            // @ts-ignore
                            [getDocCategoryGradient, getDocCategoryIcon, getDocCategoryName, showDocPreviewModal, docPreviewTemplate, docPreviewTemplate, docPreviewTemplate, docPreviewTemplate,];
                        } },
                    ...{ class: "w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['w-8']} */ ;
                /** @type {__VLS_StyleScopedClasses['h-8']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-white/20']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:bg-white/30']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-x text-lg" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-x']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex-1 overflow-y-auto p-6 space-y-5" },
                });
                /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-600 text-sm leading-relaxed" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
                (__VLS_ctx.docPreviewTemplate?.description);
                if (__VLS_ctx.docPreviewTemplate?.outline_sections?.length) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                        ...{ class: "text-sm font-semibold text-slate-800 mb-2 flex items-center" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-list text-base mr-1.5 text-blue-500" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-list']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-blue-500']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                    for (const [section, idx] of __VLS_vFor((__VLS_ctx.docPreviewTemplate.outline_sections))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            key: (idx),
                            ...{ class: "flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700" },
                        });
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center flex-shrink-0 font-medium" },
                        });
                        /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-blue-100']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                        (idx + 1);
                        (section);
                        // @ts-ignore
                        [docPreviewTemplate, docPreviewTemplate, docPreviewTemplate,];
                    }
                }
                if (__VLS_ctx.docPreviewTemplate?.fields?.length) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                        ...{ class: "text-sm font-semibold text-slate-800 mb-2 flex items-center" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-textbox text-base mr-1.5 text-teal-500" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-textbox']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-teal-500']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "flex flex-wrap gap-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                    for (const [field] of __VLS_vFor((__VLS_ctx.docPreviewTemplate.fields))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            key: (field.key),
                            ...{ class: "inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium" },
                        });
                        /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
                        /** @type {__VLS_StyleScopedClasses['px-2.5']} */ ;
                        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
                        /** @type {__VLS_StyleScopedClasses['bg-teal-50']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-teal-700']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                        (field.label);
                        if (field.required) {
                            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                                ...{ class: "ph ph-asterisk text-red-400" },
                                ...{ style: {} },
                            });
                            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                            /** @type {__VLS_StyleScopedClasses['ph-asterisk']} */ ;
                            /** @type {__VLS_StyleScopedClasses['text-red-400']} */ ;
                        }
                        // @ts-ignore
                        [docPreviewTemplate, docPreviewTemplate,];
                    }
                }
                if (__VLS_ctx.docPreviewTemplate?.law_references?.length) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                    __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                        ...{ class: "text-sm font-semibold text-slate-800 mb-2 flex items-center" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                        ...{ class: "ph ph-book-open text-base mr-1.5 text-indigo-500" },
                    });
                    /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ph-book-open']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                    /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-indigo-500']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "space-y-1.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
                    for (const [ref] of __VLS_vFor((__VLS_ctx.docPreviewTemplate.law_references))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            key: (ref),
                            ...{ class: "flex items-center gap-2 text-sm text-slate-600" },
                        });
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                            ...{ class: "ph ph-bookmark text-indigo-400 text-xs flex-shrink-0" },
                        });
                        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                        /** @type {__VLS_StyleScopedClasses['ph-bookmark']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-indigo-400']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                        (ref);
                        // @ts-ignore
                        [docPreviewTemplate, docPreviewTemplate,];
                    }
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50" },
                });
                /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['bg-slate-50/50']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'docgen'))
                                return;
                            if (!(__VLS_ctx.docStep === 1))
                                return;
                            if (!(__VLS_ctx.showDocPreviewModal))
                                return;
                            __VLS_ctx.toggleDocFavorite(__VLS_ctx.docPreviewTemplate?.id);
                            // @ts-ignore
                            [toggleDocFavorite, docPreviewTemplate,];
                        } },
                    ...{ class: (['flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors', __VLS_ctx.docFavorites.includes(__VLS_ctx.docPreviewTemplate?.id) ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200']) },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: (__VLS_ctx.docFavorites.includes(__VLS_ctx.docPreviewTemplate?.id) ? 'ph ph-star-fill' : 'ph ph-star') },
                    ...{ class: "text-base" },
                });
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                (__VLS_ctx.docFavorites.includes(__VLS_ctx.docPreviewTemplate?.id) ? '已收藏' : '收藏');
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (__VLS_ctx.startDocFromPreview) },
                    ...{ class: "btn-primary text-sm px-6" },
                });
                /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['px-6']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-file-text mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-file-text']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
        }
        if (__VLS_ctx.docStep === 2) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "max-w-4xl mx-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2 mb-6" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'docgen'))
                            return;
                        if (!(__VLS_ctx.docStep === 2))
                            return;
                        __VLS_ctx.docStep = 1;
                        // @ts-ignore
                        [docStep, docStep, docFavorites, docFavorites, docFavorites, docPreviewTemplate, docPreviewTemplate, docPreviewTemplate, startDocFromPreview,];
                    } },
                ...{ class: "p-2 rounded-lg hover:bg-slate-100 text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left text-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
                ...{ class: "text-xl font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.selectedDocTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.selectedDocTemplate?.description);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-t-xl']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-4 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center text-blue-600 font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center" },
                ...{ class: (__VLS_ctx.docStep >= 3 ? 'text-blue-600 font-medium' : 'text-slate-400') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full text-xs flex items-center justify-center mr-1.5" },
                ...{ class: (__VLS_ctx.docStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500') },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center" },
                ...{ class: (__VLS_ctx.docStep >= 4 ? 'text-blue-600 font-medium' : 'text-slate-400') },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full text-xs flex items-center justify-center mr-1.5" },
                ...{ class: (__VLS_ctx.docStep >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500') },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5 space-y-4" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            for (const [field] of __VLS_vFor((__VLS_ctx.selectedDocTemplate?.fields || []))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (field.key),
                    ...{ class: "grid grid-cols-1 sm:grid-cols-12 gap-2 items-start" },
                });
                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['sm:grid-cols-12']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "sm:col-span-3" },
                });
                /** @type {__VLS_StyleScopedClasses['sm:col-span-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                    ...{ class: "form-label !mb-0 sm:pt-2" },
                });
                /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
                /** @type {__VLS_StyleScopedClasses['!mb-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['sm:pt-2']} */ ;
                (field.label);
                if (field.required) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-red-400 ml-0.5" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-red-400']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-0.5']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "sm:col-span-9" },
                });
                /** @type {__VLS_StyleScopedClasses['sm:col-span-9']} */ ;
                if (field.options && field.options.length > 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                        value: (__VLS_ctx.docElements[field.key]),
                        ...{ class: "form-input text-sm" },
                    });
                    /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                        value: "",
                    });
                    for (const [opt] of __VLS_vFor((field.options))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                            key: (opt),
                            value: (opt),
                        });
                        (opt);
                        // @ts-ignore
                        [docStep, docStep, docStep, docStep, selectedDocTemplate, selectedDocTemplate, selectedDocTemplate, docElements,];
                    }
                }
                else if (field.field_type === 'textarea') {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                        value: (__VLS_ctx.docElements[field.key]),
                        placeholder: (field.placeholder),
                        rows: "3",
                        ...{ class: "form-input text-sm resize-none" },
                    });
                    /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                    /** @type {__VLS_StyleScopedClasses['resize-none']} */ ;
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                        type: (field.field_type === 'number' ? 'number' : 'text'),
                        placeholder: (field.placeholder),
                        ...{ class: "form-input text-sm" },
                    });
                    (__VLS_ctx.docElements[field.key]);
                    /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                }
                // @ts-ignore
                [docElements, docElements,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-t border-slate-100 flex justify-end space-x-3" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'docgen'))
                            return;
                        if (!(__VLS_ctx.docStep === 2))
                            return;
                        __VLS_ctx.docStep = 1;
                        // @ts-ignore
                        [docStep,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleGenerateDocOutline) },
                disabled: (__VLS_ctx.isGeneratingDocOutline || !__VLS_ctx.hasRequiredDocFields),
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            if (__VLS_ctx.isGeneratingDocOutline) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-spinner animate-spin mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-spinner']} */ ;
                /** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-list-magnifying-glass mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-list-magnifying-glass']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            (__VLS_ctx.isGeneratingDocOutline ? '生成中...' : '生成大纲');
        }
        if (__VLS_ctx.docStep === 3) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "max-w-4xl mx-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2 mb-6" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'docgen'))
                            return;
                        if (!(__VLS_ctx.docStep === 3))
                            return;
                        __VLS_ctx.docStep = 2;
                        // @ts-ignore
                        [docStep, docStep, handleGenerateDocOutline, isGeneratingDocOutline, isGeneratingDocOutline, isGeneratingDocOutline, hasRequiredDocFields,];
                    } },
                ...{ class: "p-2 rounded-lg hover:bg-slate-100 text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left text-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
                ...{ class: "text-xl font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.selectedDocTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-t-xl']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-4 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center text-blue-600 font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center text-blue-600 font-medium" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-300" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex items-center text-slate-400" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-200']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-5" },
            });
            /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-blue-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-blue-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-info text-sm mr-2 mt-0.5 flex-shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-info']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                value: (__VLS_ctx.docOutline),
                rows: "20",
                ...{ class: "form-input text-sm resize-y font-serif leading-relaxed" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['resize-y']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-serif']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-t border-slate-100 flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-t']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'docgen'))
                            return;
                        if (!(__VLS_ctx.docStep === 3))
                            return;
                        __VLS_ctx.docStep = 2;
                        // @ts-ignore
                        [docStep, selectedDocTemplate, docOutline,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleGenerateDocText) },
                disabled: (__VLS_ctx.isGeneratingDocText),
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            if (__VLS_ctx.isGeneratingDocText) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-spinner animate-spin mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-spinner']} */ ;
                /** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-file-text mr-1.5" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-file-text']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
            }
            (__VLS_ctx.isGeneratingDocText ? 'AI 正在起草文书...' : '生成文书');
        }
        if (__VLS_ctx.docStep === 4) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "max-w-5xl mx-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['max-w-5xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2 mb-6" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'docgen'))
                            return;
                        if (!(__VLS_ctx.docStep === 4))
                            return;
                        __VLS_ctx.docStep = 3;
                        // @ts-ignore
                        [docStep, docStep, handleGenerateDocText, isGeneratingDocText, isGeneratingDocText, isGeneratingDocText,];
                    } },
                ...{ class: "p-2 rounded-lg hover:bg-slate-100 text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-left text-lg" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-left']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
                ...{ class: "text-xl font-bold text-slate-800" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            (__VLS_ctx.selectedDocTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-500 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 lg:grid-cols-12 gap-5" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['lg:grid-cols-12']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-8" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-8']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card !p-0 overflow-hidden" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['!p-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-b']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-800 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center space-x-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleDocQualityCheck) },
                disabled: (__VLS_ctx.isCheckingDocQuality),
                ...{ class: "px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center text-xs border border-green-200" },
            });
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-green-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-green-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-green-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-green-200']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: (__VLS_ctx.isCheckingDocQuality ? 'ph ph-spinner animate-spin' : 'ph ph-check-circle') },
                ...{ class: "text-sm mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleExportDoc) },
                ...{ class: "px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center text-xs border border-slate-200" },
            });
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-slate-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:bg-slate-100']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-slate-200']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-download-simple text-sm mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-download-simple']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-6 max-h-[65vh] overflow-y-auto whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-h-[65vh]']} */ ;
            /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-serif']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.generatedDocText);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "lg:col-span-4 space-y-4" },
            });
            /** @type {__VLS_StyleScopedClasses['lg:col-span-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
            if (__VLS_ctx.docQualityResult) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "card" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                    ...{ class: "font-semibold text-sm mb-2" },
                    ...{ class: (__VLS_ctx.docQualityResult.is_qualified ? 'text-green-600' : 'text-orange-600') },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
                (__VLS_ctx.docQualityResult.is_qualified ? '✓ 文书质量合格' : '⚠ 文书存在以下问题');
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-slate-600 whitespace-pre-wrap text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['whitespace-pre-wrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                (__VLS_ctx.docQualityResult.quality_check);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "font-semibold text-slate-800 text-sm mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-2 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-700" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            (__VLS_ctx.selectedDocTemplate?.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-700" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            (__VLS_ctx.getDocCategoryName(__VLS_ctx.selectedDocTemplate?.category_id));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-between" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-slate-500" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-medium text-slate-700" },
            });
            /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-700']} */ ;
            (__VLS_ctx.selectedDocTemplate?.law_references?.length || 0);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h4, __VLS_intrinsics.h4)({
                ...{ class: "font-semibold text-slate-800 text-sm mb-3" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
            for (const [ref] of __VLS_vFor(((__VLS_ctx.selectedDocTemplate?.law_references || [])))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (ref),
                    ...{ class: "text-xs text-slate-600 flex items-center" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-600']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-book-open text-slate-400 mr-1.5 flex-shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-book-open']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
                /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
                (ref);
                // @ts-ignore
                [getDocCategoryName, selectedDocTemplate, selectedDocTemplate, selectedDocTemplate, selectedDocTemplate, selectedDocTemplate, handleDocQualityCheck, isCheckingDocQuality, isCheckingDocQuality, handleExportDoc, generatedDocText, docQualityResult, docQualityResult, docQualityResult, docQualityResult,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.resetDocGen) },
                ...{ class: "btn-outline w-full text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-arrow-counter-clockwise mr-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-arrow-counter-clockwise']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
        }
    }
    if (__VLS_ctx.currentView === 'cases') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-between items-center mb-6" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "text-2xl font-bold text-slate-800" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.authStore.isAuthenticated))
                        return;
                    if (!(__VLS_ctx.currentView === 'cases'))
                        return;
                    __VLS_ctx.showNewCaseForm = true;
                    // @ts-ignore
                    [currentView, resetDocGen, showNewCaseForm,];
                } },
            ...{ class: "btn-primary text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-plus text-base mr-1" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-plus']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        if (__VLS_ctx.showNewCaseForm) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card mb-5" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                ...{ class: "font-semibold text-slate-800 mb-4 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "text",
                value: (__VLS_ctx.newCase.title),
                ...{ class: "form-input text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                value: (__VLS_ctx.newCase.case_type),
                ...{ class: "form-input text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "text",
                value: (__VLS_ctx.newCase.plaintiff),
                ...{ class: "form-input text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "text",
                value: (__VLS_ctx.newCase.defendant),
                ...{ class: "form-input text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mt-3" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "form-label" },
            });
            /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
                value: (__VLS_ctx.newCase.description),
                rows: "2",
                ...{ class: "form-input text-sm resize-none" },
            });
            /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['resize-none']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex justify-end mt-4 space-x-3" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.authStore.isAuthenticated))
                            return;
                        if (!(__VLS_ctx.currentView === 'cases'))
                            return;
                        if (!(__VLS_ctx.showNewCaseForm))
                            return;
                        __VLS_ctx.showNewCaseForm = false;
                        // @ts-ignore
                        [showNewCaseForm, showNewCaseForm, newCase, newCase, newCase, newCase, newCase,];
                    } },
                ...{ class: "btn-outline text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.handleCreateCase) },
                ...{ class: "btn-primary text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        }
        if (__VLS_ctx.casesList.length === 0) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "card text-center py-10 text-slate-400" },
            });
            /** @type {__VLS_StyleScopedClasses['card']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-10']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-briefcase text-4xl mb-3 text-slate-200" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-briefcase']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-4xl']} */ ;
            /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-slate-200']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-3" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            for (const [c] of __VLS_vFor((__VLS_ctx.casesList))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (c.id),
                    ...{ class: "card hover:shadow-md transition-shadow" },
                });
                /** @type {__VLS_StyleScopedClasses['card']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:shadow-md']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-shadow']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex justify-between items-start" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
                    ...{ class: "font-semibold text-slate-800 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                (c.title);
                __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                    ...{ class: "text-xs text-slate-500 mt-1" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
                (c.case_type);
                (c.plaintiff || '未指定');
                (c.defendant || '未指定');
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex items-center space-x-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-x-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "px-2 py-0.5 text-xs rounded-full" },
                    ...{ class: (c.status === '进行中' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600') },
                });
                /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
                (c.status);
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.authStore.isAuthenticated))
                                return;
                            if (!(__VLS_ctx.currentView === 'cases'))
                                return;
                            if (!!(__VLS_ctx.casesList.length === 0))
                                return;
                            __VLS_ctx.handleDeleteCase(c.id);
                            // @ts-ignore
                            [handleCreateCase, casesList, casesList, handleDeleteCase,];
                        } },
                    ...{ class: "p-1 text-slate-300 hover:text-red-500 transition-colors" },
                });
                /** @type {__VLS_StyleScopedClasses['p-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-slate-300']} */ ;
                /** @type {__VLS_StyleScopedClasses['hover:text-red-500']} */ ;
                /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                    ...{ class: "ph ph-trash text-base" },
                });
                /** @type {__VLS_StyleScopedClasses['ph']} */ ;
                /** @type {__VLS_StyleScopedClasses['ph-trash']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
                // @ts-ignore
                [];
            }
        }
    }
    if (__VLS_ctx.currentView === 'account') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "page-container animate-fade-in max-w-3xl" },
        });
        /** @type {__VLS_StyleScopedClasses['page-container']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-fade-in']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-3xl']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
            ...{ class: "text-2xl font-bold text-slate-800 mb-6" },
        });
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-5" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "card" },
        });
        /** @type {__VLS_StyleScopedClasses['card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center space-x-5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold flex-shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
        (__VLS_ctx.authStore.userName ? __VLS_ctx.authStore.userName[0] : '?');
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
            ...{ class: "text-lg font-bold text-slate-800" },
        });
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        (__VLS_ctx.authStore.userName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-slate-500 text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        (__VLS_ctx.authStore.userEmail);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-blue-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        (__VLS_ctx.authStore.userPlan);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "card" },
        });
        /** @type {__VLS_StyleScopedClasses['card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "text-base font-semibold text-slate-800 mb-4 flex items-center" },
        });
        /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-800']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-key text-lg mr-2 text-slate-500" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-key']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-500']} */ ;
        if (!__VLS_ctx.apiKeyConfigured) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg flex items-start" },
            });
            /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-amber-50']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-amber-200']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-amber-700']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-warning text-base mr-2 mt-0.5 flex-shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-warning']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-4" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "form-label" },
        });
        /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            ...{ onChange: (__VLS_ctx.onProviderChange) },
            value: (__VLS_ctx.selectedProvider),
            ...{ class: "form-input text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        for (const [p] of __VLS_vFor((__VLS_ctx.providers))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                key: (p.id),
                value: (p.id),
            });
            (p.name);
            (p.has_env_key ? ' (已预置)' : '');
            // @ts-ignore
            [authStore, authStore, authStore, authStore, authStore, currentView, apiKeyConfigured, onProviderChange, selectedProvider, providers,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "form-label" },
        });
        /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (__VLS_ctx.llmModelName),
            ...{ class: "form-input text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        for (const [m] of __VLS_vFor((__VLS_ctx.currentModels))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                key: (m),
                value: (m),
            });
            (m);
            // @ts-ignore
            [llmModelName, currentModels,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "form-label" },
        });
        /** @type {__VLS_StyleScopedClasses['form-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "relative" },
        });
        /** @type {__VLS_StyleScopedClasses['relative']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: (__VLS_ctx.showApiKey ? 'text' : 'password'),
            placeholder: (__VLS_ctx.currentKeyHint),
            ...{ class: "form-input text-sm font-mono !pr-10" },
            ...{ class: ({ '!border-red-300': __VLS_ctx.llmApiKey && !__VLS_ctx.validateKeyFormat(__VLS_ctx.llmApiKey) }) },
        });
        (__VLS_ctx.llmApiKey);
        /** @type {__VLS_StyleScopedClasses['form-input']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        /** @type {__VLS_StyleScopedClasses['!pr-10']} */ ;
        /** @type {__VLS_StyleScopedClasses['!border-red-300']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.authStore.isAuthenticated))
                        return;
                    if (!(__VLS_ctx.currentView === 'account'))
                        return;
                    __VLS_ctx.showApiKey = !__VLS_ctx.showApiKey;
                    // @ts-ignore
                    [showApiKey, showApiKey, showApiKey, currentKeyHint, llmApiKey, llmApiKey, llmApiKey, validateKeyFormat,];
                } },
            type: "button",
            ...{ class: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['right-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['top-1/2']} */ ;
        /** @type {__VLS_StyleScopedClasses['-translate-y-1/2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:text-slate-600']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: (__VLS_ctx.showApiKey ? 'ph ph-eye-slash' : 'ph ph-eye') },
            ...{ class: "text-base" },
        });
        /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
        if (__VLS_ctx.llmApiKey && !__VLS_ctx.validateKeyFormat(__VLS_ctx.llmApiKey)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-red-500 text-xs mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            (__VLS_ctx.currentKeyHint);
        }
        if (__VLS_ctx.currentProviderHasEnvKey && !__VLS_ctx.llmApiKey) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-slate-400 text-xs mt-1" },
            });
            /** @type {__VLS_StyleScopedClasses['text-slate-400']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
                ...{ class: "ph ph-info text-xs mr-1" },
            });
            /** @type {__VLS_StyleScopedClasses['ph']} */ ;
            /** @type {__VLS_StyleScopedClasses['ph-info']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['mr-1']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-end space-x-3 pt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-x-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.handleValidateApiKey) },
            disabled: (__VLS_ctx.isValidatingKey || (!__VLS_ctx.llmApiKey && !__VLS_ctx.currentProviderHasEnvKey)),
            ...{ class: "btn-outline text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-outline']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: (__VLS_ctx.isValidatingKey ? 'ph ph-spinner animate-spin' : 'ph ph-check-circle') },
            ...{ class: "text-base mr-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
        (__VLS_ctx.isValidatingKey ? '验证中...' : '验证 Key');
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.handleSaveConfig) },
            disabled: (__VLS_ctx.isSavingConfig),
            ...{ class: "btn-primary text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: (__VLS_ctx.isSavingConfig ? 'ph ph-spinner animate-spin' : 'ph ph-floppy-disk') },
            ...{ class: "text-base mr-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-base']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
        (__VLS_ctx.isSavingConfig ? '保存中...' : '保存配置');
        if (__VLS_ctx.apiKeyValidation) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "p-3 rounded-lg text-sm" },
                ...{ class: (__VLS_ctx.apiKeyValidation.valid ? 'msg-success' : 'msg-error') },
            });
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            (__VLS_ctx.apiKeyValidation.message);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.handleLogout) },
            ...{ class: "flex items-center text-red-500 font-medium hover:bg-red-50 px-4 py-2.5 rounded-lg transition-colors text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-red-500']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-red-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
            ...{ class: "ph ph-sign-out text-lg mr-2" },
        });
        /** @type {__VLS_StyleScopedClasses['ph']} */ ;
        /** @type {__VLS_StyleScopedClasses['ph-sign-out']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
    }
}
if (__VLS_ctx.toastMessage) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "toast" },
        ...{ class: (__VLS_ctx.toastType) },
    });
    /** @type {__VLS_StyleScopedClasses['toast']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({
        ...{ class: (__VLS_ctx.toastType === 'success' ? 'ph ph-check-circle' : __VLS_ctx.toastType === 'error' ? 'ph ph-x-circle' : 'ph ph-info') },
        ...{ class: "text-lg mr-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['mr-2']} */ ;
    (__VLS_ctx.toastMessage);
}
// @ts-ignore
[showApiKey, currentKeyHint, llmApiKey, llmApiKey, llmApiKey, llmApiKey, validateKeyFormat, currentProviderHasEnvKey, currentProviderHasEnvKey, handleValidateApiKey, isValidatingKey, isValidatingKey, isValidatingKey, handleSaveConfig, isSavingConfig, isSavingConfig, isSavingConfig, apiKeyValidation, apiKeyValidation, apiKeyValidation, handleLogout, toastMessage, toastMessage, toastType, toastType, toastType,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
