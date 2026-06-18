import NextAuth, { Session, User } from "next-auth"
import { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      organizationId?: string
    }
  }
}

export const authOptions: import("next-auth").AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Demo Account',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        // Mock password check for demo purposes
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatarUrl,
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        
        // Fetch membership logic to inject role into session
        const membership = await prisma.membership.findFirst({
          where: { userId: token.sub }
        })
        
        if (membership) {
          session.user.role = membership.role
          session.user.organizationId = membership.organizationId
        } else {
          session.user.role = "viewer"
        }
      }
      return session
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.sub = user.id
      }
      return token
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
