import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Github from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import prisma from "@/libs/prismadb";
import { checkRateLimit, resetRateLimit } from "./checkRateLimit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Github({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        /* Rate limiter for login (attempts 3, time 10sec) */
        const loginAllowed = checkRateLimit({
          key: credentials.email,
          type: "login",
          limit: 3,
          windowMs: 10 * 1000,
        });

        if (!loginAllowed) {
          throw new Error("Too many login attempts");
        }

        /* Check if the user exists in db */
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user?.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        /* Check if the password is correct or not */
        const isValidPassword = await bcrypt.compare(credentials.password, user.hashedPassword);

        if (!isValidPassword) {
          throw new Error("Invalid credentials");
        }

        /* Reset the rate limiter (after login) */
        resetRateLimit({
          key: credentials.email,
          type: "login",
        });

        return {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          image: user.image || undefined,
          bio: user.bio ?? undefined,
          username: user.username || null,
          isOnline: user.isOnline || false,
          lastOnline: user.lastOnline || null,
          hasPassword: true,
          createdAt: user.createdAt,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!user || !account) return false;

      // Check if the user exists in db and also include oauth accounts (if available)
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email ?? undefined },
        include: { accounts: true },
      });

      // If yes, then check for the current oauth provider is already linked to user and if not then create new one
      if (existingUser) {
        const existingAccounts = existingUser.accounts.find((acc) => acc.provider === account.provider);

        if (!existingAccounts) {
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              type: account.type,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
          });
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign-in
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            username: true,
            bio: true,
            isOnline: true,
            lastOnline: true,
            hashedPassword: true,
            createdAt: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name || "";
          token.email = dbUser.email;
          token.bio = dbUser.bio || "";
          token.username = dbUser.username || null;
          token.image = dbUser.image || "";
          token.isOnline = dbUser.isOnline;
          token.lastOnline = dbUser.lastOnline;
          token.hasPassword = !!dbUser.hashedPassword;
          token.createdAt = dbUser.createdAt;
        }
      }

      // Session update
      if (trigger === "update" && session) {
        token = { ...token, ...session.user };
      }

      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.id,
          name: token.name,
          email: token.email,
          bio: token.bio,
          username: token.username,
          image: typeof token.image === "string" ? token.image : null,
          isOnline: token.isOnline,
          lastOnline: token.lastOnline,
          hasPassword: !!token.hasPassword,
          createdAt: token.createdAt,
        },
      };
    },
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  pages: {
    signIn: "/",
  },
};
