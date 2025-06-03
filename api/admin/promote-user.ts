import { NextApiRequest, NextApiResponse } from 'next'
import { clerkClient } from '@clerk/nextjs/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Get the Clerk client instance and promote user to admin
    const client = await clerkClient()
    await client.users.updateUser(userId, {
      publicMetadata: { role: 'admin' }
    })

    res.status(200).json({ message: 'User promoted to admin successfully' })
  } catch (error) {
    console.error('Error promoting user:', error)
    res.status(500).json({ error: 'Failed to promote user' })
  }
} 