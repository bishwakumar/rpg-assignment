import { ApolloClient, InMemoryCache, split, from } from '@apollo/client/core'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { createHttpLink } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { getMainDefinition } from '@apollo/client/utilities'

// Store reference to auth store for reactive token access
let getAuthToken: (() => string | null) | null = null

// Function to set auth token getter (called from auth store)
export const setAuthTokenGetter = (getter: () => string | null) => {
  getAuthToken = getter
}

// Get GraphQL endpoint from environment or use default
const getGraphQLEndpoint = () => {
  if (typeof window !== 'undefined' && import.meta.env.VITE_GRAPHQL_URL) {
    return import.meta.env.VITE_GRAPHQL_URL
  }
  return 'http://localhost:3200/graphql'
}

// Get WebSocket endpoint from environment or derive from HTTP endpoint
const getWebSocketEndpoint = () => {
  if (typeof window !== 'undefined' && import.meta.env.VITE_GRAPHQL_WS_URL) {
    return import.meta.env.VITE_GRAPHQL_WS_URL
  }
  const httpUrl = getGraphQLEndpoint()
  // Convert http:// to ws:// and https:// to wss://
  return httpUrl.replace(/^http/, 'ws')
}

// HTTP link with authentication
const httpLink = createHttpLink({
  uri: getGraphQLEndpoint(),
})

// Auth link to add JWT token to HTTP requests
const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return {
    headers: {
      ...headers,
      ...(token && { authorization: `Bearer ${token}` }),
    },
  }
})

// Create WebSocket client that reads token dynamically from authStore
// connectionParams is a function that's called on each connection/reconnection
// This ensures we always use the current JWT token, even after login
let wsClientInstance: ReturnType<typeof createClient> | null = null

const createWsClient = () => {
  if (typeof window === 'undefined') return null
  
  // Close existing client if any
  if (wsClientInstance) {
    try {
      wsClientInstance.dispose()
    } catch (e) {
      // Ignore errors
    }
  }
  
  const wsUrl = getWebSocketEndpoint()
  
  wsClientInstance = createClient({
    url: wsUrl,
    connectionParams: () => {
      // Read token dynamically on each connection attempt
      // Try auth store first (reactive), fallback to localStorage
      let token: string | null = null
      if (getAuthToken) {
        token = getAuthToken()
      }
      if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('token')
      }
      
      if (token) {
        return {
          authorization: `Bearer ${token}`,
        }
      } else {
        console.warn('No token found - connection may fail')
        return {}
      }
    },
    shouldRetry: () => true,
    retryAttempts: Infinity,
    on: {
      error: (err: any) => {
        console.error('WebSocket error:', err)
      },
    },
  })
  
  return wsClientInstance
}

// Create WebSocket link lazily - will be created when first subscription starts
let wsLinkInstance: GraphQLWsLink | null = null

const getWsLink = () => {
  if (typeof window === 'undefined') return null
  
  // Create link if it doesn't exist or if client was recreated
  if (!wsLinkInstance || !wsClientInstance) {
    wsLinkInstance = new GraphQLWsLink(createWsClient()!)
  }
  
  return wsLinkInstance
}

// Export function to recreate WebSocket client (e.g., after login)
// This forces a reconnection with the new token
export const recreateWsClient = () => {
  if (typeof window === 'undefined') return
  
  // Close existing client
  if (wsClientInstance) {
    try {
      wsClientInstance.dispose()
    } catch (e) {
      console.warn('Error disposing old client:', e)
    }
    wsClientInstance = null
  }
  
  // Reset link instance so it will be recreated
  wsLinkInstance = null
  
  // Create new client with updated token
  return createWsClient()
}

// Export function to ensure WebSocket link is ready
export const ensureWsLinkReady = () => {
  if (typeof window === 'undefined') return null
  
  // Force recreation of WebSocket client to ensure we have the latest token
  if (wsClientInstance) {
    try {
      wsClientInstance.dispose()
    } catch (e) {
      // Ignore errors
    }
    wsClientInstance = null
  }
  
  // Reset link instance so it will be recreated with fresh client
  wsLinkInstance = null
  
  const link = getWsLink()
  if (!link) {
    console.warn('WebSocket link could not be created')
  }
  return link
}

// Combine auth link with http link
const httpLinkWithAuth = from([authLink, httpLink])

// Create WebSocket link initially (will be created on first use)
// The connectionParams function ensures we always use the current token
const wsLink = typeof window !== 'undefined' ? getWsLink() : null

// Split link: subscriptions use WebSocket, queries/mutations use HTTP
const link =
  typeof window !== 'undefined' && wsLink
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query)
          return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
          )
        },
        wsLink,
        httpLinkWithAuth,
      )
    : httpLinkWithAuth

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache({
    resultCaching: false,
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
})


