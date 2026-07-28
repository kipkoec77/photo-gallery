import bcrypt from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { connectToDatabase } from "./mongodb";
import Admin from "../models/Admin";

type SessionUser = {
  id: string;
  email: string;
};

export const authConfig = {
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  providers: [
    Credentials({
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const rawPassword = credentials?.password;

        const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
        const password = typeof rawPassword === "string" ? rawPassword : null;

        if (!email || !password) {
          return null;
        }

        await connectToDatabase();
  const admin = await Admin.findOne({ email });

        if (!admin) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: String(admin._id),
          email: admin.email,
        } satisfies SessionUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
      }

      return token;
    },
    async session({ session, token }) {
      const user = session.user as { id?: string; email?: string | null };

      user.id = token.sub ?? "";
      user.email = typeof token.email === "string" ? token.email : user.email ?? null;

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);