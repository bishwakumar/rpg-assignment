import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DashboardView from '@/views/DashboardView.vue'
import SignInView from '@/views/SignInView.vue'
import SignUpView from '@/views/SignUpView.vue'
import CreateBlogView from '@/views/CreateBlogView.vue'
import NotificationsView from '@/views/NotificationsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/sign-in',
      name: 'sign-in',
      component: SignInView,
      meta: { public: true },
    },
    {
      path: '/sign-up',
      name: 'sign-up',
      component: SignUpView,
      meta: { public: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/create-blog',
      name: 'create-blog',
      component: CreateBlogView,
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationsView,
    },
  ]
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  
  // If we have a token but haven't initialized yet, initialize now
  if (auth.token && !auth.user && !auth.initializing) {
    await auth.initialize()
  }
  
  // Wait for any ongoing initialization to complete (with timeout)
  let timeout = 0
  const maxWait = 2000 // 2 seconds max wait
  while (auth.initializing && timeout < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 50))
    timeout += 50
  }
  
  // If user is authenticated and trying to access public routes (sign-in/sign-up), redirect to dashboard
  if (to.meta.public && auth.isAuthenticated) {
    next({ name: 'dashboard' })
    return
  }
  
  // Allow public routes for unauthenticated users
  if (to.meta.public) {
    next()
    return
  }
  
  // Protect private routes - require authentication
  if (!auth.isAuthenticated) {
    // Redirect to sign-in with return URL so user can come back after login
    next({ 
      name: 'sign-in',
      query: { redirect: to.fullPath }
    })
  } else {
    next()
  }
})

export default router
