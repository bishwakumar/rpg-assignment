<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const formError = ref<string | null>(null)

async function onSubmit() {
  formError.value = null
  try {
    await auth.login({
      email: email.value,
      password: password.value,
    })
    // Redirect to the original destination or default to dashboard
    const redirect = (route.query.redirect as string) || '/dashboard'
    await router.push(redirect)
  } catch (e: any) {
    formError.value = e?.message ?? 'Failed to sign in'
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="card">
      <h1 class="title">Sign in</h1>

      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span>Email address *</span>
          <input
            v-model="email"
            type="email"
            placeholder="john.doe@example.com"
            required
          />
        </label>

        <label class="field">
          <span>Password *</span>
          <input
            v-model="password"
            type="password"
            placeholder="Enter your password"
            required
          />
        </label>

        <p v-if="formError" class="error">
          {{ formError }}
        </p>

        <button class="primary" type="submit" :disabled="auth.loading">
          {{ auth.loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <p class="switch">
        New to Readit Blogs?
        <RouterLink to="/sign-up">Create an account</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fb;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 40px 48px;
  width: 480px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #111827;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field span {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #374151;
}

input[type='email'],
input[type='password'],
input[type='text'] {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
}

.primary {
  margin-top: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 999px;
  border: none;
  background: #111827;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s, transform 0.05s;
}

.primary:disabled {
  background: #9ca3af;
  cursor: default;
}

.primary:not(:disabled):hover {
  background: #030712;
}

.primary:not(:disabled):active {
  transform: translateY(1px);
}

.switch {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
}

.switch a {
  color: #2563eb;
  font-weight: 500;
}

.error {
  color: #b91c1c;
  font-size: 13px;
}
</style>


