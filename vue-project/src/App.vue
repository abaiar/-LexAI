<template>
  <div :class="{ dark: isDarkMode }">
    <div v-if="!authStore.isAuthenticated" class="login-page">
      <div class="login-bg-1"></div>
      <div class="login-bg-2"></div>
      <div class="login-card">
        <div class="login-header">
          <i class="ph ph-scales text-5xl text-white"></i>
          <h1 class="text-2xl font-bold text-white tracking-wide mt-3">LexAI</h1>
          <p class="text-blue-100 text-sm mt-2">Intelligent Legal Assistant powered by Deli LLM & Kaiwu Platform</p>
        </div>
        <div class="login-body">
          <h2 class="text-xl font-semibold text-slate-800 mb-6">{{ isLogin ? 'Welcome Back' : 'Create New Account' }}</h2>
          <div v-if="authError" class="msg-error">{{ authError }}</div>
          <form @submit.prevent="handleAuth" class="space-y-4">
            <div v-if="!isLogin">
              <label class="form-label">Name</label>
              <input type="text" v-model="registerName" class="form-input" placeholder="Your full name" />
            </div>
            <div>
              <label class="form-label">Email / Account</label>
              <input type="email" v-model="authEmail" required class="form-input" placeholder="admin@example.com" />
            </div>
            <div>
              <label class="form-label">Password</label>
              <input type="password" v-model="authPassword" required class="form-input" placeholder="••••••••" />
            </div>
            <button type="submit" :disabled="isAuthLoading" class="btn-primary w-full mt-6">
              {{ isAuthLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register') }}
            </button>
          </form>
          <div class="mt-6 text-center text-sm text-slate-500">
            {{ isLogin ? 'Don't have an account?' : 'Already have an account?' }}
            <button @click="isLogin = !isLogin; authError = ''" class="text-blue-600 hover:underline ml-1 font-medium">{{ isLogin ? 'Register Now' : 'Back to Login' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="app-layout">
      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-logo" @click="currentView = 'dashboard'">
          <i class="ph ph-scales text-2xl"></i>
          <span v-if="!sidebarCollapsed" class="text-lg font-bold tracking-wide">LexAI</span>
        </div>
        <nav class="sidebar-nav">
          <button v-for="item in navItems" :key="item.id" @click="currentView = item.id" :class="['sidebar-item', { active: currentView === item.id }]" :title="item.label">
            <i :class="[item.icon, 'text-lg']"></i>
            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          </button>
        </nav>
        <div class="sidebar-section">
          <button @click="toggleDarkMode" class="sidebar-item dark-toggle-btn" :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            <i :class="[isDarkMode ? 'ph ph-sun' : 'ph ph-moon', 'text-lg']"></i>
            <span v-if="!sidebarCollapsed">{{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>
        </div>
        <div class="sidebar-user">
          <div class="sidebar-avatar">{{ authStore.userName ? authStore.userName[0] : '?' }}</div>
          <div v-if="!sidebarCollapsed" class="sidebar-user-info">
            <p class="text-sm font-medium truncate" :class="isDarkMode ? 'text-slate-200' : 'text-slate-800'">{{ authStore.userName }}</p>
            <p class="text-xs truncate" :class="isDarkMode ? 'text-slate-400' : 'text-slate-500'">{{ authStore.userPlan }}</p>
          </div>
        </div>
      </aside>

      <div class="main-area">
        <header class="top-bar">
          <div class="flex items-center space-x-4">
            <button @click="sidebarCollapsed = !sidebarCollapsed" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <i :class="sidebarCollapsed ? 'ph ph-sidebar-simple' : 'ph ph-sidebar'" class="text-lg"></i>
            </button>
            <h2 class="text-lg font-semibold text-slate-800">{{ currentNavLabel }}</h2>
          </div>
          <div class="flex items-center space-x-3">
            <div v-if="!apiKeyConfigured" class="apikey-warning" @click="currentView = 'account'">
              <i class="ph ph-warning text-sm mr-1"></i> API Key Not Configured
            </div>
            <span class="agent-badge"><i class="ph ph-robot text-sm mr-1.5 text-indigo-500"></i> LangChain Multi-Agent</span>
          </div>
        </header>

        <main class="content-area">
          <!-- Dashboard -->
          <div v-if="currentView === 'dashboard'" class="page-container animate-fade-in">
            <div class="mb-8">
              <h1 class="text-2xl font-bold text-slate-800">Hello, {{ authStore.userName }}</h1>
              <p class="text-slate-500 mt-1">What legal matters do you need to handle today?</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div v-for="feature in dashboardFeatures" :key="feature.id" @click="currentView = feature.id" class="feature-card group">
                <div :class="['w-11 h-11 rounded-lg flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform', feature.color]">
                  <i :class="[feature.icon, 'text-xl']"></i>
                </div>
                <h3 class="text-base font-semibold text-slate-800 mb-1">{{ feature.title }}</h3>
                <p class="text-slate-500 text-sm">{{ feature.desc }}</p>
              </div>
            </div>
            <div class="mt-10">
              <h3 class="text-lg font-semibold text-slate-800 mb-4 flex items-center"><i class="ph ph-book-open text-xl mr-2 text-blue-600"></i>Vertical Scenario Agents</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div v-for="(scenario, idx) in verticalScenarios" :key="idx" @click="openVerticalAgent(scenario.id)" class="scenario-card">
                  <div class="flex items-center space-x-3 mb-3">
                    <div class="p-2 bg-blue-50 text-blue-600 rounded-lg"><i :class="[scenario.icon, 'text-xl']"></i></div>
                    <h4 class="font-semibold text-slate-800">{{ scenario.title }}</h4>
                  </div>
                  <div class="flex flex-wrap gap-1.5 mt-3">
                    <span v-for="tag in scenario.tags" :key="tag" class="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-xs rounded">{{ tag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Chat -->
          <div v-if="currentView === 'chat'" class="chat-page animate-fade-in">
            <div class="chat-messages" ref="chatContainer">
              <div v-for="(msg, i) in chatMessages" :key="i" :class="['chat-msg', msg.role]">
                <div :class="['chat-msg-avatar', msg.role]">
                  <i :class="msg.role === 'user' ? 'ph ph-user' : 'ph ph-robot'" class="text-sm text-white"></i>
                </div>
                <div :class="['chat-msg-bubble', msg.role]">
                  <div class="chat-msg-content" v-html="renderMarkdown(msg.content)"></div>
                </div>
              </div>
              <div v-if="isChatTyping" class="chat-msg assistant">
                <div class="chat-msg-avatar assistant"><i class="ph ph-robot text-sm text-white"></i></div>
                <div class="chat-msg-bubble assistant typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
              </div>
            </div>
            <div v-if="agentStatusText" class="agent-status-bar"><i class="ph ph-spinner animate-spin mr-1.5"></i> {{ agentStatusText }}</div>
            <div class="chat-input-bar">
              <form @submit.prevent="handleChatSend" class="chat-input-form">
                <textarea v-model="chatInput" @keydown.enter.exact.prevent="handleChatSend" placeholder="Describe your case or follow up, e.g.: Company owes wages and no labor contract signed..." class="chat-textarea" rows="1"></textarea>
                <button type="submit" :disabled="!chatInput.trim() || isChatTyping" class="chat-send-btn"><i class="ph ph-paper-plane-right text-lg"></i></button>
              </form>
            </div>
          </div>

          <!-- Vertical Agent -->
          <div v-if="currentView === 'vertical-agent'" class="chat-page animate-fade-in">
            <div class="chat-messages" ref="verticalChatContainer">
              <div v-if="verticalAgentTitle" class="text-center mb-4">
                <span class="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"><i class="ph ph-robot text-base mr-2"></i> {{ verticalAgentTitle }}</span>
              </div>
              <div v-for="(msg, i) in verticalChatMessages" :key="i" :class="['chat-msg', msg.role]">
                <div :class="['chat-msg-avatar', msg.role]"><i :class="msg.role === 'user' ? 'ph ph-user' : 'ph ph-robot'" class="text-sm text-white"></i></div>
                <div :class="['chat-msg-bubble', msg.role]"><div class="chat-msg-content" v-html="renderMarkdown(msg.content)"></div></div>
              </div>
              <div v-if="isVerticalTyping" class="chat-msg assistant">
                <div class="chat-msg-avatar assistant"><i class="ph ph-robot text-sm text-white"></i></div>
                <div class="chat-msg-bubble assistant typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
              </div>
            </div>
            <div v-if="verticalAgentStatusText" class="agent-status-bar"><i class="ph ph-spinner animate-spin mr-1.5"></i> {{ verticalAgentStatusText }}</div>
            <div class="chat-input-bar">
              <form @submit.prevent="handleVerticalChatSend" class="chat-input-form">
                <textarea v-model="verticalChatInput" @keydown.enter.exact.prevent="handleVerticalChatSend" placeholder="Please describe your legal issue..." class="chat-textarea" rows="1"></textarea>
                <button type="submit" :disabled="!verticalChatInput.trim() || isVerticalTyping" class="chat-send-btn"><i class="ph ph-paper-plane-right text-lg"></i></button>
              </form>
            </div>
          </div>

          <!-- Contract -->
          <div v-if="currentView === 'contract'" class="page-container animate-fade-in">
            <div class="mb-8">
              <h1 class="text-2xl font-bold text-slate-800 flex items-center"><i class="ph ph-shield-check text-2xl text-indigo-600 mr-2"></i> Smart Contract Review & Completion</h1>
              <p class="text-slate-500 mt-1">Automatically identify risky clauses, compare against laws & regulations, and suggest missing clauses.</p>
            </div>
            <div v-if="contractStep === 1" class="space-y-5">
              <div class="upload-zone" @click="contractFileInput?.click()" @dragover.prevent @drop.prevent="handleContractDrop">
                <input type="file" ref="contractFileInput" class="hidden" accept=".pdf,.txt,.docx" @change="handleContractFileSelect" />
                <i class="ph ph-cloud-arrow-up text-5xl text-slate-300 mb-3"></i>
                <h3 class="text-base font-medium text-slate-600">Click or drag to upload contract for review</h3>
                <p class="text-slate-400 text-sm mt-1">Supports Word and PDF formats</p>
              </div>
              <div class="text-center text-slate-400 text-xs">— Or paste contract text directly —</div>
              <div class="card">
                <textarea v-model="contractText" placeholder="Paste contract text here..." rows="8" class="form-input resize-none text-sm"></textarea>
                <div class="flex justify-end mt-3">
                  <button @click="handleContractTextSubmit" :disabled="!contractText.trim()" class="btn-primary text-sm"><i class="ph ph-magnifying-glass mr-1.5"></i>Submit for Review</button>
                </div>
              </div>
            </div>
            <div v-if="contractStep === 2" class="card text-center py-16">
              <div class="spinner-lg mx-auto mb-5"></div>
              <h3 class="text-lg font-medium text-slate-800 mb-2">Agent workflow processing...</h3>
              <p class="text-slate-500 text-sm">{{ contractProgress }}</p>
            </div>
            <div v-if="contractStep === 3 && contractResult" class="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div class="lg:col-span-4 space-y-5">
                <div class="card">
                  <h3 class="font-semibold text-slate-800 mb-4">Review Overview</h3>
                  <div class="space-y-3 text-sm">
                    <div class="flex justify-between"><span class="text-slate-600">Risk Rating</span><span :class="contractResult.score >= 80 ? 'text-green-600' : contractResult.score >= 60 ? 'text-yellow-600' : 'text-red-600'" class="font-bold">{{ contractResult.score }} pts</span></div>
                    <div class="flex justify-between"><span class="text-slate-600">Risky Clauses</span><span class="font-medium">{{ contractResult.risk_items?.length || 0 }}  items</span></div>
                    <div class="flex justify-between"><span class="text-slate-600">Missing Clauses</span><span class="font-medium">{{ contractResult.missing_clauses?.length || 0 }}  items</span></div>
                  </div>
                  <hr class="my-4 border-slate-100"/>
                  <div class="space-y-2">
                    <div v-for="(risk, idx) in contractResult.risk_items" :key="idx" class="flex items-start text-sm text-slate-700">
                      <i :class="risk.level === 'high' ? 'ph ph-warning text-red-500' : risk.level === 'medium' ? 'ph ph-warning text-yellow-500' : 'ph ph-info text-blue-500'" class="text-base mr-2 mt-0.5 flex-shrink-0"></i>{{ risk.clause }}
                    </div>
                    <div v-for="(missing, idx) in contractResult.missing_clauses" :key="'m'+idx" class="flex items-start text-sm text-slate-700">
                      <i class="ph ph-plus text-base text-blue-500 mr-2 mt-0.5 flex-shrink-0"></i> Missing: {{ missing }}
                    </div>
                  </div>
                </div>
                <button @click="contractStep = 1; contractResult = null" class="btn-outline w-full">Review Another Contract</button>
              </div>
              <div class="lg:col-span-8 card overflow-hidden !p-0">
                <div class="bg-slate-50 p-4 border-b border-slate-100 font-medium text-slate-800 text-sm">Detailed Review Opinions & Completion Suggestions</div>
                <div class="p-5 space-y-4">
                  <div v-for="(risk, idx) in contractResult.risk_items" :key="idx" :class="['border-l-4 pl-4 bg-slate-50 p-4 rounded-r-lg', risk.level === 'high' ? 'border-red-500' : risk.level === 'medium' ? 'border-yellow-500' : 'border-blue-500']">
                    <h4 class="font-semibold text-slate-800 text-sm">{{ idx + 1 }}. {{ risk.clause }} ({{ risk.level === 'high' ? 'High Risk' : risk.level === 'medium' ? 'Medium Risk' : 'Low Risk' }})</h4>
                    <p class="text-sm mt-2"><span :class="risk.level === 'high' ? 'text-red-600' : 'text-yellow-600'" class="font-medium">Risk: </span> {{ risk.reason }}</p>
                    <p class="text-sm mt-1"><span class="text-green-600 font-medium">Suggestion: </span> {{ risk.suggestion }}</p>
                  </div>
                  <div v-for="(missing, idx) in contractResult.missing_clauses" :key="'m'+idx" class="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-lg">
                    <h4 class="font-semibold text-blue-900 text-sm flex items-center"><i class="ph ph-plus text-base mr-1"></i> Complete: {{ missing }}</h4>
                    <p class="text-sm mt-1 text-blue-700">No "{{ missing }}" related clause found. Recommended to add.</p>
                  </div>
                  <div v-if="contractResult.summary" class="bg-slate-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-slate-800 mb-2 text-sm">Review Summary</h4>
                    <p class="text-sm text-slate-600">{{ contractResult.summary }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contract Compare - Contract Comparison -->
          <div v-if="currentView === 'contract-compare'" class="page-container animate-fade-in">
            <div class="mb-8">
              <h1 class="text-2xl font-bold text-slate-800 flex items-center"><i class="ph ph-git-diff text-2xl text-violet-600 mr-2"></i> Smart Contract Version Comparison</h1>
              <p class="text-slate-500 mt-1">Upload original and revised contracts, AI automatically identifies clause differences and generates detailed comparison reports</p>
            </div>

            <!-- Step 1: File Upload -->
            <div v-if="compareStep === 1">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <h3 class="text-sm font-semibold text-slate-700 mb-2 flex items-center"><i class="ph ph-file-doc text-base text-blue-500 mr-1.5"></i>Original Contract</h3>
                  <div class="compare-upload-zone" :class="{ 'has-file': compareOriginalFile }" @click="compareOriginalInput?.click()" @dragover.prevent @drop.prevent="handleCompareOriginalDrop">
                    <input type="file" ref="compareOriginalInput" class="hidden" accept=".pdf,.docx,.txt" @change="handleCompareOriginalSelect" />
                    <template v-if="!compareOriginalFile">
                      <i class="ph ph-cloud-arrow-up text-4xl text-slate-300 mb-2"></i>
                      <p class="text-sm font-medium text-slate-600">Click or drag to upload original contract</p>
                      <p class="text-xs text-slate-400 mt-1">Supports .docx .pdf .txt, max 10MB</p>
                    </template>
                    <template v-else>
                      <i class="ph ph-file-check text-3xl text-green-500 mb-2"></i>
                      <p class="text-sm font-medium text-slate-800 truncate">{{ compareOriginalFile.name }}</p>
                      <p class="text-xs text-slate-400 mt-1">{{ (compareOriginalFile.size / 1024).toFixed(1) }} KB</p>
                      <button @click.stop="compareOriginalFile = null" class="mt-2 text-xs text-red-500 hover:text-red-700"><i class="ph ph-x mr-0.5"></i>Remove</button>
                    </template>
                  </div>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-slate-700 mb-2 flex items-center"><i class="ph ph-file-plus text-base text-violet-500 mr-1.5"></i>New Contract / Revision</h3>
                  <div class="compare-upload-zone" :class="{ 'has-file': compareRevisedFile }" @click="compareRevisedInput?.click()" @dragover.prevent @drop.prevent="handleCompareRevisedDrop">
                    <input type="file" ref="compareRevisedInput" class="hidden" accept=".pdf,.docx,.txt" @change="handleCompareRevisedSelect" />
                    <template v-if="!compareRevisedFile">
                      <i class="ph ph-cloud-arrow-up text-4xl text-slate-300 mb-2"></i>
                      <p class="text-sm font-medium text-slate-600">Click or drag to upload revised contract</p>
                      <p class="text-xs text-slate-400 mt-1">Supports .docx .pdf .txt, max 10MB</p>
                    </template>
                    <template v-else>
                      <i class="ph ph-file-check text-3xl text-green-500 mb-2"></i>
                      <p class="text-sm font-medium text-slate-800 truncate">{{ compareRevisedFile.name }}</p>
                      <p class="text-xs text-slate-400 mt-1">{{ (compareRevisedFile.size / 1024).toFixed(1) }} KB</p>
                      <button @click.stop="compareRevisedFile = null" class="mt-2 text-xs text-red-500 hover:text-red-700"><i class="ph ph-x mr-0.5"></i>Remove</button>
                    </template>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <button @click="loadCompareHistory()" class="btn-outline text-sm"><i class="ph ph-clock-counter-clockwise mr-1.5"></i>View History</button>
                <button @click="startCompare" :disabled="!compareOriginalFile || !compareRevisedFile || isComparing" class="btn-primary text-sm"><i class="ph ph-git-diff mr-1.5"></i>{{ isComparing ? 'Comparing...' : 'Start Comparison' }}</button>
              </div>
            </div>

            <!-- Step 2: Comparing -->
            <div v-if="compareStep === 2" class="card text-center py-16">
              <div class="spinner-lg mx-auto mb-5"></div>
              <h3 class="text-lg font-medium text-slate-800 mb-2">AI is comparing and analyzing...</h3>
              <p class="text-slate-500 text-sm">{{ compareProgress }}</p>
            </div>

            <!-- Step 3: Comparison Results -->
            <div v-if="compareStep === 3 && compareResult" class="space-y-5">
              <div class="flex items-center justify-between">
                <button @click="compareStep = 1; compareResult = null" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Back to Upload</button>
                <button @click="exportCompareReport" class="btn-primary text-sm"><i class="ph ph-download-simple mr-1.5"></i>Export Report</button>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div class="lg:col-span-4 space-y-5">
                  <div class="card">
                    <h3 class="font-semibold text-slate-800 mb-4">Change Overview</h3>
                    <div class="space-y-3 text-sm">
                      <div class="flex justify-between"><span class="text-slate-600">Total Changes</span><span class="font-bold text-slate-800">{{ compareResult.summary?.total_changes || 0 }}</span></div>
                      <div class="flex justify-between items-center"><span class="text-slate-600">Added Clauses</span><span class="font-medium text-green-600">+{{ compareResult.summary?.added_count || 0 }}</span></div>
                      <div class="flex justify-between items-center"><span class="text-slate-600">Deleted Clauses</span><span class="font-medium text-red-600">-{{ compareResult.summary?.deleted_count || 0 }}</span></div>
                      <div class="flex justify-between items-center"><span class="text-slate-600">Modified Clauses</span><span class="font-medium text-amber-600">~{{ compareResult.summary?.modified_count || 0 }}</span></div>
                      <hr class="border-slate-100"/>
                      <div class="flex justify-between"><span class="text-slate-600">Overall Risk</span><span :class="compareResult.summary?.overall_risk === 'high' ? 'text-red-600' : compareResult.summary?.overall_risk === 'medium' ? 'text-amber-600' : 'text-green-600'" class="font-bold">{{ compareResult.summary?.overall_risk === 'high' ? 'High Risk' : compareResult.summary?.overall_risk === 'medium' ? 'Medium Risk' : 'Low Risk' }}</span></div>
                    </div>
                  </div>
                  <div v-if="compareResult.summary?.key_changes?.length" class="card">
                    <h3 class="font-semibold text-slate-800 mb-3">Key Changes</h3>
                    <div class="space-y-2">
                      <div v-for="(change, idx) in compareResult.summary.key_changes" :key="idx" class="flex items-start text-sm text-slate-700">
                        <i class="ph ph-warning-circle text-amber-500 mr-2 mt-0.5 flex-shrink-0"></i>{{ change }}
                      </div>
                    </div>
                  </div>
                  <div v-if="compareResult.summary?.recommendation" class="card bg-blue-50 border-blue-100">
                    <h3 class="font-semibold text-blue-900 mb-2 flex items-center"><i class="ph ph-lightbulb text-base mr-1.5"></i>Review Suggestions</h3>
                    <p class="text-sm text-blue-800">{{ compareResult.summary.recommendation }}</p>
                  </div>
                </div>

                <div class="lg:col-span-8 card overflow-hidden !p-0">
                  <div class="bg-slate-50 p-4 border-b border-slate-100 font-medium text-slate-800 text-sm flex items-center"><i class="ph ph-list-dashes mr-2"></i>Detailed Differences</div>
                  <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div v-for="(diff, idx) in compareResult.diff_items" :key="idx" :class="['border-l-4 pl-4 p-4 rounded-r-lg', diff.type === 'added' ? 'border-green-500 bg-green-50' : diff.type === 'deleted' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50']">
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-slate-800 text-sm flex items-center">
                          <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2', diff.type === 'added' ? 'bg-green-200 text-green-800' : diff.type === 'deleted' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800']">{{ diff.type === 'added' ? 'Added' : diff.type === 'deleted' ? 'Delete' : 'Modified' }}</span>
                          {{ diff.clause_title }}
                        </h4>
                        <span :class="['text-xs px-2 py-0.5 rounded', diff.risk_level === 'high' ? 'bg-red-100 text-red-700' : diff.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700']">{{ diff.risk_level === 'high' ? 'High Risk' : diff.risk_level === 'medium' ? 'Medium Risk' : 'Low Risk' }}</span>
                      </div>
                      <p class="text-sm text-slate-600 mb-2">{{ diff.change_description }}</p>
                      <div v-if="diff.original_content" class="mb-2">
                        <p class="text-xs font-medium text-red-600 mb-1"><i class="ph ph-minus mr-1"></i>Original Content:</p>
                        <p class="text-sm text-slate-700 bg-white p-2 rounded border border-red-100">{{ diff.original_content }}</p>
                      </div>
                      <div v-if="diff.revised_content">
                        <p class="text-xs font-medium text-green-600 mb-1"><i class="ph ph-plus mr-1"></i>Revised Content:</p>
                        <p class="text-sm text-slate-700 bg-white p-2 rounded border border-green-100">{{ diff.revised_content }}</p>
                      </div>
                      <div v-if="diff.legal_impact" class="mt-2">
                        <p class="text-xs font-medium text-slate-500 mb-1"><i class="ph ph-scales mr-1"></i>Legal Impact:</p>
                        <p class="text-sm text-slate-600">{{ diff.legal_impact }}</p>
                      </div>
                    </div>
                    <div v-if="!compareResult.diff_items?.length" class="text-center py-10 text-slate-400">
                      <i class="ph ph-check-circle text-4xl mb-2"></i>
                      <p>No significant differences detected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 4: History -->
            <div v-if="compareStep === 4" class="space-y-5">
              <div class="flex items-center justify-between">
                <button @click="compareStep = 1" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Back to Upload</button>
                <button @click="loadCompareHistory()" class="btn-outline text-sm"><i class="ph ph-arrows-clockwise mr-1.5"></i>Refresh</button>
              </div>
              <div v-if="isLoadingCompareHistory" class="card text-center py-10">
                <div class="spinner-lg mx-auto mb-4" style="width:3rem;height:3rem"></div>
                <p class="text-slate-500 text-sm">Loading...</p>
              </div>
              <div v-else-if="!compareHistory.length" class="card text-center py-16">
                <i class="ph ph-clock-counter-clockwise text-5xl text-slate-200 mb-4"></i>
                <h3 class="text-lg font-medium text-slate-500 mb-2">No History Records</h3>
                <p class="text-slate-400 text-sm">Records will be saved here after completing contract comparisons</p>
                <button @click="compareStep = 1" class="btn-primary text-sm mt-4"><i class="ph ph-plus mr-1.5"></i>Start First Comparison</button>
              </div>
              <div v-else class="space-y-3">
                <div v-for="record in compareHistory" :key="record.id" class="card hover:shadow-md transition-shadow cursor-pointer" @click="viewCompareDetail(record.id)">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <div class="p-2.5 bg-violet-50 text-violet-600 rounded-lg"><i class="ph ph-git-diff text-xl"></i></div>
                      <div>
                        <p class="text-sm font-medium text-slate-800">{{ record.original_filename }} <i class="ph ph-arrow-right text-xs text-slate-400 mx-1"></i> {{ record.revised_filename }}</p>
                        <p class="text-xs text-slate-400 mt-0.5">{{ record.created_at }}</p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-4">
                      <div class="text-right">
                        <p class="text-sm font-medium text-slate-800">{{ record.total_changes }}  changes</p>
                        <span :class="['text-xs', record.overall_risk === 'high' ? 'text-red-600' : record.overall_risk === 'medium' ? 'text-amber-600' : 'text-green-600']">{{ record.overall_risk === 'high' ? 'High Risk' : record.overall_risk === 'medium' ? 'Medium Risk' : 'Low Risk' }}</span>
                      </div>
                      <button @click.stop="deleteCompareRecord(record.id)" class="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><i class="ph ph-trash text-base"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AISmart Proofreading -->
          <div v-if="currentView === 'proofread'" class="page-container animate-fade-in">
            <div class="mb-8">
              <h1 class="text-2xl font-bold text-slate-800 flex items-center"><i class="ph ph-text-aa text-2xl text-emerald-600 mr-2"></i> AISmart Proofreading</h1>
              <p class="text-slate-500 mt-1">Upload a document or enter text, AI automatically identifies grammar, spelling, punctuation errors and provides correction suggestions</p>
            </div>

            <!-- Step 1: Upload/Input -->
            <div v-if="proofreadStep === 1">
              <div class="mb-5">
                <div class="flex items-center space-x-3 mb-4">
                  <button @click="proofreadInputMode = 'file'" :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', proofreadInputMode === 'file' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"><i class="ph ph-upload-simple mr-1.5"></i>File Upload</button>
                  <button @click="proofreadInputMode = 'text'" :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', proofreadInputMode === 'text' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"><i class="ph ph-text-aa mr-1.5"></i>Text Input</button>
                </div>

                <div v-if="proofreadInputMode === 'file'">
                  <div class="proofread-upload-zone" :class="{ 'has-file': proofreadFile }" @click="proofreadFileInput?.click()" @dragover.prevent @drop.prevent="handleProofreadDrop">
                    <input type="file" ref="proofreadFileInput" class="hidden" accept=".pdf,.docx,.txt" @change="handleProofreadSelect" />
                    <template v-if="!proofreadFile">
                      <i class="ph ph-cloud-arrow-up text-5xl text-slate-300 mb-3"></i>
                      <p class="text-base font-medium text-slate-600">Click or drag to upload document</p>
                      <p class="text-sm text-slate-400 mt-2">Supports .docx .pdf .txt, max 10MB</p>
                    </template>
                    <template v-else>
                      <i class="ph ph-file-check text-4xl text-green-500 mb-2"></i>
                      <p class="text-sm font-medium text-slate-800 truncate">{{ proofreadFile.name }}</p>
                      <p class="text-xs text-slate-400 mt-1">{{ (proofreadFile.size / 1024).toFixed(1) }} KB</p>
                      <button @click.stop="proofreadFile = null" class="mt-2 text-xs text-red-500 hover:text-red-700"><i class="ph ph-x mr-0.5"></i>Remove</button>
                    </template>
                  </div>
                </div>

                <div v-if="proofreadInputMode === 'text'">
                  <textarea v-model="proofreadTextInput" class="w-full h-48 p-4 border border-slate-200 rounded-lg text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Paste or enter the text to proofread (at least 10 characters)..."></textarea>
                  <p class="text-xs text-slate-400 mt-1 text-right">{{ (proofreadTextInput || '').length }}  characters</p>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <button @click="loadProofreadHistory()" class="btn-outline text-sm"><i class="ph ph-clock-counter-clockwise mr-1.5"></i>Proofreading Records</button>
                <button @click="startProofread" :disabled="isProofreadDisabled" class="btn-primary text-sm"><i class="ph ph-text-aa mr-1.5"></i>{{ isProofreading ? 'Proofreading...' : 'Start Proofreading' }}</button>
              </div>
            </div>

            <!-- Step 2: Proofreading -->
            <div v-if="proofreadStep === 2" class="card text-center py-16">
              <div class="spinner-lg mx-auto mb-5"></div>
              <h3 class="text-lg font-medium text-slate-800 mb-2">AI is proofreading and analyzing...</h3>
              <p class="text-slate-500 text-sm">{{ proofreadProgress }}</p>
            </div>

            <!-- Step 3: Proofreading Results -->
            <div v-if="proofreadStep === 3 && proofreadResult" class="space-y-5">
              <div class="flex items-center justify-between">
                <button @click="proofreadStep = 1; proofreadResult = null" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Back to Upload</button>
                <div class="flex items-center space-x-3">
                  <button @click="applyAllCorrections" v-if="proofreadResult.errors?.length" class="btn-primary text-sm"><i class="ph ph-check-circle mr-1.5"></i>Fix All</button>
                  <button @click="exportProofreadReport" class="btn-outline text-sm"><i class="ph ph-download-simple mr-1.5"></i>Export Report</button>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div class="lg:col-span-4 space-y-5">
                  <div class="card">
                    <h3 class="font-semibold text-slate-800 mb-4">Proofreading Overview</h3>
                    <div class="space-y-3 text-sm">
                      <div class="flex justify-between"><span class="text-slate-600">Total Errors</span><span class="font-bold text-slate-800">{{ proofreadResult.summary?.total_errors || 0 }}</span></div>
                      <div class="flex justify-between items-center"><span class="text-slate-600">Grammar Errors</span><span class="font-medium text-red-600">{{ proofreadResult.summary?.grammar_count || 0 }}</span></div>
                      <div class="flex justify-between items-center"><span class="text-slate-600">Spelling Errors</span><span class="font-medium text-orange-600">{{ proofreadResult.summary?.spelling_count || 0 }}</span></div>
                      <div class="flex justify-between items-center"><span class="text-slate-600">Punctuation Issues</span><span class="font-medium text-amber-600">{{ proofreadResult.summary?.punctuation_count || 0 }}</span></div>
                      <div class="flex justify-between items-center"><span class="text-slate-600">Fluency Issues</span><span class="font-medium text-blue-600">{{ proofreadResult.summary?.fluency_count || 0 }}</span></div>
                      <div class="flex justify-between items-center"><span class="text-slate-600">Wording Issues</span><span class="font-medium text-purple-600">{{ proofreadResult.summary?.wording_count || 0 }}</span></div>
                      <hr class="border-slate-100"/>
                      <div class="flex justify-between"><span class="text-slate-600">Document Quality</span><span :class="qualityLabel(proofreadResult.summary?.overall_quality).cls" class="font-bold">{{ qualityLabel(proofreadResult.summary?.overall_quality).text }}</span></div>
                    </div>
                  </div>

                  <div class="card">
                    <h3 class="font-semibold text-slate-800 mb-3">Severity Distribution</h3>
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-slate-600 flex items-center"><span class="w-3 h-3 rounded-full bg-red-500 mr-2"></span>Severe</span>
                        <span class="text-sm font-bold text-red-600">{{ proofreadResult.summary?.high_severity_count || 0 }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-slate-600 flex items-center"><span class="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>Medium</span>
                        <span class="text-sm font-bold text-amber-600">{{ proofreadResult.summary?.medium_severity_count || 0 }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-slate-600 flex items-center"><span class="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>Minor</span>
                        <span class="text-sm font-bold text-blue-600">{{ proofreadResult.summary?.low_severity_count || 0 }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="proofreadResult.summary?.recommendation" class="card bg-emerald-50 border-emerald-100">
                    <h3 class="font-semibold text-emerald-900 mb-2 flex items-center"><i class="ph ph-lightbulb text-base mr-1.5"></i>Suggestions</h3>
                    <p class="text-sm text-emerald-800">{{ proofreadResult.summary.recommendation }}</p>
                  </div>
                </div>

                <div class="lg:col-span-8 card overflow-hidden !p-0">
                  <div class="bg-slate-50 p-4 border-b border-slate-100 font-medium text-slate-800 text-sm flex items-center justify-between">
                    <span class="flex items-center"><i class="ph ph-list-dashes mr-2"></i>Error Details</span>
                    <span class="text-xs text-slate-400">Total {{ proofreadResult.errors?.length || 0 }} errors</span>
                  </div>
                  <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div v-for="(err, idx) in proofreadResult.errors" :key="idx" :class="['border-l-4 pl-4 p-4 rounded-r-lg', err.severity === 'high' ? 'border-red-500 bg-red-50' : err.severity === 'medium' ? 'border-amber-500 bg-amber-50' : 'border-blue-500 bg-blue-50']">
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-slate-800 text-sm flex items-center">
                          <span :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2', errorTypeStyle(err.error_type).cls]">{{ errorTypeStyle(err.error_type).label }}</span>
                          {{ err.position_hint || `No. ${err.id}` }}
                        </h4>
                        <span :class="['text-xs px-2 py-0.5 rounded', err.severity === 'high' ? 'bg-red-100 text-red-700' : err.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700']">{{ err.severity === 'high' ? 'Severe' : err.severity === 'medium' ? 'Medium' : 'Minor' }}</span>
                      </div>
                      <div class="mb-2">
                        <p class="text-xs font-medium text-red-600 mb-1"><i class="ph ph-x-circle mr-1"></i>Original: </p>
                        <p class="text-sm text-slate-700 bg-white p-2 rounded border border-red-100">{{ err.original_text }}</p>
                      </div>
                      <div class="mb-2">
                        <p class="text-xs font-medium text-green-600 mb-1"><i class="ph ph-check-circle mr-1"></i>Correction: </p>
                        <p class="text-sm text-slate-700 bg-white p-2 rounded border border-green-100">{{ err.corrected_text }}</p>
                      </div>
                      <p class="text-sm text-slate-600"><i class="ph ph-info text-slate-400 mr-1"></i>{{ err.error_description }}</p>
                      <div v-if="err.suggestion" class="mt-2">
                        <p class="text-xs font-medium text-emerald-600 mb-1"><i class="ph ph-lightbulb mr-1"></i>Suggestion: </p>
                        <p class="text-sm text-slate-600 bg-emerald-50 p-2 rounded">{{ err.suggestion }}</p>
                      </div>
                      <div class="mt-3 flex justify-end">
                        <button @click="applySingleCorrection(idx)" class="text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><i class="ph ph-check mr-1"></i>Accept Fix</button>
                      </div>
                    </div>
                    <div v-if="!proofreadResult.errors?.length" class="text-center py-10 text-slate-400">
                      <i class="ph ph-check-circle text-5xl mb-3"></i>
                      <p class="text-lg font-medium">Document quality is excellent, no errors found</p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="proofreadCorrectedText" class="card">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-slate-800 flex items-center"><i class="ph ph-file-check text-base text-emerald-600 mr-1.5"></i>Corrected Full Text</h3>
                  <button @click="copyCorrectedText" class="btn-outline text-xs"><i class="ph ph-copy mr-1"></i>Copy All</button>
                </div>
                <div class="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 max-h-96 overflow-y-auto whitespace-pre-wrap">{{ proofreadCorrectedText }}</div>
              </div>
            </div>

            <!-- Step 4: History -->
            <div v-if="proofreadStep === 4" class="space-y-5">
              <div class="flex items-center justify-between">
                <button @click="proofreadStep = 1" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Back to Upload</button>
                <button @click="loadProofreadHistory()" class="btn-outline text-sm"><i class="ph ph-arrows-clockwise mr-1.5"></i>Refresh</button>
              </div>
              <div v-if="isLoadingProofreadHistory" class="card text-center py-10">
                <div class="spinner-lg mx-auto mb-4" style="width:3rem;height:3rem"></div>
                <p class="text-slate-500 text-sm">Loading...</p>
              </div>
              <div v-else-if="!proofreadHistory.length" class="card text-center py-16">
                <i class="ph ph-clock-counter-clockwise text-5xl text-slate-200 mb-4"></i>
                <h3 class="text-lg font-medium text-slate-500 mb-2">No Proofreading Records</h3>
                <p class="text-slate-400 text-sm">Records will be saved here after completing document proofreading</p>
                <button @click="proofreadStep = 1" class="btn-primary text-sm mt-4"><i class="ph ph-plus mr-1.5"></i>Start First Proofreading</button>
              </div>
              <div v-else class="space-y-3">
                <div v-for="record in proofreadHistory" :key="record.id" class="card hover:shadow-md transition-shadow cursor-pointer" @click="viewProofreadDetail(record.id)">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><i class="ph ph-text-aa text-xl"></i></div>
                      <div>
                        <p class="text-sm font-medium text-slate-800">{{ record.filename }}</p>
                        <p class="text-xs text-slate-400 mt-0.5">{{ record.created_at }}</p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-4">
                      <div class="text-right">
                        <p class="text-sm font-medium text-slate-800">{{ record.total_errors }}  errors</p>
                        <span :class="['text-xs', qualityLabel(record.overall_quality).cls]">{{ qualityLabel(record.overall_quality).text }}</span>
                      </div>
                      <button @click.stop="deleteProofreadRecord(record.id)" class="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><i class="ph ph-trash text-base"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Smart Legal Document Interpretation -->
          <div v-if="currentView === 'doc-interpret'" class="page-container animate-fade-in">
            <div class="mb-8">
              <h1 class="text-2xl font-bold text-slate-800 flex items-center"><i class="ph ph-book-open-text text-2xl text-amber-600 mr-2"></i> Smart Legal Document Interpretation</h1>
              <p class="text-slate-500 mt-1">Complex clauses, explained instantly — Upload legal documents, AI smartly analyzes key clauses and risks</p>
            </div>

            <!-- Step 1: Upload Document -->
            <div v-if="interpretStep === 1">
              <div class="mb-5">
                <div class="flex items-center space-x-3 mb-4">
                  <button @click="interpretInputMode = 'file'" :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', interpretInputMode === 'file' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"><i class="ph ph-upload-simple mr-1.5"></i>Upload Document</button>
                  <button @click="interpretInputMode = 'text'" :class="['px-4 py-2 rounded-lg text-sm font-medium transition-colors', interpretInputMode === 'text' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"><i class="ph ph-text-aa mr-1.5"></i>Text Input</button>
                </div>

                <div v-if="interpretInputMode === 'file'">
                  <div class="interpret-upload-zone" :class="{ 'has-file': interpretFile }" @click="interpretFileInput?.click()" @dragover.prevent @drop.prevent="handleInterpretDrop">
                    <input type="file" ref="interpretFileInput" class="hidden" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" @change="handleInterpretSelect" />
                    <template v-if="!interpretFile">
                      <i class="ph ph-cloud-arrow-up text-5xl text-slate-300 mb-3"></i>
                      <p class="text-base font-medium text-slate-600">Drag files here, or click to upload</p>
                      <p class="text-sm text-slate-400 mt-2">Supports PDF, Word documents and images (JPG/PNG), max 10MB</p>
                    </template>
                    <template v-else>
                      <i class="ph ph-file-check text-4xl text-green-500 mb-2"></i>
                      <p class="text-sm font-medium text-slate-800 truncate">{{ interpretFile.name }}</p>
                      <p class="text-xs text-slate-400 mt-1">{{ (interpretFile.size / 1024).toFixed(1) }} KB</p>
                      <button @click.stop="interpretFile = null" class="mt-2 text-xs text-red-500 hover:text-red-700"><i class="ph ph-x mr-0.5"></i>Remove</button>
                    </template>
                  </div>
                </div>

                <div v-if="interpretInputMode === 'text'">
                  <textarea v-model="interpretTextInput" class="w-full h-48 p-4 border border-slate-200 rounded-lg text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" placeholder="Paste or enter the legal document content to interpret (at least 10 characters)..."></textarea>
                  <p class="text-xs text-slate-400 mt-1 text-right">{{ (interpretTextInput || '').length }}  characters</p>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <button @click="loadInterpretHistory()" class="btn-outline text-sm"><i class="ph ph-clock-counter-clockwise mr-1.5"></i>Interpretation History</button>
                <button @click="startInterpret" :disabled="isInterpretDisabled" class="btn-primary text-sm" style="background-color: #f59e0b;"><i class="ph ph-book-open-text mr-1.5"></i>{{ isInterpreting ? 'Interpreting...' : 'Start Interpretation' }}</button>
              </div>
            </div>

            <!-- Step 2: Preview & Confirm -->
            <div v-if="interpretStep === 2" class="space-y-5">
              <div class="card">
                <h3 class="font-semibold text-slate-800 mb-4 flex items-center"><i class="ph ph-eye text-base text-amber-500 mr-2"></i>Preview & Confirm</h3>
                <div v-if="interpretFile" class="space-y-4">
                  <div class="flex items-center space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <div class="p-3 bg-amber-100 rounded-lg"><i class="ph ph-file text-2xl text-amber-600"></i></div>
                    <div class="flex-1">
                      <p class="text-sm font-medium text-slate-800">{{ interpretFile.name }}</p>
                      <div class="flex items-center space-x-3 mt-1">
                        <span class="text-xs text-slate-400">{{ (interpretFile.size / 1024).toFixed(1) }} KB</span>
                        <span class="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">{{ interpretFile.name.split('.').pop().toUpperCase() }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="p-4 bg-slate-50 rounded-lg">
                    <p class="text-sm text-slate-600 mb-2">Please confirm the uploaded file is correct. Interpretation will begin after confirmation.</p>
                    <div class="flex items-center space-x-2 text-xs text-slate-400">
                      <i class="ph ph-info text-sm"></i>
                      <span>The interpretation process will automatically extract document content and analyze key clauses</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <button @click="interpretStep = 1" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Back to Upload</button>
                <button @click="confirmInterpret" :disabled="isInterpreting" class="btn-primary text-sm" style="background-color: #f59e0b;"><i class="ph ph-book-open-text mr-1.5"></i>{{ isInterpreting ? 'Interpreting...' : 'Confirm & Interpret' }}</button>
              </div>
            </div>

            <!-- Step 3: Interpreting -->
            <div v-if="interpretStep === 3" class="card text-center py-16">
              <div class="spinner-lg mx-auto mb-5"></div>
              <h3 class="text-lg font-medium text-slate-800 mb-2">AI is interpreting...</h3>
              <p class="text-slate-500 text-sm">{{ interpretProgress }}</p>
            </div>

            <!-- Step 4: Interpretation Results -->
            <div v-if="interpretStep === 4 && interpretResult" class="space-y-5">
              <div class="flex items-center justify-between">
                <button @click="interpretStep = 1; interpretResult = null" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Back to Upload</button>
                <div class="flex items-center space-x-3">
                  <button @click="exportInterpretReport" class="btn-outline text-sm"><i class="ph ph-download-simple mr-1.5"></i>Export Report</button>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div class="lg:col-span-4 space-y-5">
                  <div class="card">
                    <h3 class="font-semibold text-slate-800 mb-4">Interpretation Overview</h3>
                    <div class="space-y-3 text-sm">
                      <div class="flex justify-between"><span class="text-slate-600">Document Type</span><span class="font-medium text-slate-800">{{ interpretResult.document_type }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-600">Comprehension Difficulty</span><span :class="difficultyStyle(interpretResult.difficulty_level).cls" class="font-bold">{{ difficultyStyle(interpretResult.difficulty_level).text }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-600">Interpretation Score</span><span :class="interpretResult.interpretation_score >= 80 ? 'text-green-600' : interpretResult.interpretation_score >= 60 ? 'text-amber-600' : 'text-red-600'" class="font-bold">{{ interpretResult.interpretation_score }} pts</span></div>
                      <div class="flex justify-between"><span class="text-slate-600">Key Clauses</span><span class="font-medium">{{ interpretResult.key_clauses?.length || 0 }}  items</span></div>
                      <div class="flex justify-between"><span class="text-slate-600">Risk Warnings</span><span class="font-medium text-red-600">{{ interpretResult.risk_warnings?.length || 0 }}  items</span></div>
                      <div class="flex justify-between"><span class="text-slate-600">Key Deadlines</span><span class="font-medium">{{ interpretResult.key_deadlines?.length || 0 }}  items</span></div>
                    </div>
                    <hr class="my-4 border-slate-100"/>
                    <div v-if="interpretResult.parties?.length" class="mb-3">
                      <p class="text-xs font-medium text-slate-500 mb-2">Parties</p>
                      <div class="flex flex-wrap gap-1.5">
                        <span v-for="party in interpretResult.parties" :key="party" class="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200">{{ party }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="interpretResult.risk_warnings?.length" class="card">
                    <h3 class="font-semibold text-slate-800 mb-3 flex items-center"><i class="ph ph-warning text-base text-red-500 mr-1.5"></i>Risk Warnings</h3>
                    <div class="space-y-2">
                      <div v-for="(risk, idx) in interpretResult.risk_warnings" :key="idx" class="flex items-start text-sm">
                        <i :class="risk.severity === 'high' ? 'ph ph-warning-circle text-red-500' : risk.severity === 'medium' ? 'ph ph-warning text-amber-500' : 'ph ph-info text-blue-500'" class="text-base mr-2 mt-0.5 flex-shrink-0"></i>
                        <div>
                          <p class="font-medium text-slate-800">{{ risk.risk_title }}</p>
                          <p class="text-slate-500 text-xs mt-0.5">{{ risk.description }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="interpretResult.key_deadlines?.length" class="card">
                    <h3 class="font-semibold text-slate-800 mb-3 flex items-center"><i class="ph ph-timer text-base text-amber-500 mr-1.5"></i>Key Deadlines</h3>
                    <div class="space-y-3">
                      <div v-for="(dl, idx) in interpretResult.key_deadlines" :key="idx" class="text-sm">
                        <p class="font-medium text-slate-800">{{ dl.deadline_desc }}</p>
                        <p class="text-amber-600 text-xs mt-0.5">{{ dl.date_or_period }}</p>
                        <p v-if="dl.consequence" class="text-red-500 text-xs mt-0.5">Consequence of delay: {{ dl.consequence }}</p>
                      </div>
                    </div>
                  </div>

                  <div v-if="interpretResult.action_suggestions?.length" class="card bg-amber-50 border-amber-100">
                    <h3 class="font-semibold text-amber-900 mb-2 flex items-center"><i class="ph ph-lightbulb text-base mr-1.5"></i>Action Suggestions</h3>
                    <div class="space-y-2">
                      <div v-for="(suggestion, idx) in interpretResult.action_suggestions" :key="idx" class="flex items-start text-sm text-amber-800">
                        <span class="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-0.5">{{ idx + 1 }}</span>
                        {{ suggestion }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="lg:col-span-8 space-y-5">
                  <div class="card">
                    <h3 class="font-semibold text-slate-800 mb-3 flex items-center"><i class="ph ph-article text-base text-amber-500 mr-1.5"></i>Document Summary</h3>
                    <p class="text-sm text-slate-700 leading-relaxed">{{ interpretResult.summary }}</p>
                    <div v-if="interpretResult.overall_assessment" class="mt-3 p-3 bg-slate-50 rounded-lg">
                      <p class="text-xs font-medium text-slate-500 mb-1">Overall Assessment</p>
                      <p class="text-sm text-slate-700">{{ interpretResult.overall_assessment }}</p>
                    </div>
                  </div>

                  <div class="card overflow-hidden !p-0">
                    <div class="bg-slate-50 p-4 border-b border-slate-100 font-medium text-slate-800 text-sm flex items-center justify-between">
                      <span class="flex items-center"><i class="ph ph-list-dashes mr-2"></i>Key Clause Interpretation</span>
                      <span class="text-xs text-slate-400">Total {{ interpretResult.key_clauses?.length || 0 }} items</span>
                    </div>
                    <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                      <div v-for="(clause, idx) in interpretResult.key_clauses" :key="idx" :class="['border-l-4 pl-4 p-4 rounded-r-lg', clause.risk_level === 'high' ? 'border-red-500 bg-red-50' : clause.risk_level === 'medium' ? 'border-amber-500 bg-amber-50' : 'border-green-500 bg-green-50']">
                        <div class="flex items-center justify-between mb-2">
                          <h4 class="font-semibold text-slate-800 text-sm">{{ idx + 1 }}. {{ clause.clause_title }}</h4>
                          <span v-if="clause.risk_level !== 'none'" :class="['text-xs px-2 py-0.5 rounded', clause.risk_level === 'high' ? 'bg-red-100 text-red-700' : clause.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700']">{{ clause.risk_level === 'high' ? 'High Risk' : clause.risk_level === 'medium' ? 'Medium Risk' : 'Low Risk' }}</span>
                        </div>
                        <div class="mb-2">
                          <p class="text-xs font-medium text-slate-500 mb-1"><i class="ph ph-quotes mr-1"></i>Original: </p>
                          <p class="text-sm text-slate-600 bg-white p-2 rounded border border-slate-100">{{ clause.original_text }}</p>
                        </div>
                        <div class="mb-2">
                          <p class="text-xs font-medium text-amber-600 mb-1"><i class="ph ph-lightbulb mr-1"></i>Plain Language:</p>
                          <p class="text-sm text-slate-800">{{ clause.interpretation }}</p>
                        </div>
                        <div v-if="clause.legal_significance">
                          <p class="text-xs font-medium text-blue-600 mb-1"><i class="ph ph-scales mr-1"></i>Legal Significance:</p>
                          <p class="text-sm text-slate-600">{{ clause.legal_significance }}</p>
                        </div>
                      </div>
                      <div v-if="!interpretResult.key_clauses?.length" class="text-center py-10 text-slate-400">
                        <i class="ph ph-check-circle text-4xl mb-2"></i>
                        <p>No key clauses identified</p>
                      </div>
                    </div>
                  </div>

                  <div v-if="interpretResult.rights_obligations?.length" class="card">
                    <h3 class="font-semibold text-slate-800 mb-3 flex items-center"><i class="ph ph-users text-base text-blue-500 mr-1.5"></i>Rights & Obligations Analysis</h3>
                    <div class="space-y-4">
                      <div v-for="(ro, idx) in interpretResult.rights_obligations" :key="idx" class="p-4 bg-slate-50 rounded-lg">
                        <h4 class="font-semibold text-slate-800 text-sm mb-3">{{ ro.party }}</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p class="text-xs font-medium text-green-600 mb-2"><i class="ph ph-shield-check mr-1"></i>Rights</p>
                            <div class="space-y-1">
                              <p v-for="(right, ri) in ro.rights" :key="ri" class="text-sm text-slate-700 flex items-start"><span class="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 mt-1.5 flex-shrink-0"></span>{{ right }}</p>
                              <p v-if="!ro.rights?.length" class="text-xs text-slate-400">Not specified</p>
                            </div>
                          </div>
                          <div>
                            <p class="text-xs font-medium text-red-600 mb-2"><i class="ph ph-hand mr-1"></i>Obligations</p>
                            <div class="space-y-1">
                              <p v-for="(obligation, oi) in ro.obligations" :key="oi" class="text-sm text-slate-700 flex items-start"><span class="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 mt-1.5 flex-shrink-0"></span>{{ obligation }}</p>
                              <p v-if="!ro.obligations?.length" class="text-xs text-slate-400">Not specified</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="interpretResult.legal_terms?.length" class="card">
                    <h3 class="font-semibold text-slate-800 mb-3 flex items-center"><i class="ph ph-book-open text-base text-purple-500 mr-1.5"></i>Legal Terminology</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div v-for="(term, idx) in interpretResult.legal_terms" :key="idx" class="p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <p class="font-medium text-purple-900 text-sm">{{ term.term }}</p>
                        <p class="text-xs text-purple-700 mt-1">{{ term.definition }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 5: Interpretation History -->
            <div v-if="interpretStep === 5" class="space-y-5">
              <div class="flex items-center justify-between">
                <button @click="interpretStep = 1" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Back to Upload</button>
                <button @click="loadInterpretHistory()" class="btn-outline text-sm"><i class="ph ph-arrows-clockwise mr-1.5"></i>Refresh</button>
              </div>
              <div v-if="isLoadingInterpretHistory" class="card text-center py-10">
                <div class="spinner-lg mx-auto mb-4" style="width:3rem;height:3rem"></div>
                <p class="text-slate-500 text-sm">Loading...</p>
              </div>
              <div v-else-if="!interpretHistory.length" class="card text-center py-16">
                <i class="ph ph-clock-counter-clockwise text-5xl text-slate-200 mb-4"></i>
                <h3 class="text-lg font-medium text-slate-500 mb-2">No Interpretation Records</h3>
                <p class="text-slate-400 text-sm">Records will be saved here after completing document interpretations</p>
                <button @click="interpretStep = 1" class="btn-primary text-sm mt-4" style="background-color: #f59e0b;"><i class="ph ph-plus mr-1.5"></i>Start First Interpretation</button>
              </div>
              <div v-else class="space-y-3">
                <div v-for="record in interpretHistory" :key="record.id" class="card hover:shadow-md transition-shadow cursor-pointer" @click="viewInterpretDetail(record.id)">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                      <div class="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><i class="ph ph-book-open-text text-xl"></i></div>
                      <div>
                        <p class="text-sm font-medium text-slate-800">{{ record.filename }}</p>
                        <div class="flex items-center space-x-2 mt-0.5">
                          <span class="text-xs text-slate-400">{{ record.created_at }}</span>
                          <span class="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded">{{ record.document_type }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center space-x-4">
                      <div class="text-right">
                        <p class="text-sm font-medium text-slate-800">{{ record.interpretation_score }}  pts</p>
                        <span :class="['text-xs', difficultyStyle(record.difficulty_level).cls]">{{ difficultyStyle(record.difficulty_level).text }}</span>
                      </div>
                      <button @click.stop="deleteInterpretRecord(record.id)" class="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><i class="ph ph-trash text-base"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contract Draft - Smart Contract Drafting -->
          <div v-if="currentView === 'contract-draft'" class="page-container animate-fade-in">
            <!-- Step 1: Contract Template Display -->
            <div v-if="draftStep === 1">
              <div class="mb-6">
                <h1 class="text-2xl font-bold text-slate-800 flex items-center"><i class="ph ph-note-pencil text-2xl text-teal-600 mr-2"></i> Smart Contract Drafting</h1>
                <p class="text-slate-500 mt-1">Select a contract template, AI automatically generates professional contract documents</p>
              </div>
              <div v-if="isLoadingCategories" class="text-center py-16">
                <div class="spinner-lg mx-auto mb-5"></div>
                <p class="text-slate-500 text-sm">Loading contract templates...</p>
              </div>
              <template v-else>
                <div class="draft-search-bar">
                  <div class="draft-search-input-wrap">
                    <i class="ph ph-magnifying-glass text-slate-400 text-base"></i>
                    <input type="text" v-model="draftSearchKeyword" @input="handleDraftSearch" placeholder="Search contract templates, e.g.: sale, lease, labor..." class="draft-search-input" />
                    <button v-if="draftSearchKeyword" @click="clearDraftSearch" class="draft-search-clear"><i class="ph ph-x text-sm"></i></button>
                  </div>
                </div>

                <div v-if="draftSearchKeyword && draftSearchResults.length > 0" class="draft-search-results">
                  <div class="flex items-center justify-between mb-3">
                    <p class="text-sm text-slate-500">Found <span class="font-semibold text-slate-800">{{ draftSearchResults.length }}</span>  related templates</p>
                    <button @click="clearDraftSearch" class="text-xs text-teal-600 hover:text-teal-700 font-medium">Clear Search</button>
                  </div>
                  <div class="draft-template-grid">
                    <div v-for="tpl in draftSearchResults" :key="tpl.id" class="draft-tpl-card" @click="loadAndSelectTemplate(tpl.id)">
                      <div class="draft-tpl-card-header" :style="{ background: getCategoryGradient(tpl.category_id) }">
                        <i :class="['ph', getCategoryIcon(tpl.category_id), 'text-2xl text-white/90']"></i>
                        <button @click.stop="toggleFavorite(tpl.id)" :class="['draft-tpl-fav-btn', { 'is-fav': draftFavorites.includes(tpl.id) }]">
                          <i :class="draftFavorites.includes(tpl.id) ? 'ph ph-star-fill' : 'ph ph-star'" class="text-sm"></i>
                        </button>
                      </div>
                      <div class="draft-tpl-card-body">
                        <div class="flex items-center gap-1.5 mb-1.5">
                          <span class="draft-tpl-cat-badge" :style="{ background: getCategoryBadgeBg(tpl.category_id), color: getCategoryBadgeColor(tpl.category_id) }">{{ getCategoryName(tpl.category_id) }}</span>
                          <span v-if="!tpl.is_system" class="draft-tpl-custom-badge">Custom</span>
                        </div>
                        <h4 class="draft-tpl-card-title">{{ tpl.name }}</h4>
                        <p class="draft-tpl-card-desc">{{ tpl.description }}</p>
                        <div class="draft-tpl-card-footer">
                          <span class="draft-tpl-field-count"><i class="ph ph-textbox text-xs mr-1"></i>{{ tpl.field_count || tpl.fields?.length || '?' }}  elements</span>
                          <button @click.stop="openPreview(tpl)" class="draft-tpl-preview-btn">
                            <i class="ph ph-eye text-xs mr-1"></i>Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else-if="draftSearchKeyword && draftSearchResults.length === 0 && !isSearchingTemplates" class="draft-empty-state">
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <i class="ph ph-magnifying-glass text-3xl text-slate-300"></i>
                  </div>
                  <p class="text-slate-500 text-sm mb-1">No matching templates found</p>
                  <p class="text-slate-400 text-xs">Try other keywords, e.g.: sale, lease, labor</p>
                </div>

                <div v-else>
                <div class="draft-cat-tabs">
                  <button @click="draftActiveCategory = 'all'" :class="['draft-cat-tab', { active: draftActiveCategory === 'all' }]">
                    <i class="ph ph-squares-four text-base mr-1.5"></i>All Templates
                    <span v-if="totalTemplateCount" class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600">{{ totalTemplateCount }}</span>
                  </button>
                  <button @click="draftActiveCategory = 'favorites'" :class="['draft-cat-tab', { active: draftActiveCategory === 'favorites' }]">
                    <i class="ph ph-star text-base mr-1.5"></i>Favorites
                    <span v-if="draftFavorites.length" class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">{{ draftFavorites.length }}</span>
                  </button>
                  <button v-for="cat in contractCategories" :key="cat.id" @click="draftActiveCategory = cat.id" :class="['draft-cat-tab', { active: draftActiveCategory === cat.id }]">
                    <i :class="['ph', cat.icon, 'text-base mr-1.5']"></i>{{ cat.name }}
                  </button>
                </div>

                <div v-if="draftActiveCategory === 'favorites'">
                  <div v-if="favoriteTemplates.length === 0" class="draft-empty-state">
                    <div class="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                      <i class="ph ph-star text-3xl text-amber-300"></i>
                    </div>
                    <p class="text-slate-500 text-sm mb-1">No favorite templates</p>
                    <p class="text-slate-400 text-xs">Click the star on a template card to add to favorites</p>
                  </div>
                  <div v-else class="draft-template-grid">
                    <div v-for="tpl in favoriteTemplates" :key="tpl.id" class="draft-tpl-card" @click="loadAndSelectTemplate(tpl.id)">
                      <div class="draft-tpl-card-header" :style="{ background: getCategoryGradient(tpl.category_id) }">
                        <i :class="['ph', getCategoryIcon(tpl.category_id), 'text-2xl text-white/90']"></i>
                        <button @click.stop="toggleFavorite(tpl.id)" class="draft-tpl-fav-btn is-fav">
                          <i class="ph ph-star-fill text-sm"></i>
                        </button>
                      </div>
                      <div class="draft-tpl-card-body">
                        <div class="flex items-center gap-1.5 mb-1.5">
                          <span class="draft-tpl-cat-badge" :style="{ background: getCategoryBadgeBg(tpl.category_id), color: getCategoryBadgeColor(tpl.category_id) }">{{ getCategoryName(tpl.category_id) }}</span>
                          <span v-if="!tpl.is_system" class="draft-tpl-custom-badge">Custom</span>
                        </div>
                        <h4 class="draft-tpl-card-title">{{ tpl.name }}</h4>
                        <p class="draft-tpl-card-desc">{{ tpl.description }}</p>
                        <div class="draft-tpl-card-footer">
                          <span class="draft-tpl-field-count"><i class="ph ph-textbox text-xs mr-1"></i>{{ tpl.field_count || 0 }}  elements</span>
                          <button @click.stop="openPreview(tpl)" class="draft-tpl-preview-btn">
                            <i class="ph ph-eye text-xs mr-1"></i>Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else>
                  <div v-for="cat in displayedCategories" :key="cat.id" class="draft-category-section">
                    <div class="draft-category-header">
                      <div class="draft-category-icon" :style="{ background: getCategoryGradient(cat.id) }">
                        <i :class="['ph', cat.icon, 'text-lg text-white']"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="text-base font-bold text-slate-800">{{ cat.name }}</h3>
                        <p class="text-xs text-slate-400 mt-0.5">{{ cat.description }}</p>
                      </div>
                      <span class="draft-category-count">{{ cat.template_count }}  templates</span>
                    </div>
                    <div class="draft-template-grid">
                      <template v-for="sub in cat.subcategories" :key="sub.id">
                        <div v-for="tpl in sub.templates || []" :key="tpl.id" class="draft-tpl-card" @click="loadAndSelectTemplate(tpl.id)">
                          <div class="draft-tpl-card-header" :style="{ background: getCategoryGradient(cat.id) }">
                            <i :class="['ph', sub.icon, 'text-2xl text-white/90']"></i>
                            <button @click.stop="toggleFavorite(tpl.id)" :class="['draft-tpl-fav-btn', { 'is-fav': draftFavorites.includes(tpl.id) }]">
                              <i :class="draftFavorites.includes(tpl.id) ? 'ph ph-star-fill' : 'ph ph-star'" class="text-sm"></i>
                            </button>
                          </div>
                          <div class="draft-tpl-card-body">
                            <div class="flex items-center gap-1.5 mb-1.5">
                              <span class="draft-tpl-cat-badge" :style="{ background: getCategoryBadgeBg(cat.id), color: getCategoryBadgeColor(cat.id) }">{{ sub.name }}</span>
                            </div>
                            <h4 class="draft-tpl-card-title">{{ tpl.name }}</h4>
                            <p class="draft-tpl-card-desc">{{ tpl.description }}</p>
                            <div class="draft-tpl-card-footer">
                              <span class="draft-tpl-field-count"><i class="ph ph-textbox text-xs mr-1"></i>{{ tpl.field_count || 0 }}  elements</span>
                              <button @click.stop="openPreview(tpl)" class="draft-tpl-preview-btn">
                                <i class="ph ph-eye text-xs mr-1"></i>Preview
                              </button>
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

                <div class="mt-8 pt-6 border-t border-slate-100">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-semibold text-slate-600 flex items-center"><i class="ph ph-folder-open text-base mr-1.5"></i>My Custom Templates</h3>
                    <button @click="openCreateTemplateForm" class="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center"><i class="ph ph-plus text-sm mr-1"></i>New Template</button>
                  </div>
                  <div v-if="userTemplates.length === 0" class="text-center py-6 text-slate-400 text-sm">
                    <i class="ph ph-folder-open text-3xl text-slate-200 mb-2 block"></i>No custom templates
                  </div>
                  <div v-else class="draft-template-grid">
                    <div v-for="ut in userTemplates" :key="ut.id" class="draft-tpl-card draft-tpl-card-custom" @click="selectDraftTemplate(ut)">
                      <div class="draft-tpl-card-header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                        <i class="ph ph-user-circle text-2xl text-white/90"></i>
                        <div class="flex items-center gap-1">
                          <button @click.stop="editUserTemplate(ut)" class="draft-tpl-action-btn"><i class="ph ph-pencil text-xs"></i></button>
                          <button @click.stop="deleteUserTemplate(ut.id)" class="draft-tpl-action-btn"><i class="ph ph-trash text-xs"></i></button>
                        </div>
                      </div>
                      <div class="draft-tpl-card-body">
                        <div class="flex items-center gap-1.5 mb-1.5">
                          <span class="draft-tpl-custom-badge">Custom</span>
                        </div>
                        <h4 class="draft-tpl-card-title">{{ ut.name }}</h4>
                        <p class="draft-tpl-card-desc">{{ ut.description || 'Custom contract template' }}</p>
                        <div class="draft-tpl-card-footer">
                          <span class="draft-tpl-field-count"><i class="ph ph-textbox text-xs mr-1"></i>{{ ut.fields?.length || 0 }}  elements</span>
                          <button @click.stop="openPreview(ut)" class="draft-tpl-preview-btn">
                            <i class="ph ph-eye text-xs mr-1"></i>Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </template>
            </div>

            <!-- Template Preview Modal -->
            <div v-if="showPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showPreviewModal = false">
              <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">
                <div class="preview-modal-header" :style="{ background: getCategoryGradient(previewTemplate?.category_id || '') }">
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <i :class="['ph', getCategoryIcon(previewTemplate?.category_id || ''), 'text-xl text-white']"></i>
                    </div>
                    <div class="min-w-0">
                      <h3 class="text-lg font-bold text-white truncate">{{ previewTemplate?.name }}</h3>
                      <p class="text-white/70 text-xs mt-0.5">{{ getCategoryName(previewTemplate?.category_id) }}</p>
                    </div>
                  </div>
                  <button @click="showPreviewModal = false" class="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">
                    <i class="ph ph-x text-lg"></i>
                  </button>
                </div>
                <div class="flex-1 overflow-y-auto p-6 space-y-5">
                  <div>
                    <p class="text-slate-600 text-sm leading-relaxed">{{ previewTemplate?.description }}</p>
                  </div>
                  <div v-if="previewTemplate?.outline_sections?.length">
                    <h4 class="text-sm font-semibold text-slate-800 mb-2 flex items-center"><i class="ph ph-list text-base mr-1.5 text-teal-500"></i>Contract Outline Sections</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div v-for="(section, idx) in previewTemplate.outline_sections" :key="idx" class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                        <span class="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center flex-shrink-0 font-medium">{{ idx + 1 }}</span>
                        {{ section }}
                      </div>
                    </div>
                  </div>
                  <div v-if="previewTemplate?.fields?.length">
                    <h4 class="text-sm font-semibold text-slate-800 mb-2 flex items-center"><i class="ph ph-textbox text-base mr-1.5 text-blue-500"></i>Contract Elements to Fill</h4>
                    <div class="flex flex-wrap gap-2">
                      <span v-for="field in previewTemplate.fields" :key="field.key" class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                        {{ field.label }}
                        <i v-if="field.required" class="ph ph-asterisk text-red-400" style="font-size:8px"></i>
                      </span>
                    </div>
                  </div>
                  <div v-if="previewTemplate?.law_references?.length">
                    <h4 class="text-sm font-semibold text-slate-800 mb-2 flex items-center"><i class="ph ph-book-open text-base mr-1.5 text-indigo-500"></i>Reference Regulations</h4>
                    <div class="space-y-1.5">
                      <div v-for="ref in previewTemplate.law_references" :key="ref" class="flex items-center gap-2 text-sm text-slate-600">
                        <i class="ph ph-bookmark text-indigo-400 text-xs flex-shrink-0"></i>{{ ref }}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <button @click="toggleFavorite(previewTemplate?.id)" :class="['flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors', draftFavorites.includes(previewTemplate?.id) ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200']">
                    <i :class="draftFavorites.includes(previewTemplate?.id) ? 'ph ph-star-fill' : 'ph ph-star'" class="text-base"></i>
                    {{ draftFavorites.includes(previewTemplate?.id) ? 'Favorited' : 'Favorite' }}
                  </button>
                  <button @click="startDraftFromPreview" class="btn-primary text-sm px-6">
                    <i class="ph ph-note-pencil mr-1.5"></i>Start Drafting
                  </button>
                </div>
              </div>
            </div>
            <div v-if="showCreateTemplateForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showCreateTemplateForm = false">
              <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
                <div class="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 class="text-lg font-bold text-slate-800">New Custom Template</h3>
                  <button @click="showCreateTemplateForm = false" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><i class="ph ph-x text-lg"></i></button>
                </div>
                <div class="p-5 space-y-4">
                  <div>
                    <label class="form-label">Template Name <span class="text-red-400">*</span></label>
                    <input type="text" v-model="newTemplateForm.name" placeholder="e.g.: Technical Service Contract" class="form-input text-sm" />
                  </div>
                  <div>
                    <label class="form-label">Template Description</label>
                    <textarea v-model="newTemplateForm.description" placeholder="Briefly describe applicable scenarios" rows="2" class="form-input text-sm resize-none"></textarea>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="form-label">Category</label>
                      <select v-model="newTemplateForm.category_id" class="form-input text-sm">
                        <option value="">Please select</option>
                        <option v-for="cat in contractCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="form-label">Subcategory</label>
                      <select v-model="newTemplateForm.subcategory_id" class="form-input text-sm">
                        <option value="">Please select</option>
                        <option v-for="sub in getSubcategoriesForCategory(newTemplateForm.category_id)" :key="sub.id" :value="sub.id">{{ sub.name }}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="form-label">Contract Element Fields</label>
                    <p class="text-xs text-slate-400 mb-2">One field per line, format: Field label (e.g.: Party A Name)</p>
                    <div class="space-y-2">
                      <div v-for="(f, idx) in newTemplateForm.fields" :key="idx" class="flex items-center space-x-2">
                        <input type="text" v-model="f.label" :placeholder="`Field ${idx + 1}`" class="form-input text-sm flex-1" />
                        <button @click="newTemplateForm.fields.splice(idx, 1)" class="p-1.5 text-slate-400 hover:text-red-500"><i class="ph ph-minus text-sm"></i></button>
                      </div>
                      <button @click="newTemplateForm.fields.push({ label: '', field_type: 'text', required: true })" class="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center"><i class="ph ph-plus text-sm mr-1"></i>Add Field</button>
                    </div>
                  </div>
                  <div>
                    <label class="form-label">Outline Sections</label>
                    <p class="text-xs text-slate-400 mb-2">One section title per line</p>
                    <div class="space-y-2">
                      <div v-for="(s, idx) in newTemplateForm.outline_sections" :key="idx" class="flex items-center space-x-2">
                        <input type="text" v-model="newTemplateForm.outline_sections[idx]" :placeholder="`Section ${idx + 1}`" class="form-input text-sm flex-1" />
                        <button @click="newTemplateForm.outline_sections.splice(idx, 1)" class="p-1.5 text-slate-400 hover:text-red-500"><i class="ph ph-minus text-sm"></i></button>
                      </div>
                      <button @click="newTemplateForm.outline_sections.push('')" class="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center"><i class="ph ph-plus text-sm mr-1"></i>Add Section</button>
                    </div>
                  </div>
                </div>
                <div class="p-5 border-t border-slate-100 flex justify-end space-x-3">
                  <button @click="showCreateTemplateForm = false" class="btn-outline text-sm">Cancel</button>
                  <button @click="handleCreateUserTemplate" :disabled="!newTemplateForm.name.trim() || isCreatingTemplate" class="btn-primary text-sm">
                    <i v-if="isCreatingTemplate" class="ph ph-spinner animate-spin mr-1.5"></i>
                    {{ isCreatingTemplate ? 'Creating...' : 'Create Template' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 2: Fill Elements -->
            <div v-if="draftStep === 2" class="max-w-4xl mx-auto">
              <div class="flex items-center space-x-2 mb-6">
                <button @click="draftStep = 1" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><i class="ph ph-arrow-left text-lg"></i></button>
                <div>
                  <h1 class="text-xl font-bold text-slate-800">{{ selectedTemplate?.name }}</h1>
                  <p class="text-slate-500 text-sm">{{ selectedTemplate?.description }}</p>
                </div>
              </div>
              <div class="card">
                <div class="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                  <div class="flex items-center space-x-4 text-sm">
                    <span class="flex items-center text-teal-600 font-medium"><span class="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center mr-1.5">1</span>Fill Elements</span>
                    <span class="text-slate-300">—</span>
                    <span class="flex items-center" :class="draftStep >= 3 ? 'text-teal-600 font-medium' : 'text-slate-400'"><span class="w-5 h-5 rounded-full text-xs flex items-center justify-center mr-1.5" :class="draftStep >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'">2</span>Generate Outline</span>
                    <span class="text-slate-300">—</span>
                    <span class="flex items-center" :class="draftStep >= 4 ? 'text-teal-600 font-medium' : 'text-slate-400'"><span class="w-5 h-5 rounded-full text-xs flex items-center justify-center mr-1.5" :class="draftStep >= 4 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'">3</span>Generate Result</span>
                  </div>
                </div>
                <div class="p-5 space-y-4">
                  <!-- Input Mode Switch -->
                  <div class="flex items-center gap-2 mb-4">
                    <button @click="draftInputMode = 'form'"
                      :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-all', draftInputMode === 'form' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
                      Form Mode
                    </button>
                    <button @click="draftInputMode = 'nlu'"
                      :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-all', draftInputMode === 'nlu' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
                      Natural Language Mode
                    </button>
                  </div>

                  <!-- Natural Language Input -->
                  <div v-if="draftInputMode === 'nlu'" class="space-y-4">
                    <div class="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                      <span class="font-medium">Tip: </span>Describe your contract needs in natural language, the system will automatically extract key information. E.g.: "John and I are signing a residential lease, monthly rent 5000 yuan, 2-year term, one month deposit and three months rent upfront"
                    </div>
                    <textarea v-model="draftNluInput"
                      class="w-full h-32 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                      placeholder="Describe your contract needs in natural language..."></textarea>
                    <button @click="extractDraftFields"
                      :disabled="!draftNluInput.trim() || isExtractingFields"
                      class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      <svg v-if="isExtractingFields" class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      {{ isExtractingFields ? 'Extracting...' : 'Smart Extract' }}
                    </button>

                    <!-- Extraction Results -->
                    <div v-if="Object.keys(draftNluFields).length > 0" class="space-y-3">
                      <h4 class="font-medium text-gray-700">Extraction Results</h4>
                      <div v-for="(value, key) in draftNluFields" :key="key" class="flex items-center gap-2">
                        <span class="text-sm text-gray-500 w-24">{{ key }}:</span>
                        <input v-if="value !== null" v-model="draftElements[key]"
                          class="flex-1 px-2 py-1 border border-gray-200 rounded text-sm" />
                        <span v-else class="text-sm text-orange-500">Not extracted</span>
                      </div>
                    </div>

                    <!-- Missing Field Follow-up -->
                    <div v-if="draftNluQuestions.length > 0" class="bg-orange-50 rounded-lg p-3 space-y-2">
                      <h4 class="font-medium text-orange-700 text-sm">The following information is missing, please supplement:</h4>
                      <div v-for="(q, i) in draftNluQuestions" :key="i" class="text-sm text-orange-600">
                        {{ i + 1 }}. {{ q }}
                      </div>
                    </div>
                  </div>

                  <!-- Original Form Mode -->
                  <div v-else>
                  <div v-for="field in selectedTemplate?.fields || []" :key="field.key" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                    <div class="sm:col-span-3">
                      <label class="form-label !mb-0 sm:pt-2">{{ field.label }}<span v-if="field.required" class="text-red-400 ml-0.5">*</span></label>
                    </div>
                    <div class="sm:col-span-9">
                      <select v-if="field.options && field.options.length > 0" v-model="draftElements[field.key]" class="form-input text-sm">
                        <option value="">Please select</option>
                        <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                      </select>
                      <textarea v-else-if="field.field_type === 'textarea'" v-model="draftElements[field.key]" :placeholder="field.placeholder" rows="3" class="form-input text-sm resize-none"></textarea>
                      <input v-else :type="field.field_type === 'number' ? 'number' : 'text'" v-model="draftElements[field.key]" :placeholder="field.placeholder" class="form-input text-sm" />
                    </div>
                  </div>
                  </div>
                </div>
                <div class="p-4 border-t border-slate-100 flex justify-end space-x-3">
                  <button @click="draftStep = 1" class="btn-outline text-sm">Back to Selection</button>
                  <button @click="handleGenerateOutline" :disabled="isGeneratingOutline || !hasRequiredFields" class="btn-primary text-sm">
                    <i v-if="isGeneratingOutline" class="ph ph-spinner animate-spin mr-1.5"></i>
                    <i v-else class="ph ph-list-magnifying-glass mr-1.5"></i>
                    {{ isGeneratingOutline ? 'Generating...' : 'Generate Outline' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 3: Outline Preview -->
            <div v-if="draftStep === 3" class="max-w-4xl mx-auto">
              <div class="flex items-center space-x-2 mb-6">
                <button @click="draftStep = 2" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><i class="ph ph-arrow-left text-lg"></i></button>
                <div>
                  <h1 class="text-xl font-bold text-slate-800">Contract Outline — {{ selectedTemplate?.name }}</h1>
                  <p class="text-slate-500 text-sm">Review and edit the outline, then generate the complete contract</p>
                </div>
              </div>
              <div class="card">
                <div class="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                  <div class="flex items-center space-x-4 text-sm">
                    <span class="flex items-center text-teal-600 font-medium"><span class="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center mr-1.5">1</span>Fill Elements</span>
                    <span class="text-slate-300">—</span>
                    <span class="flex items-center text-teal-600 font-medium"><span class="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center mr-1.5">2</span>Generate Outline</span>
                    <span class="text-slate-300">—</span>
                    <span class="flex items-center text-slate-400"><span class="w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center mr-1.5">3</span>Generate Result</span>
                  </div>
                </div>
                <div class="p-5">
                  <div class="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start">
                    <i class="ph ph-info text-sm mr-2 mt-0.5 flex-shrink-0"></i>
                    <span>The outline below is automatically generated by AI based on your elements. You can edit it directly, then click"Generate Contract"。</span>
                  </div>
                  <textarea v-model="draftOutline" rows="20" class="form-input text-sm resize-y font-serif leading-relaxed"></textarea>
                </div>
                <div class="p-4 border-t border-slate-100 flex justify-between">
                  <button @click="draftStep = 2" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Edit Elements</button>
                  <button @click="handleGenerateContract" :disabled="isGeneratingContract" class="btn-primary text-sm">
                    <i v-if="isGeneratingContract" class="ph ph-spinner animate-spin mr-1.5"></i>
                    <i v-else class="ph ph-file-text mr-1.5"></i>
                    {{ isGeneratingContract ? 'AI is drafting the contract...' : 'Generate Contract' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Step 4: Generate Result -->
            <div v-if="draftStep === 4" class="max-w-5xl mx-auto">
              <div class="flex items-center space-x-2 mb-6">
                <button @click="draftStep = 3" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><i class="ph ph-arrow-left text-lg"></i></button>
                <div>
                  <h1 class="text-xl font-bold text-slate-800">Contract Result — {{ selectedTemplate?.name }}</h1>
                  <p class="text-slate-500 text-sm">Contract generated, ready for quality check and export</p>
                </div>
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div class="lg:col-span-8">
                  <div class="card !p-0 overflow-hidden">
                    <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <span class="font-medium text-slate-800 text-sm">Contract Full Text</span>
                      <div class="flex items-center space-x-2">
                        <button @click="handleContractQualityCheck" :disabled="isCheckingQuality" class="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center text-xs border border-green-200">
                          <i :class="isCheckingQuality ? 'ph ph-spinner animate-spin' : 'ph ph-check-circle'" class="text-sm mr-1"></i> Quality Check
                        </button>
                        <button @click="handleExportContract" class="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center text-xs border border-slate-200">
                          <i class="ph ph-download-simple text-sm mr-1"></i> Export
                        </button>
                      </div>
                    </div>
                    <div class="p-6 max-h-[65vh] overflow-y-auto whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm">{{ generatedContractText }}</div>
                  </div>
                </div>
                <div class="lg:col-span-4 space-y-4">
                  <div v-if="contractQualityResult" class="card">
                    <h4 class="font-semibold text-sm mb-2" :class="contractQualityResult.is_qualified ? 'text-green-600' : 'text-orange-600'">
                      {{ contractQualityResult.is_qualified ? '✓ Document quality passed' : '⚠ Document has the following issues' }}
                    </h4>
                    <p class="text-slate-600 whitespace-pre-wrap text-xs">{{ contractQualityResult.quality_check }}</p>
                  </div>
                  <div class="card">
                    <h4 class="font-semibold text-slate-800 text-sm mb-3">Contract Information</h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between"><span class="text-slate-500">Contract Type</span><span class="font-medium text-slate-700">{{ selectedTemplate?.name }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Category</span><span class="font-medium text-slate-700">{{ getCategoryName(selectedTemplate?.category_id) }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Legal Basis</span><span class="font-medium text-slate-700">{{ selectedTemplate?.law_references?.length || 0 }}  statutes</span></div>
                    </div>
                  </div>
                  <div class="card">
                    <h4 class="font-semibold text-slate-800 text-sm mb-3">Reference Regulations</h4>
                    <div class="space-y-1.5">
                      <div v-for="ref in (selectedTemplate?.law_references || [])" :key="ref" class="text-xs text-slate-600 flex items-center">
                        <i class="ph ph-book-open text-slate-400 mr-1.5 flex-shrink-0"></i>{{ ref }}
                      </div>
                    </div>
                  </div>
                  <button @click="resetDraft" class="btn-outline w-full text-sm"><i class="ph ph-arrow-counter-clockwise mr-1.5"></i>Draft New Contract</button>
                </div>
              </div>
            </div>
          </div>

          <!-- DocGen V2 -->
          <div v-if="currentView === 'docgen'" class="page-container animate-fade-in">
            <div v-if="docStep === 1">
              <div class="mb-6">
                <h1 class="text-2xl font-bold text-slate-800 flex items-center"><i class="ph ph-file-text text-2xl text-blue-600 mr-2"></i> Legal Document Generation</h1>
                <p class="text-slate-500 mt-1">Select a document template, AI automatically generates professional legal documents</p>
              </div>
              <div v-if="isLoadingDocCategories" class="text-center py-16">
                <div class="spinner-lg mx-auto mb-5"></div>
                <p class="text-slate-500 text-sm">Loading document templates...</p>
              </div>
              <template v-else>
                <div class="draft-cat-tabs">
                  <button @click="docActiveCategory = 'all'" :class="['draft-cat-tab', { active: docActiveCategory === 'all' }]">
                    <i class="ph ph-squares-four text-base mr-1.5"></i>All Templates
                    <span v-if="totalDocTemplateCount" class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600">{{ totalDocTemplateCount }}</span>
                  </button>
                  <button @click="docActiveCategory = 'recent'" :class="['draft-cat-tab', { active: docActiveCategory === 'recent' }]">
                    <i class="ph ph-clock-counter-clockwise text-base mr-1.5"></i>Recently Used
                    <span v-if="docRecentUsed.length" class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{{ docRecentUsed.length }}</span>
                  </button>
                  <button @click="docActiveCategory = 'favorites'" :class="['draft-cat-tab', { active: docActiveCategory === 'favorites' }]">
                    <i class="ph ph-star text-base mr-1.5"></i>Favorites
                    <span v-if="docFavorites.length" class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">{{ docFavorites.length }}</span>
                  </button>
                  <button v-for="cat in docCategories" :key="cat.id" @click="docActiveCategory = cat.id" :class="['draft-cat-tab', { active: docActiveCategory === cat.id }]">
                    <i :class="['ph', cat.icon, 'text-base mr-1.5']"></i>{{ cat.name }}
                    <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600">{{ cat.template_count }}</span>
                  </button>
                </div>

                <div v-if="docActiveCategory === 'all'" class="mb-5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs text-slate-400 mr-1">Filter by usage:</span>
                    <button @click="docUsageFilter = ''" :class="['doc-usage-chip', { active: docUsageFilter === '' }]">All</button>
                    <button @click="docUsageFilter = 'Litigation'" :class="['doc-usage-chip', { active: docUsageFilter === 'Litigation' }]">
                      <i class="ph ph-scales text-xs mr-1"></i>Litigation
                    </button>
                    <button @click="docUsageFilter = 'Non-litigation'" :class="['doc-usage-chip', { active: docUsageFilter === 'Non-litigation' }]">
                      <i class="ph ph-handshake text-xs mr-1"></i>Non-litigation
                    </button>
                    <button @click="docUsageFilter = 'Arbitration'" :class="['doc-usage-chip', { active: docUsageFilter === 'Arbitration' }]">
                      <i class="ph ph-gavel text-xs mr-1"></i>Arbitration
                    </button>
                    <button @click="docUsageFilter = 'Daily'" :class="['doc-usage-chip', { active: docUsageFilter === 'Daily' }]">
                      <i class="ph ph-house text-xs mr-1"></i>Daily
                    </button>
                    <button @click="docUsageFilter = 'Lawyer'" :class="['doc-usage-chip', { active: docUsageFilter === 'Lawyer' }]">
                      <i class="ph ph-briefcase text-xs mr-1"></i>Lawyer Only
                    </button>
                  </div>
                </div>

                <div v-if="docActiveCategory === 'recent'">
                  <div v-if="recentDocTemplates.length === 0" class="draft-empty-state">
                    <div class="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                      <i class="ph ph-clock-counter-clockwise text-3xl text-blue-300"></i>
                    </div>
                    <p class="text-slate-500 text-sm mb-1">No recently used templates</p>
                    <p class="text-slate-400 text-xs">Used document templates will appear here automatically</p>
                  </div>
                  <div v-else class="draft-template-grid">
                    <div v-for="tpl in recentDocTemplates" :key="tpl.id" class="draft-tpl-card" @click="loadAndSelectDocTemplate(tpl.id)">
                      <div class="draft-tpl-card-header" :style="{ background: getDocCategoryGradient(tpl.category_id) }">
                        <i :class="['ph', getDocCategoryIcon(tpl.category_id), 'text-2xl text-white/90']"></i>
                        <button @click.stop="toggleDocFavorite(tpl.id)" :class="['draft-tpl-fav-btn', { 'is-fav': docFavorites.includes(tpl.id) }]">
                          <i :class="docFavorites.includes(tpl.id) ? 'ph ph-star-fill' : 'ph ph-star'" class="text-sm"></i>
                        </button>
                      </div>
                      <div class="draft-tpl-card-body">
                        <div class="flex items-center gap-1.5 mb-1.5">
                          <span class="draft-tpl-cat-badge" :style="{ background: getDocCategoryBadgeBg(tpl.category_id), color: getDocCategoryBadgeColor(tpl.category_id) }">{{ getDocCategoryName(tpl.category_id) }}</span>
                        </div>
                        <h4 class="draft-tpl-card-title">{{ tpl.name }}</h4>
                        <p class="draft-tpl-card-desc">{{ tpl.description }}</p>
                        <div class="draft-tpl-card-footer">
                          <span class="draft-tpl-field-count"><i class="ph ph-textbox text-xs mr-1"></i>{{ tpl.field_count || 0 }}  elements</span>
                          <button @click.stop="openDocPreview(tpl)" class="draft-tpl-preview-btn">
                            <i class="ph ph-eye text-xs mr-1"></i>Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else-if="docActiveCategory === 'favorites'">
                  <div v-if="favoriteDocTemplates.length === 0" class="draft-empty-state">
                    <div class="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                      <i class="ph ph-star text-3xl text-amber-300"></i>
                    </div>
                    <p class="text-slate-500 text-sm mb-1">No favorite templates</p>
                    <p class="text-slate-400 text-xs">Click the star on a template card to add to favorites</p>
                  </div>
                  <div v-else class="draft-template-grid">
                    <div v-for="tpl in favoriteDocTemplates" :key="tpl.id" class="draft-tpl-card" @click="loadAndSelectDocTemplate(tpl.id)">
                      <div class="draft-tpl-card-header" :style="{ background: getDocCategoryGradient(tpl.category_id) }">
                        <i :class="['ph', getDocCategoryIcon(tpl.category_id), 'text-2xl text-white/90']"></i>
                        <button @click.stop="toggleDocFavorite(tpl.id)" class="draft-tpl-fav-btn is-fav">
                          <i class="ph ph-star-fill text-sm"></i>
                        </button>
                      </div>
                      <div class="draft-tpl-card-body">
                        <div class="flex items-center gap-1.5 mb-1.5">
                          <span class="draft-tpl-cat-badge" :style="{ background: getDocCategoryBadgeBg(tpl.category_id), color: getDocCategoryBadgeColor(tpl.category_id) }">{{ getDocCategoryName(tpl.category_id) }}</span>
                        </div>
                        <h4 class="draft-tpl-card-title">{{ tpl.name }}</h4>
                        <p class="draft-tpl-card-desc">{{ tpl.description }}</p>
                        <div class="draft-tpl-card-footer">
                          <span class="draft-tpl-field-count"><i class="ph ph-textbox text-xs mr-1"></i>{{ tpl.field_count || 0 }}  elements</span>
                          <button @click.stop="openDocPreview(tpl)" class="draft-tpl-preview-btn">
                            <i class="ph ph-eye text-xs mr-1"></i>Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else>
                  <div v-for="cat in displayedDocCategories" :key="cat.id" class="draft-category-section">
                    <div class="draft-category-header">
                      <div class="draft-category-icon" :style="{ background: getDocCategoryGradient(cat.id) }">
                        <i :class="['ph', cat.icon, 'text-lg text-white']"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="text-base font-bold text-slate-800">{{ cat.name }}</h3>
                        <p class="text-xs text-slate-400 mt-0.5">{{ cat.description }}</p>
                      </div>
                      <span class="draft-category-count">{{ getFilteredTemplatesForCategory(cat).length }}  templates</span>
                    </div>
                    <div class="draft-template-grid">
                      <div v-for="tpl in getFilteredTemplatesForCategory(cat)" :key="tpl.id" class="draft-tpl-card" @click="loadAndSelectDocTemplate(tpl.id)">
                        <div class="draft-tpl-card-header" :style="{ background: getDocCategoryGradient(cat.id) }">
                          <i :class="['ph', cat.icon, 'text-2xl text-white/90']"></i>
                          <button @click.stop="toggleDocFavorite(tpl.id)" :class="['draft-tpl-fav-btn', { 'is-fav': docFavorites.includes(tpl.id) }]">
                            <i :class="docFavorites.includes(tpl.id) ? 'ph ph-star-fill' : 'ph ph-star'" class="text-sm"></i>
                          </button>
                        </div>
                        <div class="draft-tpl-card-body">
                          <div class="flex items-center gap-1.5 mb-1.5">
                            <span class="draft-tpl-cat-badge" :style="{ background: getDocCategoryBadgeBg(cat.id), color: getDocCategoryBadgeColor(cat.id) }">{{ cat.name }}</span>
                          </div>
                          <h4 class="draft-tpl-card-title">{{ tpl.name }}</h4>
                          <p class="draft-tpl-card-desc">{{ tpl.description }}</p>
                          <div class="draft-tpl-card-footer">
                            <span class="draft-tpl-field-count"><i class="ph ph-textbox text-xs mr-1"></i>{{ tpl.field_count || 0 }}  elements</span>
                            <button @click.stop="openDocPreview(tpl)" class="draft-tpl-preview-btn">
                              <i class="ph ph-eye text-xs mr-1"></i>Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <div v-if="showDocPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showDocPreviewModal = false">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">
                  <div class="preview-modal-header" :style="{ background: getDocCategoryGradient(docPreviewTemplate?.category_id || '') }">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <div class="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <i :class="['ph', getDocCategoryIcon(docPreviewTemplate?.category_id || ''), 'text-xl text-white']"></i>
                      </div>
                      <div class="min-w-0">
                        <h3 class="text-lg font-bold text-white truncate">{{ docPreviewTemplate?.name }}</h3>
                        <p class="text-white/70 text-xs mt-0.5">{{ getDocCategoryName(docPreviewTemplate?.category_id) }}</p>
                      </div>
                    </div>
                    <button @click="showDocPreviewModal = false" class="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors flex-shrink-0">
                      <i class="ph ph-x text-lg"></i>
                    </button>
                  </div>
                  <div class="flex-1 overflow-y-auto p-6 space-y-5">
                    <div>
                      <p class="text-slate-600 text-sm leading-relaxed">{{ docPreviewTemplate?.description }}</p>
                    </div>
                    <div v-if="docPreviewTemplate?.outline_sections?.length">
                      <h4 class="text-sm font-semibold text-slate-800 mb-2 flex items-center"><i class="ph ph-list text-base mr-1.5 text-blue-500"></i>Document Outline Sections</h4>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div v-for="(section, idx) in docPreviewTemplate.outline_sections" :key="idx" class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                          <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center flex-shrink-0 font-medium">{{ idx + 1 }}</span>
                          {{ section }}
                        </div>
                      </div>
                    </div>
                    <div v-if="docPreviewTemplate?.fields?.length">
                      <h4 class="text-sm font-semibold text-slate-800 mb-2 flex items-center"><i class="ph ph-textbox text-base mr-1.5 text-teal-500"></i>Document Elements to Fill</h4>
                      <div class="flex flex-wrap gap-2">
                        <span v-for="field in docPreviewTemplate.fields" :key="field.key" class="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                          {{ field.label }}
                          <i v-if="field.required" class="ph ph-asterisk text-red-400" style="font-size:8px"></i>
                        </span>
                      </div>
                    </div>
                    <div v-if="docPreviewTemplate?.law_references?.length">
                      <h4 class="text-sm font-semibold text-slate-800 mb-2 flex items-center"><i class="ph ph-book-open text-base mr-1.5 text-indigo-500"></i>Reference Regulations</h4>
                      <div class="space-y-1.5">
                        <div v-for="ref in docPreviewTemplate.law_references" :key="ref" class="flex items-center gap-2 text-sm text-slate-600">
                          <i class="ph ph-bookmark text-indigo-400 text-xs flex-shrink-0"></i>{{ ref }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <button @click="toggleDocFavorite(docPreviewTemplate?.id)" :class="['flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors', docFavorites.includes(docPreviewTemplate?.id) ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200']">
                      <i :class="docFavorites.includes(docPreviewTemplate?.id) ? 'ph ph-star-fill' : 'ph ph-star'" class="text-base"></i>
                      {{ docFavorites.includes(docPreviewTemplate?.id) ? 'Favorited' : 'Favorite' }}
                    </button>
                    <button @click="startDocFromPreview" class="btn-primary text-sm px-6">
                      <i class="ph ph-file-text mr-1.5"></i>Start Generation
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="docStep === 2" class="max-w-4xl mx-auto">
              <div class="flex items-center space-x-2 mb-6">
                <button @click="docStep = 1" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><i class="ph ph-arrow-left text-lg"></i></button>
                <div>
                  <h1 class="text-xl font-bold text-slate-800">{{ selectedDocTemplate?.name }}</h1>
                  <p class="text-slate-500 text-sm">{{ selectedDocTemplate?.description }}</p>
                </div>
              </div>
              <div class="card">
                <div class="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                  <div class="flex items-center space-x-4 text-sm">
                    <span class="flex items-center text-blue-600 font-medium"><span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center mr-1.5">1</span>Fill Elements</span>
                    <span class="text-slate-300">—</span>
                    <span class="flex items-center" :class="docStep >= 3 ? 'text-blue-600 font-medium' : 'text-slate-400'"><span class="w-5 h-5 rounded-full text-xs flex items-center justify-center mr-1.5" :class="docStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'">2</span>Generate Outline</span>
                    <span class="text-slate-300">—</span>
                    <span class="flex items-center" :class="docStep >= 4 ? 'text-blue-600 font-medium' : 'text-slate-400'"><span class="w-5 h-5 rounded-full text-xs flex items-center justify-center mr-1.5" :class="docStep >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'">3</span>Generate Result</span>
                  </div>
                </div>
                <div class="p-5 space-y-4">
                  <!-- Input Mode Switch -->
                  <div class="flex items-center gap-2 mb-4">
                    <button @click="docInputMode = 'form'"
                      :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-all', docInputMode === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
                      Form Mode
                    </button>
                    <button @click="docInputMode = 'nlu'"
                      :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-all', docInputMode === 'nlu' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
                      Natural Language Mode
                    </button>
                  </div>

                  <!-- Natural Language Input -->
                  <div v-if="docInputMode === 'nlu'" class="space-y-4">
                    <div class="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                      <span class="font-medium">Tip: </span>Describe your document needs in natural language, the system will automatically extract key information. E.g.: "I want to sue for a debt of 100,000 yuan, borrowed in January 2024, agreed to repay within one year, still unpaid"
                    </div>
                    <textarea v-model="docNluInput"
                      class="w-full h-32 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Describe your document needs in natural language..."></textarea>
                    <button @click="extractDocFields"
                      :disabled="!docNluInput.trim() || isExtractingDocFields"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      <svg v-if="isExtractingDocFields" class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      {{ isExtractingDocFields ? 'Extracting...' : 'Smart Extract' }}
                    </button>

                    <!-- Extraction Results -->
                    <div v-if="Object.keys(docNluFields).length > 0" class="space-y-3">
                      <h4 class="font-medium text-gray-700">Extraction Results</h4>
                      <div v-for="(value, key) in docNluFields" :key="key" class="flex items-center gap-2">
                        <span class="text-sm text-gray-500 w-24">{{ key }}:</span>
                        <input v-if="value !== null" v-model="docElements[key]"
                          class="flex-1 px-2 py-1 border border-gray-200 rounded text-sm" />
                        <span v-else class="text-sm text-orange-500">Not extracted</span>
                      </div>
                    </div>

                    <!-- Missing Field Follow-up -->
                    <div v-if="docNluQuestions.length > 0" class="bg-orange-50 rounded-lg p-3 space-y-2">
                      <h4 class="font-medium text-orange-700 text-sm">The following information is missing, please supplement:</h4>
                      <div v-for="(q, i) in docNluQuestions" :key="i" class="text-sm text-orange-600">
                        {{ i + 1 }}. {{ q }}
                      </div>
                    </div>
                  </div>

                  <!-- Original Form Mode -->
                  <div v-else>
                  <div v-for="field in selectedDocTemplate?.fields || []" :key="field.key" class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                    <div class="sm:col-span-3">
                      <label class="form-label !mb-0 sm:pt-2">{{ field.label }}<span v-if="field.required" class="text-red-400 ml-0.5">*</span></label>
                    </div>
                    <div class="sm:col-span-9">
                      <select v-if="field.options && field.options.length > 0" v-model="docElements[field.key]" class="form-input text-sm">
                        <option value="">Please select</option>
                        <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                      </select>
                      <textarea v-else-if="field.field_type === 'textarea'" v-model="docElements[field.key]" :placeholder="field.placeholder" rows="3" class="form-input text-sm resize-none"></textarea>
                      <input v-else :type="field.field_type === 'number' ? 'number' : 'text'" v-model="docElements[field.key]" :placeholder="field.placeholder" class="form-input text-sm" />
                    </div>
                  </div>
                  </div>
                </div>
                <div class="p-4 border-t border-slate-100 flex justify-end space-x-3">
                  <button @click="docStep = 1" class="btn-outline text-sm">Back to Selection</button>
                  <button @click="handleGenerateDocOutline" :disabled="isGeneratingDocOutline || !hasRequiredDocFields" class="btn-primary text-sm">
                    <i v-if="isGeneratingDocOutline" class="ph ph-spinner animate-spin mr-1.5"></i>
                    <i v-else class="ph ph-list-magnifying-glass mr-1.5"></i>
                    {{ isGeneratingDocOutline ? 'Generating...' : 'Generate Outline' }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="docStep === 3" class="max-w-4xl mx-auto">
              <div class="flex items-center space-x-2 mb-6">
                <button @click="docStep = 2" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><i class="ph ph-arrow-left text-lg"></i></button>
                <div>
                  <h1 class="text-xl font-bold text-slate-800">Document Outline — {{ selectedDocTemplate?.name }}</h1>
                  <p class="text-slate-500 text-sm">Review and edit the outline, then generate the complete document</p>
                </div>
              </div>
              <div class="card">
                <div class="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                  <div class="flex items-center space-x-4 text-sm">
                    <span class="flex items-center text-blue-600 font-medium"><span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center mr-1.5">1</span>Fill Elements</span>
                    <span class="text-slate-300">—</span>
                    <span class="flex items-center text-blue-600 font-medium"><span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center mr-1.5">2</span>Generate Outline</span>
                    <span class="text-slate-300">—</span>
                    <span class="flex items-center text-slate-400"><span class="w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center mr-1.5">3</span>Generate Result</span>
                  </div>
                </div>
                <div class="p-5">
                  <div class="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start">
                    <i class="ph ph-info text-sm mr-2 mt-0.5 flex-shrink-0"></i>
                    <span>The outline below is automatically generated by AI based on your elements. You can edit it directly, then click"Generate Document"。</span>
                  </div>
                  <textarea v-model="docOutline" rows="20" class="form-input text-sm resize-y font-serif leading-relaxed"></textarea>
                </div>
                <div class="p-4 border-t border-slate-100 flex justify-between">
                  <button @click="docStep = 2" class="btn-outline text-sm"><i class="ph ph-arrow-left mr-1.5"></i>Edit Elements</button>
                  <button @click="handleGenerateDocText" :disabled="isGeneratingDocText" class="btn-primary text-sm">
                    <i v-if="isGeneratingDocText" class="ph ph-spinner animate-spin mr-1.5"></i>
                    <i v-else class="ph ph-file-text mr-1.5"></i>
                    {{ isGeneratingDocText ? 'AI is drafting the document...' : 'Generate Document' }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="docStep === 4" class="max-w-5xl mx-auto">
              <div class="flex items-center space-x-2 mb-6">
                <button @click="docStep = 3" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><i class="ph ph-arrow-left text-lg"></i></button>
                <div>
                  <h1 class="text-xl font-bold text-slate-800">Document Result — {{ selectedDocTemplate?.name }}</h1>
                  <p class="text-slate-500 text-sm">Document generated, ready for quality check and export</p>
                </div>
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div class="lg:col-span-8">
                  <div class="card !p-0 overflow-hidden">
                    <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <span class="font-medium text-slate-800 text-sm">Document Full Text</span>
                      <div class="flex items-center space-x-2">
                        <button @click="handleDocQualityCheck" :disabled="isCheckingDocQuality" class="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center text-xs border border-green-200">
                          <i :class="isCheckingDocQuality ? 'ph ph-spinner animate-spin' : 'ph ph-check-circle'" class="text-sm mr-1"></i> Quality Check
                        </button>
                        <button @click="handleExportDoc" class="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center text-xs border border-slate-200">
                          <i class="ph ph-download-simple text-sm mr-1"></i> Export
                        </button>
                      </div>
                    </div>
                    <div class="p-6 max-h-[65vh] overflow-y-auto whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm">{{ generatedDocText }}</div>
                  </div>
                </div>
                <div class="lg:col-span-4 space-y-4">
                  <div v-if="docQualityResult" class="card">
                    <h4 class="font-semibold text-sm mb-2" :class="docQualityResult.is_qualified ? 'text-green-600' : 'text-orange-600'">
                      {{ docQualityResult.is_qualified ? '✓ Document quality passed' : '⚠ Document has the following issues' }}
                    </h4>
                    <p class="text-slate-600 whitespace-pre-wrap text-xs">{{ docQualityResult.quality_check }}</p>
                  </div>
                  <div class="card">
                    <h4 class="font-semibold text-slate-800 text-sm mb-3">Document Information</h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between"><span class="text-slate-500">Document Type</span><span class="font-medium text-slate-700">{{ selectedDocTemplate?.name }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Category</span><span class="font-medium text-slate-700">{{ getDocCategoryName(selectedDocTemplate?.category_id) }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">Legal Basis</span><span class="font-medium text-slate-700">{{ selectedDocTemplate?.law_references?.length || 0 }}  statutes</span></div>
                    </div>
                  </div>
                  <div class="card">
                    <h4 class="font-semibold text-slate-800 text-sm mb-3">Reference Regulations</h4>
                    <div class="space-y-1.5">
                      <div v-for="ref in (selectedDocTemplate?.law_references || [])" :key="ref" class="text-xs text-slate-600 flex items-center">
                        <i class="ph ph-book-open text-slate-400 mr-1.5 flex-shrink-0"></i>{{ ref }}
                      </div>
                    </div>
                  </div>
                  <button @click="resetDocGen" class="btn-outline w-full text-sm"><i class="ph ph-arrow-counter-clockwise mr-1.5"></i>Generate New Document</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cases -->
          <div v-if="currentView === 'cases'" class="page-container animate-fade-in">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-2xl font-bold text-slate-800">Case File Management</h1>
              <button @click="showNewCaseForm = true" class="btn-primary text-sm"><i class="ph ph-plus text-base mr-1"></i> New Case</button>
            </div>
            <div v-if="showNewCaseForm" class="card mb-5">
              <h3 class="font-semibold text-slate-800 mb-4 text-sm">New Case File</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label class="form-label">Case Title</label><input type="text" v-model="newCase.title" class="form-input text-sm" /></div>
                <div><label class="form-label">Case Type</label><select v-model="newCase.case_type" class="form-input text-sm"><option>Labor Dispute</option><option>Contract Dispute</option><option>Marriage & Family</option><option>Intellectual Property</option><option>Other</option></select></div>
                <div><label class="form-label">Plaintiff/Applicant</label><input type="text" v-model="newCase.plaintiff" class="form-input text-sm" /></div>
                <div><label class="form-label">Defendant/Respondent</label><input type="text" v-model="newCase.defendant" class="form-input text-sm" /></div>
              </div>
              <div class="mt-3"><label class="form-label">Case Description</label><textarea v-model="newCase.description" rows="2" class="form-input text-sm resize-none"></textarea></div>
              <div class="flex justify-end mt-4 space-x-3"><button @click="showNewCaseForm = false" class="btn-outline text-sm">Cancel</button><button @click="handleCreateCase" class="btn-primary text-sm">Create</button></div>
            </div>
            <div v-if="casesList.length === 0" class="card text-center py-10 text-slate-400"><i class="ph ph-briefcase text-4xl mb-3 text-slate-200"></i><p class="text-sm">No case files yet, click the button above to create</p></div>
            <div v-else class="space-y-3">
              <div v-for="c in casesList" :key="c.id" class="card hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start">
                  <div><h3 class="font-semibold text-slate-800 text-sm">{{ c.title }}</h3><p class="text-xs text-slate-500 mt-1">{{ c.case_type }} · {{ c.plaintiff || 'Not specified' }} vs {{ c.defendant || 'Not specified' }}</p></div>
                  <div class="flex items-center space-x-2"><span class="px-2 py-0.5 text-xs rounded-full" :class="c.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'">{{ c.status }}</span><button @click="handleDeleteCase(c.id)" class="p-1 text-slate-300 hover:text-red-500 transition-colors"><i class="ph ph-trash text-base"></i></button></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Account -->
          <div v-if="currentView === 'account'" class="page-container animate-fade-in max-w-3xl">
            <h1 class="text-2xl font-bold text-slate-800 mb-6">Account Settings</h1>
            <div class="space-y-5">
              <div class="card">
                <div class="flex items-center space-x-5">
                  <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold flex-shrink-0">{{ authStore.userName ? authStore.userName[0] : '?' }}</div>
                  <div><h2 class="text-lg font-bold text-slate-800">{{ authStore.userName }}</h2><p class="text-slate-500 text-sm">{{ authStore.userEmail }}</p><span class="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{{ authStore.userPlan }}</span></div>
                </div>
              </div>
              <div class="card">
                <h3 class="text-base font-semibold text-slate-800 mb-4 flex items-center"><i class="ph ph-key text-lg mr-2 text-slate-500"></i>LLM API Configuration</h3>
                <div v-if="!apiKeyConfigured" class="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg flex items-start">
                  <i class="ph ph-warning text-base mr-2 mt-0.5 flex-shrink-0"></i><span>You have not configured a valid API Key. AI features will not be available. Please select a provider and enter your API Key, then save.</span>
                </div>
                <div class="space-y-4">
                  <div><label class="form-label">LLM Provider</label><select v-model="selectedProvider" @change="onProviderChange" class="form-input text-sm"><option v-for="p in providers" :key="p.id" :value="p.id">{{ p.name }}{{ p.has_env_key ? '  (Pre-configured)' : '' }}</option></select></div>
                  <div><label class="form-label">Model</label><select v-model="llmModelName" class="form-input text-sm"><option v-for="m in currentModels" :key="m" :value="m">{{ m }}</option></select></div>
                  <div><label class="form-label">API Key</label><div class="relative"><input :type="showApiKey ? 'text' : 'password'" v-model="llmApiKey" :placeholder="currentKeyHint" class="form-input text-sm font-mono !pr-10" :class="{ '!border-red-300': llmApiKey && !validateKeyFormat(llmApiKey) }" /><button type="button" @click="showApiKey = !showApiKey" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><i :class="showApiKey ? 'ph ph-eye-slash' : 'ph ph-eye'" class="text-base"></i></button></div><p v-if="llmApiKey && !validateKeyFormat(llmApiKey)" class="text-red-500 text-xs mt-1">API Key format is incorrect, {{ currentKeyHint }}</p><p v-if="currentProviderHasEnvKey && !llmApiKey" class="text-slate-400 text-xs mt-1"><i class="ph ph-info text-xs mr-1"></i>This provider has a pre-configured environment variable Key. Leave empty to use the pre-configured Key</p></div>
                  <div class="flex justify-end space-x-3 pt-1"><button @click="handleValidateApiKey" :disabled="isValidatingKey || (!llmApiKey && !currentProviderHasEnvKey)" class="btn-outline text-sm"><i :class="isValidatingKey ? 'ph ph-spinner animate-spin' : 'ph ph-check-circle'" class="text-base mr-1.5"></i>{{ isValidatingKey ? 'Validating...' : 'Validate Key' }}</button><button @click="handleSaveConfig" :disabled="isSavingConfig" class="btn-primary text-sm"><i :class="isSavingConfig ? 'ph ph-spinner animate-spin' : 'ph ph-floppy-disk'" class="text-base mr-1.5"></i>{{ isSavingConfig ? 'Saving...' : 'Save Configuration' }}</button></div>
                  <div v-if="apiKeyValidation" class="p-3 rounded-lg text-sm" :class="apiKeyValidation.valid ? 'msg-success' : 'msg-error'">{{ apiKeyValidation.message }}</div>
                </div>
              </div>
              <button @click="handleLogout" class="flex items-center text-red-500 font-medium hover:bg-red-50 px-4 py-2.5 rounded-lg transition-colors text-sm"><i class="ph ph-sign-out text-lg mr-2"></i>Sign Out</button>
            </div>
          </div>
        </main>
      </div>
    </div>

    <div v-if="toastMessage" class="toast" :class="toastType">
      <i :class="toastType === 'success' ? 'ph ph-check-circle' : toastType === 'error' ? 'ph ph-x-circle' : 'ph ph-info'" class="text-lg mr-2"></i>{{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { api } from './services/api'

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const authStore = useAuthStore()

const isLogin = ref(true)
const currentView = ref('dashboard')
const authEmail = ref('')
const authPassword = ref('')
const registerName = ref('')
const authError = ref('')
const isAuthLoading = ref(false)
const sidebarCollapsed = ref(false)
const apiKeyConfigured = ref(true)

const isDarkMode = ref(localStorage.getItem('darkMode') === 'true')
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('darkMode', String(isDarkMode.value))
}
if (isDarkMode.value) {
  document.documentElement.classList.add('dark-mode-preload')
}

const toastMessage = ref('')
const toastType = ref('info')
let toastTimer = null
function showToast(msg, type = 'info') {
  toastMessage.value = msg; toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 3000)
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'ph ph-house' },
  { id: 'chat', label: 'Legal Consultation', icon: 'ph ph-chat-circle' },
  { id: 'doc-interpret', label: 'Document Interpretation', icon: 'ph ph-book-open-text' },
  { id: 'contract', label: 'Contract Review', icon: 'ph ph-shield-check' },
  { id: 'contract-compare', label: 'Contract Comparison', icon: 'ph ph-git-diff' },
  { id: 'contract-draft', label: 'Contract Drafting', icon: 'ph ph-note-pencil' },
  { id: 'proofread', label: 'Smart Proofreading', icon: 'ph ph-text-aa' },
  { id: 'docgen', label: 'Document Generation', icon: 'ph ph-file-text' },
  { id: 'cases', label: 'Case Files', icon: 'ph ph-briefcase' },
  { id: 'account', label: 'Account Settings', icon: 'ph ph-gear' },
]

const currentNavLabel = computed(() => {
  if (currentView.value === 'vertical-agent') return verticalAgentTitle.value
  if (currentView.value === 'contract-draft') return 'Smart Contract Drafting'
  if (currentView.value === 'contract-compare') return 'Contract Version Comparison'
  if (currentView.value === 'proofread') return 'AI Smart Proofreading'
  if (currentView.value === 'docgen') return 'Legal Document Generation'
  if (currentView.value === 'doc-interpret') return 'Smart Legal Document Interpretation'
  const item = navItems.find(i => i.id === currentView.value)
  return item ? item.label : 'Feature'
})

const dashboardFeatures = [
  { id: 'chat', title: 'Legal Consultation', desc: 'RAG Statute Search + Deli Case Database', icon: 'ph ph-chat-circle', color: 'bg-blue-500' },
  { id: 'doc-interpret', title: 'Legal Document Interpretation', desc: 'Complex clauses, explained instantly', icon: 'ph ph-book-open-text', color: 'bg-amber-500' },
  { id: 'contract', title: 'Smart Contract Review', desc: 'Risk identification & clause completion', icon: 'ph ph-shield-check', color: 'bg-indigo-500' },
  { id: 'contract-compare', title: 'Contract Version Comparison', desc: 'Smart diff detection & reporting', icon: 'ph ph-git-diff', color: 'bg-violet-500' },
  { id: 'contract-draft', title: 'Smart Contract Drafting', desc: '45+ templates covering all scenarios', icon: 'ph ph-note-pencil', color: 'bg-teal-500' },
  { id: 'proofread', title: 'AISmart Proofreading', desc: 'Grammar, spelling & punctuation auto-fix', icon: 'ph ph-text-aa', color: 'bg-emerald-500' },
  { id: 'docgen', title: 'Legal Document Generation', desc: '40+ templates for litigation, arbitration & more', icon: 'ph ph-file-text', color: 'bg-red-500' },
  { id: 'cases', title: 'Case File Management', desc: 'Unified consultation & document tracking', icon: 'ph ph-briefcase', color: 'bg-slate-600' },
]

const verticalScenarios = [
  { id: 'labor', title: 'Labor Dispute Protection', icon: 'ph ph-users', tags: ['Wage Arrears', 'Wrongful Termination', 'Work Injury Compensation'] },
  { id: 'compliance', title: 'Corporate Compliance Check', icon: 'ph ph-buildings', tags: ['Labor Compliance', 'Data Security', 'Antitrust'] },
  { id: 'marriage', title: 'Marriage & Property Division', icon: 'ph ph-gavel', tags: ['Property Calculation', 'Agreement Generation', 'Child Custody'] },
]

function renderMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/【(.*?)】/g, '<span style="color:#2563eb;font-weight:600">【$1】</span>')
    .replace(/\n/g, '<br/>')
}

// Chat
const chatMessages = ref([{ role: 'assistant', content: 'Hello! I am the LexAI assistant. I can help answer legal questions, search cases and regulations. Please describe your legal issue.' }])
const chatInput = ref('')
const isChatTyping = ref(false)
const chatContainer = ref(null)
const currentSessionId = ref(generateUUID())
const agentStatusText = ref('')

const scrollToBottom = (el) => { nextTick(() => { if (el) el.scrollTop = el.scrollHeight }) }

async function handleChatSend() {
  if (!chatInput.value.trim() || isChatTyping.value) return
  const userMsg = chatInput.value
  chatMessages.value.push({ role: 'user', content: userMsg })
  chatInput.value = ''
  isChatTyping.value = true
  agentStatusText.value = 'Identifying intent...'
  scrollToBottom(chatContainer.value)
  try {
    const history = chatMessages.value.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }))
    const response = await api.sendChatMessage({ message: userMsg, session_id: currentSessionId.value, history: history.slice(-10) })
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let assistantContent = ''
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data) continue
        try {
          const event = JSON.parse(data)
          if (event.type === 'agent_step') { agentStatusText.value = event.content }
          else if (event.type === 'token') {
            if (!assistantContent) chatMessages.value.push({ role: 'assistant', content: '' })
            assistantContent += event.content
            const lastMsg = chatMessages.value[chatMessages.value.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') lastMsg.content = assistantContent
            scrollToBottom(chatContainer.value)
          } else if (event.type === 'error') { showToast(event.content, 'error') }
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { showToast(`Connection failed:  ${e.message}`, 'error') }
  finally { isChatTyping.value = false; agentStatusText.value = ''; scrollToBottom(chatContainer.value) }
}

// Vertical Agent
const verticalAgentType = ref('')
const verticalAgentTitle = ref('')
const verticalChatMessages = ref([])
const verticalChatInput = ref('')
const isVerticalTyping = ref(false)
const verticalChatContainer = ref(null)
const verticalSessionId = ref('')
const verticalAgentStatusText = ref('')

function openVerticalAgent(agentId) {
  verticalAgentType.value = agentId
  verticalSessionId.value = generateUUID()
  const titleMap = { labor: 'Labor Dispute Protection Agent', compliance: 'Corporate Compliance Check Agent', marriage: 'Marriage & Property Division Agent' }
  verticalAgentTitle.value = titleMap[agentId] || 'Specialized Agent'
  const greetingMap = {
    labor: 'Hello! I am the Labor Dispute Protection assistant, focusing on wage arrears, wrongful termination, work injury compensation, etc. Please describe your situation.',
    compliance: 'Hello! I am the Corporate Compliance Check assistant, focusing on labor compliance, data security, antitrust, etc. Please describe your needs.',
    marriage: 'Hello! I am the Marriage & Property Division assistant, focusing on divorce, property division, child custody, etc. Please describe your situation.',
  }
  verticalChatMessages.value = [{ role: 'assistant', content: greetingMap[agentId] || 'Hello! Please describe your legal issue.' }]
  currentView.value = 'vertical-agent'
}

async function handleVerticalChatSend() {
  if (!verticalChatInput.value.trim() || isVerticalTyping.value) return
  const userMsg = verticalChatInput.value
  verticalChatMessages.value.push({ role: 'user', content: userMsg })
  verticalChatInput.value = ''
  isVerticalTyping.value = true
  verticalAgentStatusText.value = 'Analyzing...'
  scrollToBottom(verticalChatContainer.value)
  try {
    const history = verticalChatMessages.value.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }))
    const response = await api.sendAgentChatMessage(verticalAgentType.value, { message: userMsg, session_id: verticalSessionId.value, history: history.slice(-10) })
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let assistantContent = ''
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data) continue
        try {
          const event = JSON.parse(data)
          if (event.type === 'agent_step') { verticalAgentStatusText.value = event.content }
          else if (event.type === 'token') {
            if (!assistantContent) verticalChatMessages.value.push({ role: 'assistant', content: '' })
            assistantContent += event.content
            const lastMsg = verticalChatMessages.value[verticalChatMessages.value.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') lastMsg.content = assistantContent
            scrollToBottom(verticalChatContainer.value)
          } else if (event.type === 'error') { showToast(event.content, 'error') }
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { showToast(`Connection failed:  ${e.message}`, 'error') }
  finally { isVerticalTyping.value = false; verticalAgentStatusText.value = ''; scrollToBottom(verticalChatContainer.value) }
}

// Contract Review
const contractStep = ref(1)
const contractText = ref('')
const contractFileInput = ref(null)
const contractResult = ref(null)
const contractProgress = ref('Extracting key clauses...')
function handleContractFileSelect(event) { const file = event.target.files?.[0]; if (file) submitContractReview(file, null) }
function handleContractDrop(event) { const file = event.dataTransfer?.files?.[0]; if (file) submitContractReview(file, null) }
function handleContractTextSubmit() { if (contractText.value.trim()) submitContractReview(null, contractText.value.trim()) }
async function submitContractReview(file, text) {
  contractStep.value = 2; contractProgress.value = 'Extracting key clauses...'
  const t = setInterval(() => { if (contractProgress.value.includes('Extracting')) contractProgress.value = 'Validating compliance...'; else if (contractProgress.value.includes('Validating')) contractProgress.value = 'Detecting missing clauses...' }, 1500)
  try { contractResult.value = await api.reviewContract(file, text); contractStep.value = 3 }
  catch (e) { contractResult.value = { risk_items: [{ level: 'high', clause: 'Review Failed', reason: e.message, suggestion: 'Please retry' }], missing_clauses: [], summary: `Review failed:  ${e.message}`, score: 0 }; contractStep.value = 3 }
  finally { clearInterval(t) }
}

// Contract Compare - Contract Version Comparison
const compareStep = ref(1)
const compareOriginalFile = ref(null)
const compareRevisedFile = ref(null)
const compareOriginalInput = ref(null)
const compareRevisedInput = ref(null)
const isComparing = ref(false)
const compareProgress = ref('')
const compareResult = ref(null)
const compareHistory = ref([])
const isLoadingCompareHistory = ref(false)

function handleCompareOriginalSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    const err = validateCompareFile(file)
    if (err) { showToast(err, 'error'); return }
    compareOriginalFile.value = file
  }
}
function handleCompareOriginalDrop(event) {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    const err = validateCompareFile(file)
    if (err) { showToast(err, 'error'); return }
    compareOriginalFile.value = file
  }
}
function handleCompareRevisedSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    const err = validateCompareFile(file)
    if (err) { showToast(err, 'error'); return }
    compareRevisedFile.value = file
  }
}
function handleCompareRevisedDrop(event) {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    const err = validateCompareFile(file)
    if (err) { showToast(err, 'error'); return }
    compareRevisedFile.value = file
  }
}
function validateCompareFile(file) {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  if (!['.pdf', '.docx', '.txt'].includes(ext)) return 'Unsupported file format, please upload .docx .pdf .txt files'
  if (file.size > 10 * 1024 * 1024) return 'File size exceeds 10MB limit'
  return null
}
async function startCompare() {
  if (!compareOriginalFile.value || !compareRevisedFile.value) return
  isComparing.value = true
  compareStep.value = 2
  compareProgress.value = 'Extracting original contract content...'
  const t = setInterval(() => {
    if (compareProgress.value.includes('Extracting original')) compareProgress.value = 'Extracting revised contract content...'
    else if (compareProgress.value.includes('Extracting revised')) compareProgress.value = 'Analyzing clause differences...'
    else if (compareProgress.value.includes('Analyzing')) compareProgress.value = 'Generating comparison report...'
  }, 2000)
  try {
    compareResult.value = await api.compareContracts(compareOriginalFile.value, compareRevisedFile.value)
    compareStep.value = 3
  } catch (e) {
    showToast('Comparison failed:  ' + e.message, 'error')
    compareStep.value = 1
  } finally {
    isComparing.value = false
    clearInterval(t)
  }
}
async function loadCompareHistory() {
  isLoadingCompareHistory.value = true
  compareStep.value = 4
  try {
    const res = await api.getCompareHistory()
    compareHistory.value = res.records || []
  } catch (e) {
    compareHistory.value = []
  } finally {
    isLoadingCompareHistory.value = false
  }
}
async function viewCompareDetail(recordId) {
  try {
    const detail = await api.getCompareDetail(recordId)
    compareResult.value = { diff_items: detail.diff_items, summary: detail.summary }
    compareStep.value = 3
  } catch (e) {
    showToast('Failed to load details:  ' + e.message, 'error')
  }
}
async function deleteCompareRecord(recordId) {
  try {
    await api.deleteCompareRecord(recordId)
    compareHistory.value = compareHistory.value.filter(r => r.id !== recordId)
    showToast('Deleted successfully', 'success')
  } catch (e) {
    showToast('Delete failed:  ' + e.message, 'error')
  }
}
function exportCompareReport() {
  if (!compareResult.value) return
  const summary = compareResult.value.summary || {}
  const diffItems = compareResult.value.diff_items || []
  let report = 'Contract Version Comparison Report\n'
  report += '=' .repeat(50) + '\n\n'
  report += `Total Changes: ${summary.total_changes || 0}\n`
  report += `Added Clauses: ${summary.added_count || 0}\n`
  report += `Deleted Clauses: ${summary.deleted_count || 0}\n`
  report += `Modified Clauses: ${summary.modified_count || 0}\n`
  report += `Overall Risk: ${summary.overall_risk === 'high' ? 'High Risk' : summary.overall_risk === 'medium' ? 'Medium Risk' : 'Low Risk'}\n\n`
  if (summary.recommendation) report += `Review Suggestions: ${summary.recommendation}\n\n`
  report += '-'.repeat(50) + '\nDetailed Differences\n' + '-'.repeat(50) + '\n\n'
  diffItems.forEach((diff, idx) => {
    const typeLabel = diff.type === 'added' ? 'Added' : diff.type === 'deleted' ? 'Delete' : 'Modified'
    const riskLabel = diff.risk_level === 'high' ? 'High Risk' : diff.risk_level === 'medium' ? 'Medium Risk' : 'Low Risk'
    report += `${idx + 1}. [${typeLabel}] ${diff.clause_title} (${riskLabel})\n`
    report += `   Change Description: ${diff.change_description}\n`
    if (diff.original_content) report += `   Original Content: ${diff.original_content}\n`
    if (diff.revised_content) report += `   Revised Content: ${diff.revised_content}\n`
    if (diff.legal_impact) report += `   Legal Impact: ${diff.legal_impact}\n`
    report += '\n'
  })
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Contract_Comparison_Report_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  showToast('Report exported', 'success')
}

// AI Proofread - Smart Proofreading
const proofreadStep = ref(1)
const proofreadInputMode = ref('file')
const proofreadFile = ref(null)
const proofreadFileInput = ref(null)
const proofreadTextInput = ref('')
const isProofreading = ref(false)
const proofreadProgress = ref('')
const proofreadResult = ref(null)
const proofreadHistory = ref([])
const isLoadingProofreadHistory = ref(false)
const proofreadCorrectedText = ref('')

const isProofreadDisabled = computed(() => {
  if (isProofreading.value) return true
  if (proofreadInputMode.value === 'file') return !proofreadFile.value
  return !proofreadTextInput.value || proofreadTextInput.value.trim().length < 10
})

function qualityLabel(quality) {
  const map = {
    excellent: { text: 'Excellent', cls: 'text-green-600' },
    good: { text: 'Good', cls: 'text-blue-600' },
    fair: { text: 'Fair', cls: 'text-amber-600' },
    poor: { text: 'Poor', cls: 'text-red-600' },
  }
  return map[quality] || map.good
}

function errorTypeStyle(type) {
  const map = {
    grammar: { label: 'Grammar', cls: 'bg-red-100 text-red-700' },
    spelling: { label: 'Spelling', cls: 'bg-orange-100 text-orange-700' },
    punctuation: { label: 'Punctuation', cls: 'bg-amber-100 text-amber-700' },
    fluency: { label: 'Fluency', cls: 'bg-blue-100 text-blue-700' },
    wording: { label: 'Wording', cls: 'bg-purple-100 text-purple-700' },
  }
  return map[type] || { label: type, cls: 'bg-slate-100 text-slate-700' }
}

function handleProofreadSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    const err = validateProofreadFile(file)
    if (err) { showToast(err, 'error'); return }
    proofreadFile.value = file
  }
}

function handleProofreadDrop(event) {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    const err = validateProofreadFile(file)
    if (err) { showToast(err, 'error'); return }
    proofreadFile.value = file
  }
}

function validateProofreadFile(file) {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  if (!['.pdf', '.docx', '.txt'].includes(ext)) return 'Unsupported file format, please upload .docx .pdf .txt files'
  if (file.size > 10 * 1024 * 1024) return 'File size exceeds 10MB limit'
  return null
}

async function startProofread() {
  isProofreading.value = true
  proofreadStep.value = 2
  proofreadProgress.value = 'Extracting document content...'
  const t = setInterval(() => {
    if (proofreadProgress.value.includes('Extracting')) proofreadProgress.value = 'Analyzing grammar and spelling...'
    else if (proofreadProgress.value.includes('Grammar')) proofreadProgress.value = 'Checking punctuation and wording...'
    else if (proofreadProgress.value.includes('Punctuation')) proofreadProgress.value = 'Generating proofreading report...'
  }, 2000)
  try {
    if (proofreadInputMode.value === 'file' && proofreadFile.value) {
      proofreadResult.value = await api.proofreadDocument(proofreadFile.value)
    } else if (proofreadInputMode.value === 'text' && proofreadTextInput.value) {
      proofreadResult.value = await api.proofreadTextDirect(proofreadTextInput.value)
    }
    proofreadCorrectedText.value = proofreadResult.value?.summary?.corrected_text || ''
    proofreadStep.value = 3
  } catch (e) {
    showToast('Proofreading failed:  ' + e.message, 'error')
    proofreadStep.value = 1
  } finally {
    isProofreading.value = false
    clearInterval(t)
  }
}

function applySingleCorrection(idx) {
  if (!proofreadResult.value?.errors?.[idx]) return
  const err = proofreadResult.value.errors[idx]
  if (proofreadCorrectedText.value && err.original_text && err.corrected_text) {
    proofreadCorrectedText.value = proofreadCorrectedText.value.replace(err.original_text, err.corrected_text)
  }
  proofreadResult.value.errors.splice(idx, 1)
  showToast('Correction accepted', 'success')
}

function applyAllCorrections() {
  if (!proofreadResult.value?.errors?.length) return
  proofreadCorrectedText.value = proofreadResult.value.summary?.corrected_text || proofreadCorrectedText.value
  proofreadResult.value.errors = []
  showToast('All errors have been fixed', 'success')
}

function copyCorrectedText() {
  if (!proofreadCorrectedText.value) return
  navigator.clipboard.writeText(proofreadCorrectedText.value).then(() => {
    showToast('Copied to clipboard', 'success')
  }).catch(() => {
    showToast('Copy failed', 'error')
  })
}

async function loadProofreadHistory() {
  isLoadingProofreadHistory.value = true
  proofreadStep.value = 4
  try {
    const res = await api.getProofreadHistory()
    proofreadHistory.value = res.records || []
  } catch (e) {
    proofreadHistory.value = []
  } finally {
    isLoadingProofreadHistory.value = false
  }
}

async function viewProofreadDetail(recordId) {
  try {
    const detail = await api.getProofreadDetail(recordId)
    proofreadResult.value = { errors: detail.errors, summary: detail.summary }
    proofreadCorrectedText.value = detail.summary?.corrected_text || ''
    proofreadStep.value = 3
  } catch (e) {
    showToast('Failed to load details:  ' + e.message, 'error')
  }
}

async function deleteProofreadRecord(recordId) {
  try {
    await api.deleteProofreadRecord(recordId)
    proofreadHistory.value = proofreadHistory.value.filter(r => r.id !== recordId)
    showToast('Deleted successfully', 'success')
  } catch (e) {
    showToast('Delete failed:  ' + e.message, 'error')
  }
}

function exportProofreadReport() {
  if (!proofreadResult.value) return
  const summary = proofreadResult.value.summary || {}
  const errors = proofreadResult.value.errors || []
  let report = 'AI Smart Proofreading Report\n'
  report += '='.repeat(50) + '\n\n'
  report += `Total Errors: ${summary.total_errors || 0}\n`
  report += `Grammar Errors: ${summary.grammar_count || 0}\n`
  report += `Spelling Errors: ${summary.spelling_count || 0}\n`
  report += `Punctuation Issues: ${summary.punctuation_count || 0}\n`
  report += `Fluency Issues: ${summary.fluency_count || 0}\n`
  report += `Wording Issues: ${summary.wording_count || 0}\n`
  report += `Document Quality: ${qualityLabel(summary.overall_quality).text}\n\n`
  if (summary.recommendation) report += `Suggestions: ${summary.recommendation}\n\n`
  report += '-'.repeat(50) + '\nError Details\n' + '-'.repeat(50) + '\n\n'
  errors.forEach((err, idx) => {
    const typeLabel = errorTypeStyle(err.error_type).label
    const sevLabel = err.severity === 'high' ? 'Severe' : err.severity === 'medium' ? 'Medium' : 'Minor'
    report += `${idx + 1}. [${typeLabel}][${sevLabel}] ${err.position_hint || `No. ${err.id}`}\n`
    report += `   Original: ${err.original_text}\n`
    report += `   Correction: ${err.corrected_text}\n`
    report += `   Description: ${err.error_description}\n`
    if (err.suggestion) report += `   Suggestion: ${err.suggestion}\n`
    report += '\n'
  })
  if (proofreadCorrectedText.value) {
    report += '-'.repeat(50) + '\nCorrected Full Text\n' + '-'.repeat(50) + '\n\n'
    report += proofreadCorrectedText.value
  }
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Proofreading_Report_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  showToast('Report exported', 'success')
}

// Doc Interpret - Smart Legal Document Interpretation
const interpretStep = ref(1)
const interpretInputMode = ref('file')
const interpretFile = ref(null)
const interpretFileInput = ref(null)
const interpretTextInput = ref('')
const isInterpreting = ref(false)
const interpretProgress = ref('')
const interpretResult = ref(null)
const interpretHistory = ref([])
const isLoadingInterpretHistory = ref(false)

const isInterpretDisabled = computed(() => {
  if (isInterpreting.value) return true
  if (interpretInputMode.value === 'file') return !interpretFile.value
  return !interpretTextInput.value || interpretTextInput.value.trim().length < 10
})

function difficultyStyle(level) {
  const map = {
    complex: { text: 'Complex', cls: 'text-red-600' },
    moderate: { text: 'Medium', cls: 'text-amber-600' },
    simple: { text: 'Simple', cls: 'text-green-600' },
  }
  return map[level] || map.moderate
}

function handleInterpretSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    const err = validateInterpretFile(file)
    if (err) { showToast(err, 'error'); return }
    interpretFile.value = file
  }
}

function handleInterpretDrop(event) {
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    const err = validateInterpretFile(file)
    if (err) { showToast(err, 'error'); return }
    interpretFile.value = file
  }
}

function validateInterpretFile(file) {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  if (!['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png'].includes(ext)) return 'Unsupported file format, please upload .docx .pdf .txt .jpg .png files'
  if (file.size > 10 * 1024 * 1024) return 'File size exceeds 10MB limit'
  return null
}

async function startInterpret() {
  if (interpretInputMode.value === 'file' && interpretFile.value) {
    interpretStep.value = 2
  } else if (interpretInputMode.value === 'text' && interpretTextInput.value) {
    isInterpreting.value = true
    interpretStep.value = 3
    interpretProgress.value = 'Analyzing document content...'
    const t = setInterval(() => {
      if (interpretProgress.value.includes('Analyzing')) interpretProgress.value = 'Interpreting key clauses...'
      else if (interpretProgress.value.includes('Interpreting')) interpretProgress.value = 'Identifying risks and deadlines...'
      else if (interpretProgress.value.includes('Identifying')) interpretProgress.value = 'Generating interpretation report...'
    }, 2000)
    try {
      interpretResult.value = await api.interpretTextDirect(interpretTextInput.value)
      interpretStep.value = 4
    } catch (e) {
      showToast('Interpretation failed:  ' + e.message, 'error')
      interpretStep.value = 1
    } finally {
      isInterpreting.value = false
      clearInterval(t)
    }
  }
}

async function confirmInterpret() {
  isInterpreting.value = true
  interpretStep.value = 3
  interpretProgress.value = 'Analyzing document content...'
  const t = setInterval(() => {
    if (interpretProgress.value.includes('Analyzing')) interpretProgress.value = 'Interpreting key clauses...'
    else if (interpretProgress.value.includes('Interpreting')) interpretProgress.value = 'Identifying risks and deadlines...'
    else if (interpretProgress.value.includes('Identifying')) interpretProgress.value = 'Generating interpretation report...'
  }, 2000)
  try {
    if (interpretFile.value) {
      interpretResult.value = await api.interpretDocument(interpretFile.value, null)
    } else if (interpretTextInput.value) {
      interpretResult.value = await api.interpretTextDirect(interpretTextInput.value)
    }
    interpretStep.value = 4
  } catch (e) {
    showToast('Interpretation failed:  ' + e.message, 'error')
    interpretStep.value = 2
  } finally {
    isInterpreting.value = false
    clearInterval(t)
  }
}

async function loadInterpretHistory() {
  isLoadingInterpretHistory.value = true
  interpretStep.value = 5
  try {
    const res = await api.getInterpretHistory()
    interpretHistory.value = res.records || []
  } catch (e) {
    interpretHistory.value = []
  } finally {
    isLoadingInterpretHistory.value = false
  }
}

async function viewInterpretDetail(recordId) {
  try {
    const detail = await api.getInterpretDetail(recordId)
    interpretResult.value = detail
    interpretStep.value = 4
  } catch (e) {
    showToast('Failed to load details:  ' + e.message, 'error')
  }
}

async function deleteInterpretRecord(recordId) {
  try {
    await api.deleteInterpretRecord(recordId)
    interpretHistory.value = interpretHistory.value.filter(r => r.id !== recordId)
    showToast('Deleted successfully', 'success')
  } catch (e) {
    showToast('Delete failed:  ' + e.message, 'error')
  }
}

function exportInterpretReport() {
  if (!interpretResult.value) return
  const r = interpretResult.value
  let report = 'Smart Legal Document Interpretation Report\n'
  report += '='.repeat(50) + '\n\n'
  report += `Document Type: ${r.document_type}\n`
  report += `Comprehension Difficulty: ${difficultyStyle(r.difficulty_level).text}\n`
  report += `Interpretation Score: ${r.interpretation_score} pts\n`
  if (r.parties?.length) report += `Parties: ${r.parties.join('、')}\n`
  report += '\n' + '-'.repeat(50) + '\nDocument Summary\n' + '-'.repeat(50) + '\n\n'
  report += r.summary + '\n\n'
  if (r.overall_assessment) report += `Overall Assessment: ${r.overall_assessment}\n\n`
  if (r.key_clauses?.length) {
    report += '-'.repeat(50) + '\nKey Clause Interpretation\n' + '-'.repeat(50) + '\n\n'
    r.key_clauses.forEach((clause, idx) => {
      const riskLabel = clause.risk_level === 'high' ? 'High Risk' : clause.risk_level === 'medium' ? 'Medium Risk' : clause.risk_level === 'low' ? 'Low Risk' : ''
      report += `${idx + 1}. ${clause.clause_title}${riskLabel ? ` [${riskLabel}]` : ''}\n`
      report += `   Original: ${clause.original_text}\n`
      report += `   Interpretation: ${clause.interpretation}\n`
      if (clause.legal_significance) report += `   Legal Significance: ${clause.legal_significance}\n`
      report += '\n'
    })
  }
  if (r.risk_warnings?.length) {
    report += '-'.repeat(50) + '\nRisk Warnings\n' + '-'.repeat(50) + '\n\n'
    r.risk_warnings.forEach((risk, idx) => {
      const sevLabel = risk.severity === 'high' ? 'Severe' : risk.severity === 'medium' ? 'Medium' : 'Minor'
      report += `${idx + 1}. [${sevLabel}] ${risk.risk_title}\n`
      report += `   Description: ${risk.description}\n`
      if (risk.suggestion) report += `   Suggestion: ${risk.suggestion}\n`
      report += '\n'
    })
  }
  if (r.rights_obligations?.length) {
    report += '-'.repeat(50) + '\nRights & Obligations Analysis\n' + '-'.repeat(50) + '\n\n'
    r.rights_obligations.forEach((ro) => {
      report += `【${ro.party}】\n`
      if (ro.rights?.length) report += `  Rights: ${ro.rights.join('；')}\n`
      if (ro.obligations?.length) report += `  Obligations: ${ro.obligations.join('；')}\n`
      report += '\n'
    })
  }
  if (r.key_deadlines?.length) {
    report += '-'.repeat(50) + '\nKey Deadlines\n' + '-'.repeat(50) + '\n\n'
    r.key_deadlines.forEach((dl) => {
      report += `- ${dl.deadline_desc}: ${dl.date_or_period}\n`
      if (dl.consequence) report += `  Consequence of delay: ${dl.consequence}\n`
    })
    report += '\n'
  }
  if (r.legal_terms?.length) {
    report += '-'.repeat(50) + '\nLegal Terminology\n' + '-'.repeat(50) + '\n\n'
    r.legal_terms.forEach((term) => {
      report += `${term.term}: ${term.definition}\n`
    })
    report += '\n'
  }
  if (r.action_suggestions?.length) {
    report += '-'.repeat(50) + '\nAction Suggestions\n' + '-'.repeat(50) + '\n\n'
    r.action_suggestions.forEach((suggestion, idx) => {
      report += `${idx + 1}. ${suggestion}\n`
    })
  }
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Legal_Document_Interpretation_Report_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  showToast('Report exported', 'success')
}

// Contract Draft - Smart Contract Drafting
const draftStep = ref(1)
const contractCategories = ref([])
const selectedTemplate = ref(null)
const draftElements = ref({})
const draftOutline = ref('')
const generatedContractText = ref('')
const isGeneratingOutline = ref(false)
const isGeneratingContract = ref(false)
const isCheckingQuality = ref(false)
const contractQualityResult = ref(null)
const draftActiveCategory = ref('all')
const draftFavorites = ref(JSON.parse(localStorage.getItem('draftFavorites') || '[]'))
const showPreviewModal = ref(false)
const previewTemplate = ref(null)
const userTemplates = ref([])
const showCreateTemplateForm = ref(false)
const isLoadingCategories = ref(false)
const isCreatingTemplate = ref(false)
const allTemplatesFlat = ref([])
const draftSearchKeyword = ref('')
const draftSearchResults = ref([])
const isSearchingTemplates = ref(false)
const draftInputMode = ref('form')
const draftNluInput = ref('')
const draftNluFields = ref({})
const draftNluQuestions = ref([])
const isExtractingFields = ref(false)
let draftSearchTimer = null
const newTemplateForm = ref({
  name: '',
  description: '',
  category_id: '',
  subcategory_id: '',
  fields: [{ label: 'Party A', field_type: 'text', required: true }, { label: 'Party B', field_type: 'text', required: true }],
  outline_sections: ['Contract Parties', 'Contract Subject', 'RightsObligations', 'Breach of Contract', 'Dispute Resolution'],
})

const hasRequiredFields = computed(() => {
  if (!selectedTemplate.value) return false
  return selectedTemplate.value.fields
    .filter(f => f.required)
    .every(f => draftElements.value[f.key] && draftElements.value[f.key].trim())
})

const displayedCategories = computed(() => {
  if (draftActiveCategory.value === 'all') return contractCategories.value
  return contractCategories.value.filter(c => c.id === draftActiveCategory.value)
})

const favoriteTemplates = computed(() => {
  return allTemplatesFlat.value.filter(t => draftFavorites.value.includes(t.id))
})

const totalTemplateCount = computed(() => {
  return allTemplatesFlat.value.length
})

const categoryGradients = {
  civil: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  commercial: 'linear-gradient(135deg, #6366f1, #4338ca)',
  labor: 'linear-gradient(135deg, #14b8a6, #0d9488)',
  ip: 'linear-gradient(135deg, #a855f7, #7c3aed)',
  investment: 'linear-gradient(135deg, #f59e0b, #d97706)',
  other: 'linear-gradient(135deg, #64748b, #475569)',
}

const categoryIcons = {
  civil: 'ph-handshake',
  commercial: 'ph-buildings',
  labor: 'ph-users',
  ip: 'ph-lightbulb',
  investment: 'ph-chart-line-up',
  other: 'ph-folder',
}

const categoryBadgeBgs = {
  civil: '#dbeafe',
  commercial: '#e0e7ff',
  labor: '#ccfbf1',
  ip: '#f3e8ff',
  investment: '#fef3c7',
  other: '#f1f5f9',
}

const categoryBadgeColors = {
  civil: '#1d4ed8',
  commercial: '#4338ca',
  labor: '#0d9488',
  ip: '#7c3aed',
  investment: '#b45309',
  other: '#475569',
}

function getCategoryGradient(categoryId) {
  return categoryGradients[categoryId] || categoryGradients.other
}

function getCategoryIcon(categoryId) {
  return categoryIcons[categoryId] || 'ph-folder'
}

function getCategoryBadgeBg(categoryId) {
  return categoryBadgeBgs[categoryId] || categoryBadgeBgs.other
}

function getCategoryBadgeColor(categoryId) {
  return categoryBadgeColors[categoryId] || categoryBadgeColors.other
}

function getCategoryName(categoryId) {
  const cat = contractCategories.value.find(c => c.id === categoryId)
  return cat ? cat.name : categoryId
}

function toggleFavorite(templateId) {
  if (!templateId) return
  const idx = draftFavorites.value.indexOf(templateId)
  if (idx >= 0) {
    draftFavorites.value.splice(idx, 1)
  } else {
    draftFavorites.value.push(templateId)
  }
  localStorage.setItem('draftFavorites', JSON.stringify(draftFavorites.value))
}

async function openPreview(tpl) {
  if (tpl.fields && tpl.outline_sections) {
    previewTemplate.value = tpl
    showPreviewModal.value = true
    return
  }
  try {
    const detail = await api.getContractTemplateDetail(tpl.id)
    previewTemplate.value = detail
    showPreviewModal.value = true
  } catch (e) {
    previewTemplate.value = tpl
    showPreviewModal.value = true
  }
}

async function startDraftFromPreview() {
  if (!previewTemplate.value) return
  const tpl = previewTemplate.value
  showPreviewModal.value = false
  if (tpl.fields && tpl.outline_sections) {
    selectDraftTemplate(tpl)
  } else {
    await loadAndSelectTemplate(tpl.id)
  }
}

async function loadAndSelectTemplate(templateId) {
  try {
    const detail = await api.getContractTemplateDetail(templateId)
    selectDraftTemplate(detail)
  } catch (e) {
    showToast(`Failed to load template:  ${e.message}`, 'error')
  }
}

function selectDraftTemplate(template) {
  selectedTemplate.value = template
  draftElements.value = {}
  if (template.fields) {
    template.fields.forEach(f => {
      draftElements.value[f.key] = f.default_value || ''
    })
  }
  draftOutline.value = ''
  generatedContractText.value = ''
  contractQualityResult.value = null
  draftStep.value = 2
}

async function extractDraftFields() {
  if (!selectedTemplate.value || !draftNluInput.value.trim()) return
  isExtractingFields.value = true
  try {
    const result = await api.extractFields(draftNluInput.value, selectedTemplate.value.id)
    if (result.fields) {
      draftNluFields.value = result.fields
      for (const [key, value] of Object.entries(result.fields)) {
        if (value && value !== null) {
          draftElements.value[key] = value
        }
      }
      const clarifyResult = await api.clarifyMissing(JSON.stringify(result.fields), selectedTemplate.value.id)
      draftNluQuestions.value = clarifyResult.questions || []
    }
  } catch (err) {
    console.error('Field extraction failed: ', err)
  } finally {
    isExtractingFields.value = false
  }
}

async function handleGenerateOutline() {
  if (!selectedTemplate.value || !hasRequiredFields.value) return
  isGeneratingOutline.value = true
  try {
    const result = await api.generateContractOutline({
      template_id: selectedTemplate.value.id,
      elements: draftElements.value,
    })
    draftOutline.value = result.outline
    draftStep.value = 3
  } catch (e) {
    showToast(`Outline generation failed:  ${e.message}`, 'error')
  } finally {
    isGeneratingOutline.value = false
  }
}

async function handleGenerateContract() {
  if (!selectedTemplate.value || !draftOutline.value.trim()) return
  isGeneratingContract.value = true
  try {
    const result = await api.generateContractText({
      template_id: selectedTemplate.value.id,
      elements: draftElements.value,
      outline: draftOutline.value,
      search_law: true,
    })
    generatedContractText.value = result.contract_text
    draftStep.value = 4
  } catch (e) {
    showToast(`Contract generation failed:  ${e.message}`, 'error')
  } finally {
    isGeneratingContract.value = false
  }
}

async function handleContractQualityCheck() {
  if (!generatedContractText.value) return
  isCheckingQuality.value = true
  try {
    contractQualityResult.value = await api.checkDocumentQuality(generatedContractText.value)
  } catch (e) {
    contractQualityResult.value = { quality_check: 'Quality check failed', is_qualified: false }
  } finally {
    isCheckingQuality.value = false
  }
}

function handleExportContract() {
  if (!generatedContractText.value) return
  const blob = new Blob([generatedContractText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${selectedTemplate.value?.name || 'Contract'}_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  showToast('Contract exported', 'success')
}

function resetDraft() {
  draftStep.value = 1
  selectedTemplate.value = null
  draftElements.value = {}
  draftOutline.value = ''
  generatedContractText.value = ''
  contractQualityResult.value = null
  draftActiveCategory.value = 'all'
  draftSearchKeyword.value = ''
  draftSearchResults.value = []
}

function handleDraftSearch() {
  if (draftSearchTimer) clearTimeout(draftSearchTimer)
  const keyword = draftSearchKeyword.value.trim()
  if (!keyword) {
    draftSearchResults.value = []
    return
  }
  isSearchingTemplates.value = true
  draftSearchTimer = setTimeout(async () => {
    try {
      const localResults = allTemplatesFlat.value.filter(t =>
        t.name.toLowerCase().includes(keyword.toLowerCase()) ||
        t.description.toLowerCase().includes(keyword.toLowerCase()) ||
        (t.subcategory_name && t.subcategory_name.toLowerCase().includes(keyword.toLowerCase()))
      )
      if (localResults.length > 0) {
        draftSearchResults.value = localResults
      } else {
        const result = await api.searchContractTemplates(keyword)
        draftSearchResults.value = (result.templates || []).map(t => ({
          ...t,
          field_count: t.field_count || t.fields?.length || '?',
        }))
      }
    } catch (e) {
      draftSearchResults.value = allTemplatesFlat.value.filter(t =>
        t.name.toLowerCase().includes(keyword.toLowerCase()) ||
        t.description.toLowerCase().includes(keyword.toLowerCase())
      )
    } finally {
      isSearchingTemplates.value = false
    }
  }, 300)
}

function clearDraftSearch() {
  draftSearchKeyword.value = ''
  draftSearchResults.value = []
}

async function loadContractCategories() {
  isLoadingCategories.value = true
  try {
    const result = await api.getContractCategories()
    contractCategories.value = result.categories || []
    const flat = []
    for (const cat of contractCategories.value) {
      for (const sub of cat.subcategories || []) {
        for (const tpl of sub.templates || []) {
          flat.push({ ...tpl, category_id: cat.id, subcategory_name: sub.name, field_count: tpl.field_count || 0 })
        }
      }
    }
    allTemplatesFlat.value = flat
  } catch (e) {
    contractCategories.value = []
    allTemplatesFlat.value = []
  } finally {
    isLoadingCategories.value = false
  }
}

async function loadUserTemplates() {
  try {
    const result = await api.getUserTemplates()
    userTemplates.value = result.templates || []
  } catch (e) {
    userTemplates.value = []
  }
}

async function deleteUserTemplate(id) {
  try {
    await api.deleteUserTemplate(id)
    await loadUserTemplates()
    showToast('Template deleted', 'success')
  } catch (e) {
    showToast('Delete failed', 'error')
  }
}

function editUserTemplate(ut) {
  selectDraftTemplate(ut)
}

function openCreateTemplateForm() {
  newTemplateForm.value = {
    name: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    fields: [{ label: 'Party A', field_type: 'text', required: true }, { label: 'Party B', field_type: 'text', required: true }],
    outline_sections: ['Contract Parties', 'Contract Subject', 'RightsObligations', 'Breach of Contract', 'Dispute Resolution'],
  }
  showCreateTemplateForm.value = true
}

function getSubcategoriesForCategory(categoryId) {
  const cat = contractCategories.value.find(c => c.id === categoryId)
  return cat ? cat.subcategories : []
}

async function handleCreateUserTemplate() {
  if (!newTemplateForm.value.name.trim()) return
  isCreatingTemplate.value = true
  try {
    const fields = newTemplateForm.value.fields
      .filter(f => f.label.trim())
      .map((f, idx) => ({
        key: `field_${idx}`,
        label: f.label,
        field_type: f.field_type || 'text',
        required: f.required !== false,
        placeholder: `Please enter ${f.label}`,
        options: [],
        default_value: '',
      }))
    const outlineSections = newTemplateForm.value.outline_sections.filter(s => s.trim())
    await api.createUserTemplate({
      name: newTemplateForm.value.name,
      description: newTemplateForm.value.description,
      category_id: newTemplateForm.value.category_id,
      subcategory_id: newTemplateForm.value.subcategory_id,
      fields,
      outline_sections: outlineSections,
      prompt_template: '',
      law_references: [],
    })
    showCreateTemplateForm.value = false
    await loadUserTemplates()
    showToast('Template created successfully', 'success')
  } catch (e) {
    showToast(`Creation failed:  ${e.message}`, 'error')
  } finally {
    isCreatingTemplate.value = false
  }
}

// DocGen V2
const docStep = ref(1)
const docCategories = ref([])
const selectedDocTemplate = ref(null)
const docElements = ref({})
const docOutline = ref('')
const generatedDocText = ref('')
const isGeneratingDocOutline = ref(false)
const isGeneratingDocText = ref(false)
const isCheckingDocQuality = ref(false)
const docQualityResult = ref(null)
const docActiveCategory = ref('all')
const docFavorites = ref(JSON.parse(localStorage.getItem('docFavorites') || '[]'))
const docRecentUsed = ref(JSON.parse(localStorage.getItem('docRecentUsed') || '[]'))
const docUsageFilter = ref('')
const showDocPreviewModal = ref(false)
const docPreviewTemplate = ref(null)
const isLoadingDocCategories = ref(false)
const docInputMode = ref('form')
const docNluInput = ref('')
const docNluFields = ref({})
const docNluQuestions = ref([])
const isExtractingDocFields = ref(false)

const docCategoryGradients = {
  litigation: 'linear-gradient(135deg, #ef4444, #dc2626)',
  labor_arb: 'linear-gradient(135deg, #14b8a6, #0d9488)',
  marriage_family: 'linear-gradient(135deg, #ec4899, #db2777)',
  inheritance: 'linear-gradient(135deg, #f59e0b, #d97706)',
  debt_dispute: 'linear-gradient(135deg, #f97316, #ea580c)',
  daily_general: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  lawyer_docs: 'linear-gradient(135deg, #6366f1, #4f46e5)',
  arbitration: 'linear-gradient(135deg, #a855f7, #9333ea)',
}

const docCategoryIcons = {
  litigation: 'ph-scales',
  labor_arb: 'ph-users',
  marriage_family: 'ph-heart',
  inheritance: 'ph-scroll',
  debt_dispute: 'ph-money',
  daily_general: 'ph-file-text',
  lawyer_docs: 'ph-briefcase',
  arbitration: 'ph-gavel',
}

const docCategoryBadgeBgs = {
  litigation: '#fef2f2',
  labor_arb: '#ccfbf1',
  marriage_family: '#fce7f3',
  inheritance: '#fef3c7',
  debt_dispute: '#fff7ed',
  daily_general: '#dbeafe',
  lawyer_docs: '#e0e7ff',
  arbitration: '#f3e8ff',
}

const docCategoryBadgeColors = {
  litigation: '#dc2626',
  labor_arb: '#0d9488',
  marriage_family: '#db2777',
  inheritance: '#b45309',
  debt_dispute: '#ea580c',
  daily_general: '#2563eb',
  lawyer_docs: '#4f46e5',
  arbitration: '#9333ea',
}

function getDocCategoryGradient(categoryId) {
  return docCategoryGradients[categoryId] || 'linear-gradient(135deg, #64748b, #475569)'
}

function getDocCategoryIcon(categoryId) {
  return docCategoryIcons[categoryId] || 'ph-folder'
}

function getDocCategoryBadgeBg(categoryId) {
  return docCategoryBadgeBgs[categoryId] || '#f1f5f9'
}

function getDocCategoryBadgeColor(categoryId) {
  return docCategoryBadgeColors[categoryId] || '#475569'
}

function getDocCategoryName(categoryId) {
  const cat = docCategories.value.find(c => c.id === categoryId)
  return cat ? cat.name : categoryId
}

const hasRequiredDocFields = computed(() => {
  if (!selectedDocTemplate.value) return false
  return selectedDocTemplate.value.fields
    .filter(f => f.required)
    .every(f => docElements.value[f.key] && docElements.value[f.key].trim())
})

const displayedDocCategories = computed(() => {
  if (docActiveCategory.value === 'all') {
    if (!docUsageFilter.value) return docCategories.value
    return docCategories.value.filter(c => getDocCategoryUsages(c.id).includes(docUsageFilter.value))
  }
  return docCategories.value.filter(c => c.id === docActiveCategory.value)
})

const favoriteDocTemplates = computed(() => {
  const flat = []
  for (const cat of docCategories.value) {
    for (const tpl of cat.templates || []) {
      flat.push({ ...tpl, category_id: cat.id })
    }
  }
  return flat.filter(t => docFavorites.value.includes(t.id))
})

const recentDocTemplates = computed(() => {
  const flat = []
  for (const cat of docCategories.value) {
    for (const tpl of cat.templates || []) {
      flat.push({ ...tpl, category_id: cat.id })
    }
  }
  return docRecentUsed.value
    .map(id => flat.find(t => t.id === id))
    .filter(Boolean)
})

const totalDocTemplateCount = computed(() => {
  return docCategories.value.reduce((sum, cat) => sum + (cat.template_count || 0), 0)
})

const docCategoryUsageMap = {
  litigation: ['Litigation'],
  labor_arb: ['Arbitration', 'Non-litigation'],
  marriage_family: ['Litigation', 'Non-litigation'],
  inheritance: ['Litigation', 'Non-litigation'],
  debt_dispute: ['Litigation', 'Non-litigation'],
  daily_general: ['Daily', 'Non-litigation'],
  lawyer_docs: ['Lawyer', 'Non-litigation'],
  arbitration: ['Arbitration'],
}

function getDocCategoryUsages(categoryId) {
  return docCategoryUsageMap[categoryId] || ['Daily']
}

function getFilteredTemplatesForCategory(cat) {
  if (!docUsageFilter.value) return cat.templates || []
  if (!getDocCategoryUsages(cat.id).includes(docUsageFilter.value)) return []
  return cat.templates || []
}

function toggleDocFavorite(templateId) {
  if (!templateId) return
  const idx = docFavorites.value.indexOf(templateId)
  if (idx >= 0) {
    docFavorites.value.splice(idx, 1)
  } else {
    docFavorites.value.push(templateId)
  }
  localStorage.setItem('docFavorites', JSON.stringify(docFavorites.value))
}

async function openDocPreview(tpl) {
  if (tpl.fields && tpl.outline_sections) {
    docPreviewTemplate.value = tpl
    showDocPreviewModal.value = true
    return
  }
  try {
    const detail = await api.getDocTemplateDetail(tpl.id)
    docPreviewTemplate.value = detail
    showDocPreviewModal.value = true
  } catch (e) {
    docPreviewTemplate.value = tpl
    showDocPreviewModal.value = true
  }
}

async function startDocFromPreview() {
  if (!docPreviewTemplate.value) return
  const tpl = docPreviewTemplate.value
  showDocPreviewModal.value = false
  if (tpl.fields && tpl.outline_sections) {
    selectDocTemplate(tpl)
  } else {
    await loadAndSelectDocTemplate(tpl.id)
  }
}

async function loadAndSelectDocTemplate(templateId) {
  try {
    const detail = await api.getDocTemplateDetail(templateId)
    selectDocTemplate(detail)
  } catch (e) {
    showToast(`Failed to load template:  ${e.message}`, 'error')
  }
}

function selectDocTemplate(template) {
  selectedDocTemplate.value = template
  docElements.value = {}
  if (template.fields) {
    template.fields.forEach(f => {
      docElements.value[f.key] = f.default_value || ''
    })
  }
  docOutline.value = ''
  generatedDocText.value = ''
  docQualityResult.value = null
  const idx = docRecentUsed.value.indexOf(template.id)
  if (idx >= 0) docRecentUsed.value.splice(idx, 1)
  docRecentUsed.value.unshift(template.id)
  if (docRecentUsed.value.length > 10) docRecentUsed.value = docRecentUsed.value.slice(0, 10)
  localStorage.setItem('docRecentUsed', JSON.stringify(docRecentUsed.value))
  docStep.value = 2
}

async function extractDocFields() {
  if (!selectedDocTemplate.value || !docNluInput.value.trim()) return
  isExtractingDocFields.value = true
  try {
    const result = await api.extractFields(docNluInput.value, selectedDocTemplate.value.id)
    if (result.fields) {
      docNluFields.value = result.fields
      for (const [key, value] of Object.entries(result.fields)) {
        if (value && value !== null) {
          docElements.value[key] = value
        }
      }
      const clarifyResult = await api.clarifyMissing(JSON.stringify(result.fields), selectedDocTemplate.value.id)
      docNluQuestions.value = clarifyResult.questions || []
    }
  } catch (err) {
    console.error('Field extraction failed: ', err)
  } finally {
    isExtractingDocFields.value = false
  }
}

async function handleGenerateDocOutline() {
  if (!selectedDocTemplate.value || !hasRequiredDocFields.value) return
  isGeneratingDocOutline.value = true
  try {
    const result = await api.generateDocOutline({
      template_id: selectedDocTemplate.value.id,
      elements: docElements.value,
    })
    docOutline.value = result.outline
    docStep.value = 3
  } catch (e) {
    showToast(`Outline generation failed:  ${e.message}`, 'error')
  } finally {
    isGeneratingDocOutline.value = false
  }
}

async function handleGenerateDocText() {
  if (!selectedDocTemplate.value || !docOutline.value.trim()) return
  isGeneratingDocText.value = true
  try {
    const result = await api.generateDocText({
      template_id: selectedDocTemplate.value.id,
      elements: docElements.value,
      outline: docOutline.value,
    })
    generatedDocText.value = result.document_text
    docStep.value = 4
  } catch (e) {
    showToast(`Document generation failed:  ${e.message}`, 'error')
  } finally {
    isGeneratingDocText.value = false
  }
}

async function handleDocQualityCheck() {
  if (!generatedDocText.value) return
  isCheckingDocQuality.value = true
  try {
    docQualityResult.value = await api.checkDocQuality(generatedDocText.value)
  } catch (e) {
    docQualityResult.value = { quality_check: 'Quality check failed', is_qualified: false }
  } finally {
    isCheckingDocQuality.value = false
  }
}

function handleExportDoc() {
  if (!generatedDocText.value) return
  const blob = new Blob([generatedDocText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${selectedDocTemplate.value?.name || 'Legal Document'}_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  showToast('Document exported', 'success')
}

function resetDocGen() {
  docStep.value = 1
  selectedDocTemplate.value = null
  docElements.value = {}
  docOutline.value = ''
  generatedDocText.value = ''
  docQualityResult.value = null
  docActiveCategory.value = 'all'
  docUsageFilter.value = ''
}

async function loadDocCategories() {
  isLoadingDocCategories.value = true
  try {
    const result = await api.getDocCategories()
    docCategories.value = result.categories || []
  } catch (e) {
    console.error('[DocGen] Failed to load categories:', e)
    docCategories.value = []
  } finally {
    isLoadingDocCategories.value = false
  }
}

// Cases
const casesList = ref([])
const showNewCaseForm = ref(false)
const newCase = ref({ title: '', case_type: 'Labor Dispute', plaintiff: '', defendant: '', description: '' })
async function loadCases() { try { const r = await api.getCases(); casesList.value = r.cases || [] } catch (e) { casesList.value = [] } }
async function handleCreateCase() { if (!newCase.value.title) return; try { await api.createCase(newCase.value); showNewCaseForm.value = false; newCase.value = { title: '', case_type: 'Labor Dispute', plaintiff: '', defendant: '', description: '' }; await loadCases(); showToast('Case created successfully', 'success') } catch (e) { showToast('Creation failed', 'error') } }
async function handleDeleteCase(id) { try { await api.deleteCase(id); await loadCases(); showToast('Case deleted', 'success') } catch (e) { showToast('Delete failed', 'error') } }

// Account / API Key
const providers = ref([])
const selectedProvider = ref('dashscope')
const llmApiKey = ref('')
const llmModelName = ref('qwen-turbo')
const isSavingConfig = ref(false)
const isValidatingKey = ref(false)
const apiKeyValidation = ref(null)
const showApiKey = ref(false)

const currentProviderInfo = computed(() => providers.value.find(p => p.id === selectedProvider.value) || {})
const currentModels = computed(() => currentProviderInfo.value.models || ['qwen-turbo'])
const currentKeyHint = computed(() => currentProviderInfo.value.key_hint || 'Please enter API Key')
const currentProviderHasEnvKey = computed(() => currentProviderInfo.value.has_env_key || false)

function validateKeyFormat(key) {
  if (!key) return true
  const prefix = currentProviderInfo.value.key_prefix || ''
  if (prefix && !key.startsWith(prefix)) return false
  return key.length >= 8
}
function onProviderChange() {
  const info = currentProviderInfo.value
  if (info.default_model) llmModelName.value = info.default_model
  llmApiKey.value = ''; apiKeyValidation.value = null
}
async function loadProviders() { try { const r = await api.getProviders(); providers.value = r.providers || [] } catch (e) { providers.value = [] } }
async function loadAccountConfig() {
  if (authStore.userEmail) { try { const c = await api.getAccountConfig(authStore.userEmail); if (c.provider) selectedProvider.value = c.provider; llmApiKey.value = c.llm_api_key || ''; llmModelName.value = c.model_name || 'qwen-turbo' } catch (e) { /* defaults */ } }
}
async function checkApiKeyStatus() { try { const r = await api.checkApikey(); apiKeyConfigured.value = r.configured } catch (e) { apiKeyConfigured.value = false } }

async function handleSaveConfig() {
  if (llmApiKey.value && !validateKeyFormat(llmApiKey.value)) { showToast('API Key format is incorrect', 'error'); return }
  isSavingConfig.value = true; apiKeyValidation.value = null
  try { await api.saveAccountConfig({ provider: selectedProvider.value, llm_api_key: llmApiKey.value, model_name: llmModelName.value, email: authStore.userEmail }); apiKeyConfigured.value = true; showToast('Configuration saved', 'success'); apiKeyValidation.value = { valid: true, message: 'Configuration saved successfully' } }
  catch (e) { apiKeyValidation.value = { valid: false, message: `Save failed:  ${e.message}` }; showToast('Save failed', 'error') }
  finally { isSavingConfig.value = false }
}
async function handleValidateApiKey() {
  const keyToValidate = llmApiKey.value
  if (!keyToValidate && !currentProviderHasEnvKey.value) { showToast('Please enter API Key first', 'error'); return }
  if (keyToValidate && !validateKeyFormat(keyToValidate)) { showToast('API Key format is incorrect', 'error'); return }
  isValidatingKey.value = true; apiKeyValidation.value = null
  try { const r = await api.validateApiKey({ provider: selectedProvider.value, llm_api_key: keyToValidate, model_name: llmModelName.value }); apiKeyValidation.value = r; if (r.valid) showToast('API Key validated successfully', 'success'); else showToast('API Key validation failed', 'error') }
  catch (e) { apiKeyValidation.value = { valid: false, message: `Validation failed:  ${e.message}` }; showToast('Validation failed', 'error') }
  finally { isValidatingKey.value = false }
}

// Auth
async function handleAuth() {
  authError.value = ''; isAuthLoading.value = true
  try {
    if (isLogin.value) { await authStore.login(authEmail.value, authPassword.value) }
    else { if (!registerName.value.trim()) { authError.value = 'Please enter your name'; return }; if (authPassword.value.length < 6) { authError.value = 'Password must be at least 6 characters'; return }; await authStore.register(registerName.value, authEmail.value, authPassword.value); await authStore.login(authEmail.value, authPassword.value) }
    await Promise.all([loadProviders(), loadAccountConfig(), checkApiKeyStatus(), loadCases(), loadContractCategories(), loadUserTemplates(), loadDocCategories()])
  } catch (e) { authError.value = e.message || 'Operation failed, please retry' }
  finally { isAuthLoading.value = false }
}
function handleLogout() {
  authStore.logout(); currentView.value = 'dashboard'
  chatMessages.value = [{ role: 'assistant', content: 'Hello! I am the LexAI assistant. I can help answer legal questions, search cases and regulations. Please describe your legal issue.' }]
  generatedDocText.value = ''; contractStep.value = 1; contractResult.value = null; apiKeyConfigured.value = true
  resetDraft(); resetDocGen()
}

onMounted(async () => { if (authStore.isAuthenticated) await Promise.all([loadProviders(), loadAccountConfig(), checkApiKeyStatus(), loadCases(), loadContractCategories(), loadUserTemplates(), loadDocCategories()]) })
watch(currentView, (val) => {
  if (val === 'cases') loadCases()
  if (val === 'account') { loadAccountConfig(); checkApiKeyStatus() }
  if (val === 'contract-draft') { loadContractCategories(); loadUserTemplates() }
  if (val === 'docgen') loadDocCategories()
})
</script>

<style>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8fafc; position: relative; overflow: hidden; }
.login-bg-1, .login-bg-2 { position: absolute; width: 24rem; height: 24rem; border-radius: 9999px; mix-blend-mode: multiply; filter: blur(48px); opacity: 0.2; animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
.login-bg-1 { top: -10%; left: -10%; background: #3b82f6; }
.login-bg-2 { top: 20%; right: -10%; background: #6366f1; animation-delay: 2s; }
.login-card { width: 100%; max-width: 28rem; background: white; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1); z-index: 10; overflow: hidden; border: 1px solid #f1f5f9; }
.login-header { background: #2563eb; padding: 2rem; text-align: center; }
.login-body { padding: 2rem; }

.form-label { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 0.25rem; }
.form-input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; outline: none; color: #1e293b; background: white; font-size: 0.875rem; transition: box-shadow 0.15s; }
.form-input:focus { box-shadow: 0 0 0 2px #3b82f6; }

.btn-primary { background: #2563eb; color: white; font-weight: 500; padding: 0.625rem 1rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: background 0.15s; display: inline-flex; align-items: center; justify-content: center; font-size: 0.875rem; }
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
.btn-outline { border: 1px solid #cbd5e1; color: #475569; padding: 0.625rem 1rem; border-radius: 0.5rem; background: white; cursor: pointer; transition: background 0.15s; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; font-size: 0.875rem; }
.btn-outline:hover { background: #f8fafc; }
.btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

.msg-error { margin-bottom: 1rem; padding: 0.75rem; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 0.875rem; border-radius: 0.5rem; }
.msg-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; }

.card { background: white; border-radius: 0.75rem; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px 0 rgba(0,0,0,.05); padding: 1.25rem; }
.feature-card { background: white; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px 0 rgba(0,0,0,.05); cursor: pointer; transition: box-shadow 0.15s; }
.feature-card:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,.1); }
.scenario-card { background: white; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: border-color 0.15s; }
.scenario-card:hover { border-color: #93c5fd; }
.upload-zone { background: white; border: 2px dashed #cbd5e1; border-radius: 1rem; padding: 2.5rem; text-align: center; cursor: pointer; transition: background 0.15s; }
.upload-zone:hover { background: #f8fafc; }
.compare-upload-zone { background: white; border: 2px dashed #cbd5e1; border-radius: 0.75rem; padding: 2rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.15s; min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.compare-upload-zone:hover { background: #f8fafc; border-color: #8b5cf6; }
.compare-upload-zone.has-file { border-color: #22c55e; border-style: solid; background: #f0fdf4; }

.proofread-upload-zone { background: white; border: 2px dashed #cbd5e1; border-radius: 0.75rem; padding: 3rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.15s; min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.proofread-upload-zone:hover { background: #f8fafc; border-color: #10b981; }
.proofread-upload-zone.has-file { border-color: #22c55e; border-style: solid; background: #f0fdf4; }

.interpret-upload-zone { background: white; border: 2px dashed #cbd5e1; border-radius: 0.75rem; padding: 3rem 1.5rem; text-align: center; cursor: pointer; transition: all 0.15s; min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.interpret-upload-zone:hover { background: #fffbeb; border-color: #f59e0b; }
.interpret-upload-zone.has-file { border-color: #22c55e; border-style: solid; background: #f0fdf4; }

.template-card { background: white; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.15s; }
.template-card:hover { border-color: #5eead4; box-shadow: 0 2px 4px rgba(0,0,0,.05); }

.draft-cat-tabs { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; margin-bottom: 1.5rem; scrollbar-width: none; -ms-overflow-style: none; }
.draft-cat-tabs::-webkit-scrollbar { display: none; }
.draft-cat-tab { display: flex; align-items: center; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.8125rem; font-weight: 500; color: #64748b; background: white; border: 1px solid #e2e8f0; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
.draft-cat-tab:hover { background: #f8fafc; border-color: #cbd5e1; }
.draft-cat-tab.active { background: #0f172a; color: white; border-color: #0f172a; }

.draft-category-section { margin-bottom: 2rem; }
.draft-category-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.draft-category-icon { width: 2.25rem; height: 2.25rem; border-radius: 0.625rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.draft-category-count { font-size: 0.75rem; color: #94a3b8; background: #f1f5f9; padding: 0.25rem 0.625rem; border-radius: 9999px; flex-shrink: 0; }

.draft-template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }

.draft-tpl-card { background: white; border-radius: 0.875rem; border: 1px solid #e2e8f0; overflow: hidden; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.draft-tpl-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px -5px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.05); border-color: transparent; }

.draft-tpl-card-header { position: relative; height: 5rem; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.draft-tpl-card-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1.5rem; background: linear-gradient(to top, white, transparent); }

.draft-tpl-fav-btn { position: absolute; top: 0.5rem; right: 0.5rem; width: 1.75rem; height: 1.75rem; border-radius: 50%; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.7); transition: all 0.2s; z-index: 2; }
.draft-tpl-fav-btn:hover { background: rgba(255,255,255,0.4); color: white; }
.draft-tpl-fav-btn.is-fav { color: #fbbf24; background: rgba(251,191,36,0.2); }
.draft-tpl-fav-btn.is-fav:hover { background: rgba(251,191,36,0.4); }

.draft-tpl-action-btn { width: 1.5rem; height: 1.5rem; border-radius: 0.375rem; background: rgba(255,255,255,0.2); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.8); transition: all 0.15s; }
.draft-tpl-action-btn:hover { background: rgba(255,255,255,0.4); color: white; }

.draft-tpl-card-body { padding: 0.875rem 1rem 1rem; }

.draft-tpl-cat-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.01em; }
.draft-tpl-custom-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 600; background: #fef3c7; color: #b45309; }

.draft-tpl-card-title { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; line-height: 1.4; }
.draft-tpl-card-desc { font-size: 0.75rem; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.25rem; }

.draft-tpl-card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem; padding-top: 0.625rem; border-top: 1px solid #f1f5f9; }
.draft-tpl-field-count { font-size: 0.6875rem; color: #94a3b8; display: flex; align-items: center; }
.draft-tpl-preview-btn { display: flex; align-items: center; padding: 0.25rem 0.625rem; border-radius: 0.375rem; font-size: 0.6875rem; font-weight: 500; color: #0d9488; background: #f0fdfa; border: 1px solid #ccfbf1; cursor: pointer; transition: all 0.15s; }
.draft-tpl-preview-btn:hover { background: #ccfbf1; border-color: #99f6e4; }

.draft-tpl-card-custom { border-color: #fde68a; }
.draft-tpl-card-custom:hover { border-color: #fbbf24; }

.draft-empty-state { text-align: center; padding: 3rem 1rem; }

.draft-search-bar { margin-bottom: 1.25rem; }
.draft-search-input-wrap { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; background: white; border: 1px solid #e2e8f0; border-radius: 0.75rem; transition: all 0.2s; }
.draft-search-input-wrap:focus-within { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.draft-search-input { flex: 1; border: none; outline: none; font-size: 0.875rem; color: #1e293b; background: transparent; }
.draft-search-input::placeholder { color: #94a3b8; }
.draft-search-clear { display: flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #f1f5f9; border: none; cursor: pointer; color: #64748b; transition: all 0.15s; }
.draft-search-clear:hover { background: #e2e8f0; color: #334155; }
.draft-search-results { margin-bottom: 1.5rem; }

.doc-usage-chip { display: inline-flex; align-items: center; padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; color: #64748b; background: white; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.doc-usage-chip:hover { background: #f8fafc; border-color: #cbd5e1; }
.doc-usage-chip.active { background: #2563eb; color: white; border-color: #2563eb; }

.preview-modal-header { padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 0.75rem; }

.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.app-layout { display: flex; height: 100vh; background: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; }
.sidebar { width: 15rem; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; box-shadow: 0 1px 2px 0 rgba(0,0,0,.05); z-index: 10; transition: width 0.3s; overflow: hidden; flex-shrink: 0; }
.sidebar.collapsed { width: 4rem; }
.sidebar-logo { padding: 1.25rem; display: flex; align-items: center; gap: 0.625rem; color: #2563eb; cursor: pointer; transition: background 0.15s; }
.sidebar-logo:hover { background: #f8fafc; }
.sidebar-nav { flex: 1; padding: 0 0.75rem; margin-top: 0.25rem; }
.sidebar-item { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.75rem; border-radius: 0.5rem; transition: all 0.15s; font-weight: 500; font-size: 0.875rem; color: #475569; border: none; background: none; cursor: pointer; text-align: left; }
.sidebar-item:hover { background: #f8fafc; color: #0f172a; }
.sidebar-item.active { background: #eff6ff; color: #2563eb; }
.sidebar-user { padding: 0.75rem; border-top: 1px solid #f1f5f9; display: flex; align-items: center; gap: 0.75rem; }
.sidebar-avatar { width: 2.25rem; height: 2.25rem; background: #eff6ff; border-radius: 9999px; display: flex; align-items: center; justify-content: center; color: #2563eb; font-weight: 700; font-size: 0.875rem; flex-shrink: 0; }
.sidebar-user-info { overflow: hidden; }

.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.top-bar { height: 3.5rem; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; padding: 0 1.25rem; justify-content: space-between; box-shadow: 0 1px 2px 0 rgba(0,0,0,.05); z-index: 10; }
.content-area { flex: 1; overflow-y: auto; }
.page-container { padding: 1.5rem; max-width: 72rem; margin: 0 auto; }

.apikey-warning { display: flex; align-items: center; padding: 0.375rem 0.75rem; background: #fffbeb; border: 1px solid #fde68a; color: #b45309; font-size: 0.75rem; border-radius: 9999px; cursor: pointer; transition: background 0.15s; }
.apikey-warning:hover { background: #fef3c7; }
.agent-badge { display: flex; align-items: center; color: #64748b; background: #f8fafc; padding: 0.375rem 0.75rem; border-radius: 9999px; border: 1px solid #e2e8f0; font-size: 0.75rem; }

.chat-page { display: flex; flex-direction: column; height: calc(100vh - 3.5rem); background: #f8fafc; }
.chat-messages { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.chat-msg { display: flex; max-width: 85%; }
.chat-msg.user { margin-left: auto; flex-direction: row-reverse; }
.chat-msg.assistant { margin-right: auto; }
.chat-msg-avatar { width: 1.75rem; height: 1.75rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.chat-msg-avatar.user { background: #2563eb; margin-left: 0.625rem; }
.chat-msg-avatar.assistant { background: #4f46e5; margin-right: 0.625rem; }
.chat-msg-bubble { padding: 0.875rem; border-radius: 1rem; box-shadow: 0 1px 2px 0 rgba(0,0,0,.05); font-size: 0.875rem; line-height: 1.625; }
.chat-msg-bubble.user { background: #2563eb; color: white; border-top-right-radius: 0.25rem; }
.chat-msg-bubble.assistant { background: white; color: #1e293b; border-top-left-radius: 0.25rem; border: 1px solid #f1f5f9; }
.chat-msg-content { white-space: pre-wrap; word-break: break-word; }

.typing-indicator { display: flex; align-items: center; gap: 0.375rem; padding: 0.75rem 1rem; }
.typing-indicator .dot { width: 0.5rem; height: 0.5rem; background: #cbd5e1; border-radius: 9999px; animation: bounce 1s infinite; }
.typing-indicator .dot:nth-child(2) { animation-delay: 0.15s; }
.typing-indicator .dot:nth-child(3) { animation-delay: 0.3s; }

.agent-status-bar { padding: 0.5rem 1.25rem; background: #1e293b; color: #4ade80; font-size: 0.75rem; font-family: ui-monospace, monospace; display: flex; align-items: center; }

.chat-input-bar { padding: 0.75rem; background: white; border-top: 1px solid #e2e8f0; }
.chat-input-form { max-width: 56rem; margin: 0 auto; position: relative; display: flex; align-items: flex-end; border: 1px solid #cbd5e1; border-radius: 0.75rem; overflow: hidden; background: white; transition: box-shadow 0.15s; }
.chat-input-form:focus-within { box-shadow: 0 0 0 2px #3b82f6; }
.chat-textarea { width: 100%; padding: 0.625rem 3rem 0.625rem 1rem; max-height: 7rem; outline: none; resize: none; font-size: 0.875rem; border: none; background: transparent; }
.chat-send-btn { position: absolute; right: 0.625rem; bottom: 0.5rem; padding: 0.375rem; background: #2563eb; color: white; border-radius: 0.5rem; border: none; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; }
.chat-send-btn:hover { background: #1d4ed8; }
.chat-send-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

.spinner-lg { position: relative; width: 5rem; height: 5rem; }
.spinner-lg::before, .spinner-lg::after { content: ''; position: absolute; inset: 0; border-radius: 9999px; }
.spinner-lg::before { border: 4px solid #e0e7ff; }
.spinner-lg::after { border: 4px solid #4f46e5; border-top-color: transparent; animation: spin 1s linear infinite; }

.toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); padding: 0.75rem 1.25rem; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,.1); font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; z-index: 50; animation: fadeIn 0.25s ease-out; }
.toast.success { background: #16a34a; color: white; }
.toast.error { background: #dc2626; color: white; }
.toast.info { background: #1e293b; color: white; }

.animate-fade-in { animation: fadeIn 0.25s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bounce { 0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); } 50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 50% { opacity: 0.5; } }

.sidebar-section { padding: 0 0.75rem; margin-top: 0.25rem; }
.dark-toggle-btn { position: relative; }
.dark .dark-toggle-btn i { color: #fbbf24; }

/* ===== Dark Mode ===== */
* { transition: background-color 0.3s ease, border-color 0.3s ease, color 0.15s ease, box-shadow 0.3s ease; }

.dark .login-page { background: #0f172a; }
.dark .login-card { background: #1e293b; border-color: #334155; box-shadow: 0 20px 25px -5px rgba(0,0,0,.4); }
.dark .login-body h2 { color: #e2e8f0; }
.dark .form-label { color: #94a3b8; }
.dark .form-input { background: #0f172a; border-color: #334155; color: #e2e8f0; }
.dark .form-input:focus { box-shadow: 0 0 0 2px #3b82f6; }
.dark .form-input::placeholder { color: #64748b; }
.dark .login-body .text-slate-500 { color: #94a3b8 !important; }
.dark .login-body .text-blue-600 { color: #60a5fa !important; }
.dark .msg-error { background: #450a0a; border-color: #7f1d1d; color: #fca5a5; }

.dark .app-layout { background: #0f172a; color: #e2e8f0; }

.dark .sidebar { background: #1e293b; border-right-color: #334155; box-shadow: 0 1px 2px 0 rgba(0,0,0,.3); }
.dark .sidebar-logo { color: #60a5fa; }
.dark .sidebar-logo:hover { background: #334155; }
.dark .sidebar-item { color: #94a3b8; }
.dark .sidebar-item:hover { background: #334155; color: #e2e8f0; }
.dark .sidebar-item.active { background: #1e3a5f; color: #60a5fa; }
.dark .sidebar-user { border-top-color: #334155; }
.dark .sidebar-avatar { background: #1e3a5f; color: #60a5fa; }
.dark .dark-toggle-btn { color: #94a3b8; }
.dark .dark-toggle-btn:hover { background: #334155; color: #fbbf24; }

.dark .top-bar { background: #1e293b; border-bottom-color: #334155; box-shadow: 0 1px 2px 0 rgba(0,0,0,.3); }
.dark .top-bar .text-slate-800 { color: #e2e8f0 !important; }
.dark .top-bar .text-slate-500 { color: #94a3b8 !important; }
.dark .top-bar .hover\:bg-slate-100:hover { background: #334155 !important; }
.dark .apikey-warning { background: #451a03; border-color: #78350f; color: #fbbf24; }
.dark .apikey-warning:hover { background: #78350f; }
.dark .agent-badge { color: #94a3b8; background: #334155; border-color: #475569; }

.dark .card { background: #1e293b; border-color: #334155; box-shadow: 0 1px 2px 0 rgba(0,0,0,.2); }
.dark .feature-card { background: #1e293b; border-color: #334155; }
.dark .feature-card:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,.3); }
.dark .scenario-card { background: #1e293b; border-color: #334155; }
.dark .scenario-card:hover { border-color: #60a5fa; }

.dark .upload-zone { background: #1e293b; border-color: #475569; }
.dark .upload-zone:hover { background: #334155; }
.dark .compare-upload-zone { background: #1e293b; border-color: #475569; }
.dark .compare-upload-zone:hover { background: #334155; border-color: #8b5cf6; }
.dark .compare-upload-zone.has-file { border-color: #22c55e; background: #052e16; }

.dark .proofread-upload-zone { background: #1e293b; border-color: #475569; }
.dark .proofread-upload-zone:hover { background: #334155; border-color: #10b981; }
.dark .proofread-upload-zone.has-file { border-color: #22c55e; background: #052e16; }

.dark .interpret-upload-zone { background: #1e293b; border-color: #475569; }
.dark .interpret-upload-zone:hover { background: #334155; border-color: #f59e0b; }
.dark .interpret-upload-zone.has-file { border-color: #22c55e; background: #052e16; }

.dark .btn-primary { background: #2563eb; }
.dark .btn-primary:hover { background: #1d4ed8; }
.dark .btn-primary:disabled { background: #1e3a5f; color: #64748b; }
.dark .btn-outline { border-color: #475569; color: #94a3b8; background: #1e293b; }
.dark .btn-outline:hover { background: #334155; }

.dark .page-container h1, .dark .page-container h2, .dark .page-container h3 { color: #e2e8f0; }
.dark .page-container .text-slate-800 { color: #e2e8f0 !important; }
.dark .page-container .text-slate-700 { color: #cbd5e1 !important; }
.dark .page-container .text-slate-600 { color: #94a3b8 !important; }
.dark .page-container .text-slate-500 { color: #94a3b8 !important; }
.dark .page-container .text-slate-400 { color: #64748b !important; }
.dark .page-container .text-slate-300 { color: #64748b !important; }

.dark .chat-page { background: #0f172a; }
.dark .chat-messages { background: #0f172a; }
.dark .chat-msg-bubble.assistant { background: #1e293b; color: #e2e8f0; border-color: #334155; }
.dark .chat-input-bar { background: #1e293b; border-top-color: #334155; }
.dark .chat-input-form { background: #1e293b; border-color: #475569; }
.dark .chat-textarea { color: #e2e8f0; }
.dark .chat-textarea::placeholder { color: #64748b; }
.dark .agent-status-bar { background: #0f172a; }

.dark .template-card { background: #1e293b; border-color: #334155; }
.dark .template-card:hover { border-color: #5eead4; }
.dark .draft-cat-tab { background: #1e293b; border-color: #475569; color: #94a3b8; }
.dark .draft-cat-tab:hover { background: #334155; border-color: #64748b; }
.dark .draft-cat-tab.active { background: #60a5fa; color: #0f172a; border-color: #60a5fa; }
.dark .draft-category-count { color: #94a3b8; background: #334155; }
.dark .draft-tpl-card { background: #1e293b; border-color: #334155; }
.dark .draft-tpl-card:hover { box-shadow: 0 8px 25px -5px rgba(0,0,0,.4); }
.dark .draft-tpl-card-header::after { background: linear-gradient(to top, #1e293b, transparent); }
.dark .draft-tpl-card-title { color: #e2e8f0; }
.dark .draft-tpl-card-desc { color: #94a3b8; }
.dark .draft-tpl-card-footer { border-top-color: #334155; }
.dark .draft-tpl-preview-btn { color: #5eead4; background: #042f2e; border-color: #115e59; }
.dark .draft-tpl-preview-btn:hover { background: #115e59; border-color: #0d9488; }
.dark .draft-tpl-custom-badge { background: #451a03; color: #fbbf24; }
.dark .draft-tpl-card-custom { border-color: #78350f; }
.dark .draft-tpl-card-custom:hover { border-color: #b45309; }
.dark .draft-search-input-wrap { background: #1e293b; border-color: #475569; }
.dark .draft-search-input-wrap:focus-within { border-color: #60a5fa; box-shadow: 0 0 0 3px rgba(96,165,250,0.15); }
.dark .draft-search-input { color: #e2e8f0; }
.dark .draft-search-input::placeholder { color: #64748b; }
.dark .draft-search-clear { background: #334155; color: #94a3b8; }
.dark .draft-search-clear:hover { background: #475569; color: #e2e8f0; }
.dark .doc-usage-chip { color: #94a3b8; background: #1e293b; border-color: #475569; }
.dark .doc-usage-chip:hover { background: #334155; border-color: #64748b; }
.dark .doc-usage-chip.active { background: #2563eb; color: white; border-color: #2563eb; }

.dark .spinner-lg::before { border-color: #1e3a5f; }
.dark .spinner-lg::after { border-color: #818cf8; border-top-color: transparent; }

.dark .toast.info { background: #334155; }

.dark .bg-slate-50 { background: #1e293b !important; }
.dark .bg-blue-50 { background: #172554 !important; }
.dark .bg-green-50 { background: #052e16 !important; }
.dark .bg-red-50 { background: #450a0a !important; }
.dark .bg-amber-50 { background: #451a03 !important; }
.dark .bg-violet-50 { background: #2e1065 !important; }
.dark .bg-indigo-50 { background: #1e1b4b !important; }
.dark .bg-teal-50 { background: #042f2e !important; }
.dark .border-slate-100 { border-color: #334155 !important; }
.dark .border-slate-200 { border-color: #334155 !important; }
.dark .border-blue-100 { border-color: #1e3a5f !important; }
.dark .border-green-100 { border-color: #065f46 !important; }
.dark .border-red-100 { border-color: #7f1d1d !important; }
.dark .border-blue-500 { border-color: #3b82f6 !important; }
.dark .border-red-500 { border-color: #ef4444 !important; }
.dark .border-green-500 { border-color: #22c55e !important; }
.dark .border-amber-500 { border-color: #f59e0b !important; }
.dark .text-slate-800 { color: #e2e8f0 !important; }
.dark .text-slate-700 { color: #cbd5e1 !important; }
.dark .text-slate-600 { color: #94a3b8 !important; }
.dark .text-slate-500 { color: #94a3b8 !important; }
.dark .text-slate-400 { color: #64748b !important; }
.dark .text-blue-900 { color: #93c5fd !important; }
.dark .text-blue-800 { color: #93c5fd !important; }
.dark .text-blue-700 { color: #60a5fa !important; }
.dark .text-blue-600 { color: #60a5fa !important; }
.dark .text-blue-500 { color: #60a5fa !important; }
.dark .text-indigo-600 { color: #818cf8 !important; }
.dark .text-violet-600 { color: #a78bfa !important; }
.dark .text-teal-600 { color: #5eead4 !important; }
.dark .text-green-600 { color: #4ade80 !important; }
.dark .text-green-500 { color: #22c55e !important; }
.dark .text-red-600 { color: #f87171 !important; }
.dark .text-red-500 { color: #ef4444 !important; }
.dark .text-amber-600 { color: #fbbf24 !important; }
.dark .text-amber-500 { color: #f59e0b !important; }
.dark .hover\:bg-slate-100:hover { background: #334155 !important; }
.dark .hover\:text-slate-800:hover { color: #f1f5f9 !important; }
.dark .bg-white { background: #1e293b !important; }
.dark .bg-green-200 { background: #065f46 !important; }
.dark .bg-red-200 { background: #7f1d1d !important; }
.dark .bg-amber-200 { background: #78350f !important; }
.dark .bg-red-100 { background: #450a0a !important; }
.dark .bg-amber-100 { background: #451a03 !important; }
.dark .bg-blue-100 { background: #1e3a5f !important; }
.dark .text-green-800 { color: #4ade80 !important; }
.dark .text-red-800 { color: #f87171 !important; }
.dark .text-amber-800 { color: #fbbf24 !important; }
.dark .text-red-700 { color: #fca5a5 !important; }
.dark .text-amber-700 { color: #fde68a !important; }
.dark .text-blue-700 { color: #93c5fd !important; }

.dark .border { border-color: #334155; }
.dark hr { border-color: #334155; }
.dark textarea.form-input { background: #0f172a; border-color: #334155; color: #e2e8f0; }
.dark select.form-input { background: #0f172a; border-color: #334155; color: #e2e8f0; }

.dark .content-area { background: #0f172a; }

.dark .preview-modal-header { background: #1e293b; border-bottom-color: #334155; }

.dark .typing-indicator .dot { background: #64748b; }

.dark .msg-success { background: #052e16; color: #4ade80; border-color: #065f46; }
.dark .hover\:bg-red-50:hover { background: #450a0a !important; }
.dark .border-amber-200 { border-color: #78350f !important; }
.dark .border-red-300 { border-color: #7f1d1d !important; }
.dark .text-red-500 { color: #f87171 !important; }
.dark .hover\:text-slate-600:hover { color: #e2e8f0 !important; }
.dark .hover\:text-red-700:hover { color: #fca5a5 !important; }
.dark .font-mono { color: #e2e8f0; }
.dark .bg-blue-50 { background: #172554 !important; }
.dark .bg-red-50 { background: #450a0a !important; }
.dark .bg-amber-50 { background: #451a03 !important; }
.dark .border-blue-200 { border-color: #1e3a5f !important; }
.dark .border-slate-300 { border-color: #475569 !important; }
.dark .text-slate-300 { color: #94a3b8 !important; }
.dark .text-slate-200 { color: #cbd5e1 !important; }
.dark .p-2\.5 { background: transparent; }
.dark .text-xs.text-slate-400 { color: #64748b !important; }
.dark .bg-slate-100 { background: #334155 !important; }
.dark .bg-slate-200 { background: #475569 !important; }
.dark .hover\:bg-slate-200:hover { background: #475569 !important; }
.dark .hover\:bg-amber-100:hover { background: #78350f !important; }
.dark .hover\:bg-amber-50:hover { background: #451a03 !important; }
.dark .border-slate-200 { border-color: #475569 !important; }
.dark .text-slate-900 { color: #f1f5f9 !important; }
.dark .text-slate-100 { color: #e2e8f0 !important; }
.dark .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,.4) !important; }
.dark .ring-1 { --tw-ring-color: #475569; }
.dark .divide-slate-200 > :not([hidden]) ~ :not([hidden]) { border-color: #334155; }

.dark .bg-teal-100 { background: #042f2e !important; }
.dark .text-teal-700 { color: #5eead4 !important; }
.dark .text-teal-500 { color: #14b8a6 !important; }
.dark .text-indigo-500 { color: #818cf8 !important; }
.dark .text-indigo-400 { color: #a5b4fc !important; }
.dark .text-red-400 { color: #f87171 !important; }
.dark .bg-blue-700 { background: #1d4ed8 !important; }
.dark .bg-indigo-500 { background: #6366f1 !important; }
.dark .bg-teal-500 { background: #14b8a6 !important; }
.dark .bg-red-500 { background: #ef4444 !important; }
.dark .bg-amber-500 { background: #f59e0b !important; }
.dark .bg-violet-500 { background: #8b5cf6 !important; }
.dark .bg-slate-600 { background: #475569 !important; }
.dark .bg-slate-50\/50 { background: rgba(30,41,59,0.5) !important; }
.dark .border-t { border-color: #334155; }
.dark .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,.5) !important; }
.dark .backdrop-blur-sm { background: rgba(0,0,0,.6) !important; }

.dark .bg-blue-500 { background: #3b82f6 !important; }
.dark .bg-indigo-500 { background: #6366f1 !important; }

.dark .hover\:bg-blue-700:hover { background: #1d4ed8 !important; }
.dark .hover\:bg-green-700:hover { background: #15803d !important; }

.dark .text-white { color: white !important; }
.dark .text-white\/70 { color: rgba(255,255,255,0.7) !important; }
.dark .bg-white\/20 { background: rgba(255,255,255,0.2) !important; }
.dark .hover\:bg-white\/30:hover { background: rgba(255,255,255,0.3) !important; }

.dark .bg-green-100 { background: #052e16 !important; }
.dark .bg-green-50 { background: #052e16 !important; }
.dark .text-green-700 { color: #4ade80 !important; }
.dark .border-green-200 { border-color: #065f46 !important; }
.dark .hover\:bg-green-100:hover { background: #065f46 !important; }
.dark .border-green-100 { border-color: #065f46 !important; }
.dark .text-green-500 { color: #22c55e !important; }
.dark .bg-green-200 { background: #065f46 !important; }
.dark .border-ccfbf1 { border-color: #115e59 !important; }
.dark .bg-ccfbf1 { background: #115e59 !important; }
.dark .hover\:bg-ccfbf1:hover { background: #0d9488 !important; }
.dark .hover\:border-99f6e4:hover { border-color: #0d9488 !important; }

@media (max-width: 768px) {
  .sidebar { width: 4rem; }
  .sidebar span, .sidebar-user-info { display: none !important; }
  .page-container { padding: 1rem; }
  .draft-template-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; }
  .draft-tpl-card-header { height: 4rem; }
  .draft-tpl-card-title { font-size: 0.8125rem; }
  .draft-tpl-card-desc { -webkit-line-clamp: 1; line-clamp: 1; min-height: 1.125rem; }
  .draft-cat-tabs { gap: 0.375rem; }
  .draft-cat-tab { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
  .draft-category-header { flex-wrap: wrap; }
  .draft-category-count { display: none; }
}
</style>
