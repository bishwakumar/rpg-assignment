<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'

const blogStore = useBlogStore()
const router = useRouter()

const title = ref('')
const content = ref('')
const error = ref<string | null>(null)

async function onSubmit() {
  error.value = null
  try {
    await blogStore.createBlog({
      title: title.value,
      content: content.value,
    })
    title.value = ''
    content.value = ''
    await router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to publish blog'
  }
}
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>Write</h1>
    </header>

    <form class="editor" @submit.prevent="onSubmit">
      <label class="field">
        <span>Blog Title *</span>
        <input
          v-model="title"
          type="text"
          placeholder="Enter your blog title..."
          required
        />
      </label>

      <label class="field">
        <span>Content *</span>
        <textarea
          v-model="content"
          rows="12"
          placeholder="Share your thoughts and stories..."
          required
        />
      </label>

      <p v-if="error" class="error">
        {{ error }}
      </p>

      <div class="actions">
        <button class="primary" type="submit" :disabled="blogStore.loading">
          {{ blogStore.loading ? 'Publishing...' : 'Publish Blog' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
}

.editor {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
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

input,
textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  outline: none;
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.primary {
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  background: #111827;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.error {
  color: #b91c1c;
  font-size: 13px;
}
</style>


