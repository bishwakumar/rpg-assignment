<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { computed, onMounted, watch, ref, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import BellIcon from '@/components/BellIcon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notificationStore = useNotificationStore()

// Dropdown state
const showUserDropdown = ref(false)
const userDropdownRef = ref<HTMLElement | null>(null)

// Toggle dropdown
function toggleUserDropdown() {
  showUserDropdown.value = !showUserDropdown.value
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (userDropdownRef.value && !userDropdownRef.value.contains(event.target as Node)) {
    showUserDropdown.value = false
  }
}

const isAuthPage = computed(() =>
  ['/sign-in', '/sign-up'].includes(route.path),
)

// Track if we've attempted to start subscription to avoid duplicate attempts
let subscriptionStartAttempted = false

// Helper function to start subscription if needed
async function ensureSubscriptionStarted() {
  // Check if subscription is already active
  const hasActiveSubscription = notificationStore.subscription !== null && notificationStore.subscription !== undefined
  
  if (hasActiveSubscription) {
    return true
  }
  
  if (subscriptionStartAttempted) {
    return false
  }
  
  subscriptionStartAttempted = true
  
  try {
    await notificationStore.startSubscription()
    
    // Verify it's actually set
    if (notificationStore.subscription) {
      return true
    } else {
      console.error('Subscription is null after startSubscription!')
      subscriptionStartAttempted = false // Allow retry
      return false
    }
  } catch (error) {
    console.error('Failed to start subscription:', error)
    subscriptionStartAttempted = false // Allow retry on error
    return false
  }
}

// Initialize notification subscription when authenticated
// This handles both new logins and already-logged-in users (page refresh)
watch(
  () => auth.isAuthenticated,
  async (isAuth) => {
    if (isAuth) {
      await ensureSubscriptionStarted()
    } else {
      subscriptionStartAttempted = false
      notificationStore.unsubscribe()
      notificationStore.clear()
    }
  },
  { immediate: true },
)

// Add click outside listener and initialize subscription on mount
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  
  // Initialize auth store to verify token and load user
  await auth.initialize()
  
  // Small delay to ensure stores are fully initialized
  await new Promise(resolve => setTimeout(resolve, 200))
  
  if (auth.isAuthenticated) {
    await ensureSubscriptionStarted()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Handle logout
function handleLogout() {
  showUserDropdown.value = false
  auth.logout()
  router.push('/sign-in')
}

// Handle double-click on notification bell to close notifications tab
function handleBellDoubleClick(event: MouseEvent) {
  event.preventDefault()
  if (route.path === '/notifications') {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="app">
    <header v-if="!isAuthPage" class="topbar">
      <div class="left">
        <RouterLink to="/dashboard" class="brand">Readit Blogs</RouterLink>
      </div>
      <nav class="nav">
        <RouterLink to="/create-blog" class="write-button">Write</RouterLink>
        <RouterLink to="/dashboard">Home</RouterLink>
        <RouterLink 
          to="/notifications" 
          class="notification-link"
          @dblclick="handleBellDoubleClick"
        >
          <div class="bell-wrapper">
            <BellIcon />
            <span v-if="notificationStore.unreadNotificationCount > 0" class="badge">
              <span class="badge-count">{{ 
                notificationStore.unreadNotificationCount > 99 ? '99+' : notificationStore.unreadNotificationCount 
              }}</span>
            </span>
          </div>
        </RouterLink>
        <div v-if="auth.isAuthenticated" class="user-menu" ref="userDropdownRef">
          <button type="button" class="avatar" @click="toggleUserDropdown">
            {{ auth.user?.username?.[0]?.toUpperCase() ?? 'U' }}
          </button>
          <div v-if="showUserDropdown" class="user-dropdown">
            <div class="user-info">
              <div class="user-name">{{ auth.user?.username ?? 'User' }}</div>
              <div class="user-email">{{ auth.user?.email ?? '' }}</div>
            </div>
            <div class="dropdown-divider"></div>
            <button type="button" class="logout-button" @click="handleLogout">
              Logout
            </button>
          </div>
        </div>
        <RouterLink v-else to="/sign-in">Sign in</RouterLink>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  width: 100%;
  background: #f3f4f6;
  display: flex;
  flex-direction: column;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  background: #ffffffcc;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e5e7eb;
}

.brand {
  font-weight: 700;
  font-size: 18px;
  color: #111827;
  text-decoration: none;
}

.nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav a {
  text-decoration: none;
  font-size: 14px;
  color: #4b5563;
}

.nav a.router-link-active {
  color: #111827;
  font-weight: 600;
}

.write-button {
  padding: 8px 16px;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff !important;
  font-weight: 500;
}

.write-button.router-link-active {
  background: #2563eb;
  color: #ffffff !important;
}

.notification-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  position: relative;
}

.bell-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  background: #ef4444;
  border-radius: 9px;
  border: 2px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  animation: pulse 2s infinite;
}

.badge-count {
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.user-menu {
  position: relative;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: none;
  background: #111827;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.avatar:hover {
  opacity: 0.9;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-width: 200px;
  overflow: hidden;
  z-index: 1000;
}

.user-info {
  padding: 12px 16px;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: #111827;
  margin-bottom: 4px;
}

.user-email {
  font-size: 13px;
  color: #6b7280;
}

.dropdown-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0;
}

.logout-button {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #ef4444;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-button:hover {
  background-color: #fef2f2;
}

main {
  flex: 1;
  width: 100%;
  padding-top: 8px;
}
</style>

