import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('access_token') || '')
  const userName = ref(localStorage.getItem('user_name') || '')
  const userEmail = ref(localStorage.getItem('user_email') || '')
  const userPlan = ref(localStorage.getItem('user_plan') || '免费版')

  const isAuthenticated = computed(() => !!token.value)

  const userInfo = computed(() => ({
    name: userName.value,
    email: userEmail.value,
    plan: userPlan.value,
  }))

  function _saveToStorage() {
    localStorage.setItem('access_token', token.value)
    localStorage.setItem('user_name', userName.value)
    localStorage.setItem('user_email', userEmail.value)
    localStorage.setItem('user_plan', userPlan.value)
  }

  async function login(email: string, password: string) {
    const result = await api.login({ email, password })
    token.value = result.access_token
    userName.value = result.user.name
    userEmail.value = result.user.email
    userPlan.value = result.user.plan
    _saveToStorage()
    return result
  }

  async function register(name: string, email: string, password: string) {
    const result = await api.register({ name, email, password })
    return result
  }

  async function resetPassword(email: string, newPassword: string) {
    return api.resetPassword(email, newPassword)
  }

  function logout() {
    token.value = ''
    userName.value = ''
    userEmail.value = ''
    userPlan.value = '免费版'
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_plan')
  }

  async function refreshUser() {
    if (!token.value) return
    try {
      const user = await api.getCurrentUser(token.value)
      userName.value = user.name
      userEmail.value = user.email
      userPlan.value = user.plan
      _saveToStorage()
    } catch {
      logout()
    }
  }

  function updateUserName(name: string) {
    userName.value = name
    localStorage.setItem('user_name', name)
  }

  return {
    token,
    userName,
    userEmail,
    userPlan,
    isAuthenticated,
    userInfo,
    login,
    register,
    resetPassword,
    logout,
    refreshUser,
    updateUserName,
  }
})
