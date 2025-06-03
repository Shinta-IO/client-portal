'use client'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export interface Profile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  organization?: string
  avatarUrl?: string
  isAdmin: boolean
  createdAt: string
}

export function useUserProfile() {
  const { user, isLoaded } = useUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false)
      return
    }

    async function loadProfile() {
      try {
        const response = await fetch('/api/user/profile')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`)
        }

        const profileData = await response.json()
        setProfile(profileData)
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, isLoaded])

  // Get admin status from both Clerk metadata and profile
  const isAdmin = user?.publicMetadata?.role === 'admin' || profile?.isAdmin === true

  return {
    user,
    profile,
    isAdmin,
    loading: loading || !isLoaded
  }
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useUserProfile()

  if (loading) return null
  if (!isAdmin) return null

  return <>{children}</>
}

export function UserOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useUserProfile()

  if (loading) return null
  if (isAdmin) return null

  return <>{children}</>
}

export function ConditionalRender({ 
  showForAdmin, 
  showForUser, 
  children 
}: { 
  showForAdmin?: React.ReactNode
  showForUser?: React.ReactNode
  children?: React.ReactNode 
}) {
  const { isAdmin, loading } = useUserProfile()

  if (loading) return null

  if (isAdmin && showForAdmin) return <>{showForAdmin}</>
  if (!isAdmin && showForUser) return <>{showForUser}</>
  
  return <>{children}</>
} 