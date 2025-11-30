import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apolloClient } from '@/apollo/client'
import gql from 'graphql-tag'

const BLOGS_QUERY = gql`
  query Blogs {
    blogs {
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
`

const CREATE_BLOG_MUTATION = gql`
  mutation CreateBlog($input: CreateBlogInput!) {
    createBlog(input: $input) {
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
`

export interface Blog {
  id: string
  title: string
  content: string
  createdAt: string
  author: {
    id: string
    username: string
  }
}

export const useBlogStore = defineStore('blog', () => {
  const blogs = ref<Blog[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBlogs() {
    loading.value = true
    error.value = null
    try {
      const { data } = await apolloClient.query({ 
        query: BLOGS_QUERY, 
        fetchPolicy: 'network-only' 
      })
      // Create a new array to avoid frozen object issues
      blogs.value = data.blogs ? [...data.blogs] : []
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load blogs'
    } finally {
      loading.value = false
    }
  }

  async function createBlog(input: { title: string; content: string }) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_BLOG_MUTATION,
        variables: { input },
      })
      
      // Refetch blogs to get updated list (this ensures we have the latest data)
      // Don't manually add to array as Apollo cache might return frozen objects
      await fetchBlogs()
      
      return data?.createBlog
    } catch (e: any) {
      error.value = e.message ?? 'Failed to create blog'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    blogs,
    loading,
    error,
    fetchBlogs,
    createBlog,
  }
})


