import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apolloClient, ensureWsLinkReady } from '@/apollo/client'
import gql from 'graphql-tag'

const NEW_NOTIFICATION_MARKER_SUBSCRIPTION = gql`
  subscription NewNotificationMarker {
    newNotificationMarker {
      markerVersion
      createdAt
      blog {
        id
        title
        content
        createdAt
        author {
          id
          username
        }
      }
    }
  }
`

// Query to fetch unread markers
const UNREAD_MARKERS_QUERY = gql`
  query UnreadMarkers {
    unreadMarkers {
      markerVersion
      createdAt
      blog {
        id
        title
        content
        createdAt
        author {
          id
          username
        }
      }
    }
  }
`

// Query to fetch all markers
const ALL_MARKERS_QUERY = gql`
  query AllMarkers {
    allMarkers {
      markerVersion
      createdAt
      blog {
        id
        title
        content
        createdAt
        author {
          id
          username
        }
      }
    }
  }
`

// Query to get user notification state
const NOTIFICATION_STATE_QUERY = gql`
  query NotificationState {
    notificationState {
      userId
      lastSeenMarkerVersion
      updatedAt
    }
  }
`

// Query to get unread notification count
const UNREAD_NOTIFICATION_COUNT_QUERY = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`

// Mutation to update last seen marker version
const UPDATE_LAST_SEEN_MARKER_VERSION_MUTATION = gql`
  mutation UpdateLastSeenMarkerVersion($markerVersion: Int!) {
    updateLastSeenMarkerVersion(markerVersion: $markerVersion) {
      count
      lastSeenMarkerVersion
    }
  }
`

export interface NotificationMarker {
  markerVersion: number
  createdAt: string
  blog: {
    id: string
    title: string
    content: string
    createdAt: string
    author: {
      id: string
      username: string
    }
  }
}

export const useNotificationStore = defineStore('notifications', () => {
  const markers = ref<NotificationMarker[]>([])
  const loading = ref(false)
  const lastSeenMarkerVersion = ref<number>(0)
  const unreadNotificationCount = ref<number>(0)
  const subscription = ref<any>(null)
  let wasConnected = false

  // Computed: count of unread markers (from local state)
  const unreadCount = computed(() => {
    return markers.value.filter(m => m.markerVersion > lastSeenMarkerVersion.value).length
  })

  // Computed: has new notifications (markers after last seen version)
  const hasNewNotifications = computed(() => {
    return unreadNotificationCount.value > 0
  })

  // Fetch all markers from database
  async function fetchAllMarkers() {
    loading.value = true
    try {
      const { data } = await apolloClient.query({
        query: ALL_MARKERS_QUERY,
        fetchPolicy: 'network-only',
      })

      if (data?.allMarkers) {
        const fetchedMarkers: NotificationMarker[] = data.allMarkers.map((m: any) => ({
          markerVersion: m.markerVersion,
          createdAt: m.createdAt,
          blog: {
            id: m.blog.id,
            title: m.blog.title,
            content: m.blog.content,
            createdAt: m.blog.createdAt,
            author: {
              id: m.blog.author.id,
              username: m.blog.author.username,
            },
          },
        }))

        // Sort by markerVersion descending (newest first)
        markers.value = fetchedMarkers.sort(
          (a, b) => b.markerVersion - a.markerVersion
        )
        
        // Update unread count based on fetched markers
        const unreadMarkersCount = markers.value.filter(
          m => m.markerVersion > lastSeenMarkerVersion.value
        ).length
        unreadNotificationCount.value = unreadMarkersCount
      }
    } catch (error: any) {
      console.error('Failed to fetch all markers:', error)
    } finally {
      loading.value = false
    }
  }

  // Fetch unread markers from database
  async function fetchUnreadMarkers() {
    loading.value = true
    try {
      const { data } = await apolloClient.query({
        query: UNREAD_MARKERS_QUERY,
        fetchPolicy: 'network-only',
      })

      if (data?.unreadMarkers) {
        const fetchedMarkers: NotificationMarker[] = data.unreadMarkers.map((m: any) => ({
          markerVersion: m.markerVersion,
          createdAt: m.createdAt,
          blog: {
            id: m.blog.id,
            title: m.blog.title,
            content: m.blog.content,
            createdAt: m.blog.createdAt,
            author: {
              id: m.blog.author.id,
              username: m.blog.author.username,
            },
          },
        }))

        // Merge with existing markers, avoiding duplicates
        const existingVersions = new Set(markers.value.map((m) => m.markerVersion))
        const newMarkers = fetchedMarkers.filter(
          (m) => !existingVersions.has(m.markerVersion)
        )

        if (newMarkers.length > 0) {
          // Create new array to avoid frozen object issues
          const allMarkers = [...newMarkers, ...markers.value]
          markers.value = allMarkers.sort(
            (a, b) => b.markerVersion - a.markerVersion
          )
        }
        
        // Update unread count based on fetched markers
        // Count markers where markerVersion > lastSeenMarkerVersion
        const unreadMarkersCount = markers.value.filter(
          m => m.markerVersion > lastSeenMarkerVersion.value
        ).length
        unreadNotificationCount.value = unreadMarkersCount
      }
    } catch (error: any) {
      console.error('Failed to fetch unread markers:', error)
    } finally {
      loading.value = false
    }
  }

  // Fetch user notification state
  async function fetchNotificationState() {
    try {
      const { data } = await apolloClient.query({
        query: NOTIFICATION_STATE_QUERY,
        fetchPolicy: 'network-only',
      })

      if (data?.notificationState) {
        lastSeenMarkerVersion.value = data.notificationState.lastSeenMarkerVersion || 0
      }
    } catch (error: any) {
      console.error('Failed to fetch notification state:', error)
    }
  }

  // Fetch unread notification count
  async function fetchUnreadNotificationCount() {
    try {
      const { data } = await apolloClient.query({
        query: UNREAD_NOTIFICATION_COUNT_QUERY,
        fetchPolicy: 'network-only',
      })

      if (data?.unreadNotificationCount !== undefined) {
        unreadNotificationCount.value = data.unreadNotificationCount
      }
    } catch (error: any) {
      console.error('Failed to fetch unread notification count:', error)
    }
  }

  /**
   * Start subscription - called after login to initialize WebSocket subscription
   * This ensures the subscription uses the current JWT token
   * MUST be called AFTER successful login to ensure token is available
   */
  async function startSubscription() {
    // Check if token exists before starting subscription
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      console.warn('⚠️ Cannot start subscription: No token found. Call after login.')
      return
    }

    // Unsubscribe existing subscription if any
    if (subscription.value) {
      try {
        subscription.value.unsubscribe()
      } catch (e) {
        // Ignore errors
      }
      subscription.value = null
    }

    // Fetch initial data first
    try {
      await fetchNotificationState()
      await Promise.all([
        fetchAllMarkers(),
        fetchUnreadNotificationCount(),
      ])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      // Continue anyway - subscription can still work
    }

    // Ensure WebSocket link is ready before starting subscription
    const wsLink = ensureWsLinkReady()
    
    // Small delay to ensure WebSocket connection is established
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Start WebSocket subscription
    try {
      const subscriptionObservable = apolloClient.subscribe({
        query: NEW_NOTIFICATION_MARKER_SUBSCRIPTION,
      })
      
      subscription.value = subscriptionObservable.subscribe({
        next: (result: any) => {
          // If we were disconnected and now receiving messages, fetch missed markers
          if (!wasConnected) {
            wasConnected = true
            // Fetch all markers that were missed during disconnection
            fetchAllMarkers()
              .then(() => fetchUnreadNotificationCount())
              .catch(console.error)
          }
          
          if (result.data?.newNotificationMarker) {
            const newMarker = result.data.newNotificationMarker
            
            // Avoid duplicates
            const exists = markers.value.some(
              (m) => m.markerVersion === newMarker.markerVersion
            )
            
            if (!exists) {
              // Immediately update markers array (reactive - UI will update instantly)
              const newMarkers = [newMarker, ...markers.value].sort(
                (a, b) => b.markerVersion - a.markerVersion
              )
              markers.value = newMarkers
              
              // Immediately update unread count if marker is unread
              if (newMarker.markerVersion > lastSeenMarkerVersion.value) {
                unreadNotificationCount.value += 1
              }
            }
          }
        },
        error: (error: any) => {
          // Mark as disconnected
          wasConnected = false
          
          // Don't immediately clean up - let Apollo Client handle reconnection
          // Only clean up if it's a fatal error
          if (error?.networkError?.statusCode === 401 || error?.message?.includes('Unauthorized')) {
            console.error('Authentication error - subscription will not reconnect')
            if (subscription.value) {
              try {
                subscription.value.unsubscribe()
              } catch (e) {
                // Ignore unsubscribe errors
              }
              subscription.value = null
            }
          }

          // Apollo Client's graphql-ws will handle reconnection automatically
          // When it reconnects, the next() handler will fetch missed markers
        },
      })
      
      wasConnected = true
      
      // Verify subscription is actually set
      if (!subscription.value) {
        console.error('Subscription object is null after creation!')
        throw new Error('Failed to create subscription object')
      }
    } catch (error: any) {
      console.error('Failed to start subscription:', error)
      subscription.value = null
      wasConnected = false
      throw error // Re-throw so caller knows it failed
    }
  }

  /**
   * Legacy subscribe function - calls startSubscription
   * Kept for backward compatibility
   */
  function subscribe() {
    return startSubscription()
  }

  function unsubscribe() {
    if (subscription.value) {
      subscription.value.unsubscribe()
      subscription.value = null
    }
    wasConnected = false
  }

  async function markAsSeen(markerVersion: number) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_LAST_SEEN_MARKER_VERSION_MUTATION,
        variables: { markerVersion },
      })

      if (data?.updateLastSeenMarkerVersion) {
        lastSeenMarkerVersion.value = data.updateLastSeenMarkerVersion.lastSeenMarkerVersion
        // Update unread count from server response
        unreadNotificationCount.value = data.updateLastSeenMarkerVersion.count
      }
    } catch (error: any) {
      console.error('Failed to update last seen marker version:', error)
      throw error
    }
  }

  async function markAllAsSeen() {
    if (markers.value.length === 0) return
    
    // Get the highest marker version
    const highestVersion = Math.max(...markers.value.map(m => m.markerVersion))
    await markAsSeen(highestVersion)
  }

  function clear() {
    markers.value = []
    lastSeenMarkerVersion.value = 0
    unreadNotificationCount.value = 0
  }

  // Debug function to check subscription status
  function debugSubscription() {
    return {
      hasSubscription: !!subscription.value,
      subscriptionClosed: subscription.value?.closed,
      markersCount: markers.value.length,
      unreadCount: unreadNotificationCount.value,
    }
  }

  return {
    markers,
    loading,
    unreadCount,
    unreadNotificationCount,
    hasNewNotifications,
    lastSeenMarkerVersion,
    subscription,
    fetchUnreadMarkers,
    fetchAllMarkers,
    fetchNotificationState,
    fetchUnreadNotificationCount,
    startSubscription,
    subscribe,
    unsubscribe,
    markAsSeen,
    markAllAsSeen,
    clear,
    debugSubscription, // Export debug function
  }
})


