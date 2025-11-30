<script setup lang="ts">
import { onMounted, onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore, type Blog } from '@/stores/blog'

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()
let hasLoaded = false

const selectedBlog = ref<Blog | null>(null)
const showModal = ref(false)

async function loadBlogs() {
  // Only fetch if we haven't loaded yet or if blogs list is empty
  if (!hasLoaded || blogStore.blogs.length === 0) {
    await blogStore.fetchBlogs()
    hasLoaded = true
  }
}

function openBlogModal(blog: Blog) {
  selectedBlog.value = blog
  showModal.value = true
  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden'
}

function closeBlogModal() {
  showModal.value = false
  selectedBlog.value = null
  // Restore body scroll
  document.body.style.overflow = ''
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }
  return date.toLocaleDateString('en-US', options)
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeBlogModal()
  }
}

// Watch for blogId query parameter to open blog modal
watch(
  () => route.query.blogId,
  async (blogId) => {
    if (blogId && typeof blogId === 'string') {
      // Ensure blogs are loaded
      await loadBlogs()
      
      // Find the blog by ID
      const blog = blogStore.blogs.find(b => b.id === blogId)
      if (blog) {
        openBlogModal(blog)
        // Clear the query parameter
        router.replace({ path: '/dashboard', query: {} })
      }
    }
  },
  { immediate: true }
)

onMounted(() => {
  loadBlogs()
})

// Refresh when navigating back to dashboard (but only if needed)
onActivated(() => {
  // Only refresh if blogs list is empty
  if (blogStore.blogs.length === 0) {
    loadBlogs()
  }
})
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1>Blogs & stories</h1>
    </header>

    <section class="list">
      <article 
        v-for="blog in blogStore.blogs" 
        :key="blog.id" 
        class="card"
        @click="openBlogModal(blog)"
      >
        <div class="meta">
          <span class="author">{{ blog.author.username }}</span>
          <span class="dot">•</span>
          <span class="time">{{
            formatDateTime(blog.createdAt)
          }}</span>
        </div>
        <h2 class="title">{{ blog.title }}</h2>
        <p class="excerpt">
          {{ blog.content }}
        </p>
      </article>

      <div v-if="blogStore.loading" class="loading">
        Loading blogs...
      </div>
      <p v-else-if="!blogStore.blogs.length" class="empty">
        No posts yet. Be the first to share something!
      </p>
    </section>

    <!-- Blog Post Modal -->
    <div 
      v-if="showModal && selectedBlog" 
      class="modal-overlay"
      @click="handleBackdropClick"
    >
      <div class="modal" @click.stop>
        <button class="close-button" @click="closeBlogModal" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div class="modal-author">
          <div class="author-avatar">
            {{ selectedBlog.author.username[0]?.toUpperCase() || 'U' }}
          </div>
          <div class="author-info">
            <div class="author-name">{{ selectedBlog.author.username }}</div>
            <div class="author-username">@{{ selectedBlog.author.username.toLowerCase() }}</div>
            <div class="author-date">{{ formatDateTime(selectedBlog.createdAt) }}</div>
          </div>
        </div>

        <div class="modal-content">
          <h1 class="blog-title">{{ selectedBlog.title }}</h1>
          <div class="blog-body">
            <p v-for="(paragraph, index) in selectedBlog.content.split('\n\n')" :key="index">
              {{ paragraph }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.hero {
  margin-bottom: 16px;
}

.hero h1 {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.1);
}

.meta {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
}

.author {
  font-weight: 600;
}

.dot {
  margin: 0 4px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #111827;
}

.excerpt {
  font-size: 14px;
  color: #4b5563;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
  max-height: calc(1.5em * 3);
}

.empty {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  padding: 40px 20px;
}

.loading {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  padding: 40px 20px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.modal {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalFadeIn 0.2s ease-out;
  position: relative;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
  z-index: 10;
}

.close-button:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.modal-author {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
}

.author-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #111827;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  flex-shrink: 0;
}

.author-info {
  flex: 1;
}

.author-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.author-username {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.author-date {
  font-size: 13px;
  color: #9ca3af;
}

.modal-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.blog-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 20px 0;
  line-height: 1.3;
}

.blog-body {
  color: #374151;
  font-size: 16px;
  line-height: 1.7;
}

.blog-body p {
  margin: 0 0 16px 0;
}

.blog-body p:last-child {
  margin-bottom: 0;
}
</style>


