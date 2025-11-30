import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apolloClient, setAuthTokenGetter } from '@/apollo/client'
import gql from 'graphql-tag'

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        username
      }
    }
  }
`

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        username
      }
    }
  }
`

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      username
    }
  }
`

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<{ id: string; email: string; username: string } | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initializing = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Register token getter with Apollo Client for WebSocket
  setAuthTokenGetter(() => token.value)

  function setToken(newToken: string | null) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }

  async function register(input: {
    email: string
    username: string
    password: string
  }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apolloClient.mutate({
        mutation: REGISTER_MUTATION,
        variables: { input },
      })
      if (data?.register?.token) {
        setToken(data.register.token)
        user.value = data.register.user
        
        // Start WebSocket subscription immediately after registration with the new JWT
        const { useNotificationStore } = await import('@/stores/notifications')
        const notificationStore = useNotificationStore()
        
        // Start subscription right after registration - it will fetch initial data and subscribe
        await notificationStore.startSubscription()
      }
    } catch (e: any) {
      error.value = e.message ?? 'Registration failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function login(input: { email: string; password: string }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { input },
      })
      if (data?.login?.token) {
        setToken(data.login.token)
        user.value = data.login.user
        
        // Start WebSocket subscription immediately after login with the new JWT
        // This ensures the subscription uses the correct token
        const { useNotificationStore } = await import('@/stores/notifications')
        const notificationStore = useNotificationStore()
        
        // Start subscription right after login - it will fetch initial data and subscribe
        await notificationStore.startSubscription()
      }
    } catch (e: any) {
      error.value = e.message ?? 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function initialize() {
    // Only initialize if we have a token but no user, and not already initializing
    if (!token.value || user.value || initializing.value) {
      return
    }

    initializing.value = true
    try {
      const { data } = await apolloClient.query({
        query: ME_QUERY,
        fetchPolicy: 'network-only', // Always fetch from server to verify token
      })
      if (data?.me) {
        user.value = data.me
      } else {
        // Token is invalid, clear it
        setToken(null)
        user.value = null
      }
    } catch (e: any) {
      // Token is invalid or expired, clear it
      setToken(null)
      user.value = null
    } finally {
      initializing.value = false
    }
  }

  function logout() {
    setToken(null)
    user.value = null
  }

  return {
    token,
    user,
    loading,
    error,
    initializing,
    isAuthenticated,
    register,
    login,
    logout,
    initialize,
  }
})


