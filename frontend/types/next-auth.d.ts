import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      sessionId?: string
      provider?: 'google' | 'apple' | 'microsoft'
    } & DefaultSession["user"]
    accessToken?: string
    refreshToken?: string
    error?: string
    isMockUser?: boolean
  }

  interface User {
    id: string
    email?: string | null
    name?: string | null
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
  }
}