<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'

const notificationStore = useNotificationStore()
const route = useRoute()
const router = useRouter()

onMounted(async () => {
  // Fetch all markers, notification state, and unread count from database
  await notificationStore.fetchNotificationState()
  await Promise.all([
    notificationStore.fetchAllMarkers(),
    notificationStore.fetchUnreadNotificationCount(),
  ])
  // Subscription for new markers is handled in App.vue when authenticated
})

// Refresh markers when route changes to notifications
watch(
  () => route.path,
  async (path) => {
    if (path === '/notifications') {
      await notificationStore.fetchAllMarkers()
      await notificationStore.fetchUnreadNotificationCount()
    }
  }
)

// Handle marker click - navigate to blog
async function handleMarkerClick(blogId: string, markerVersion: number) {
  // Mark this marker as seen
  await notificationStore.markAsSeen(markerVersion)
  // Navigate to dashboard with blog ID to open the blog modal
  router.push({ path: '/dashboard', query: { blogId } })
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>Notifications</h1>
        <!-- <p>{{ notificationStore.unreadCount }} recent update!</p> -->
      </div>
    </header>

    <section class="list">
      <article
        v-for="marker in notificationStore.markers"
        :key="marker.markerVersion"
        class="item"
        :class="{ unread: marker.markerVersion > notificationStore.lastSeenMarkerVersion }"
        @click="handleMarkerClick(marker.blog.id, marker.markerVersion)"
      >
        <div class="icon">📝</div>
        <div class="content">
          <p class="text">
            <strong>@{{ marker.blog.author.username }}</strong>
            published a new post: <strong>{{ marker.blog.title }}</strong>
          </p>
          <p class="meta">
            {{ new Date(marker.createdAt).toLocaleString() }}
          </p>
        </div>
        <div v-if="marker.markerVersion > notificationStore.lastSeenMarkerVersion" class="badge"></div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.header p {
  font-size: 14px;
  color: #6b7280;
}

.link {
  border: none;
  background: none;
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.item:hover {
  background: #f9fafb;
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.item.unread {
  border-left: 3px solid #2563eb;
}

.badge {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
}

.icon {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text {
  font-size: 14px;
  color: #111827;
}

.meta {
  font-size: 12px;
  color: #9ca3af;
}

.empty {
  font-size: 14px;
  color: #6b7280;
}
</style>


