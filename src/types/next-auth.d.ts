// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      bio?: string;
      isOnline: boolean;
      lastOnline: Date | null;
      username?: string | null;
      hasPassword: boolean;
      createdAt: Date;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    image?: string;
    bio?: string;
    isOnline: boolean;
    lastOnline: Date | null;
    username?: string | null;
    hashedPassword?: string | null;
    hasPassword?: boolean;
    createdAt: Date;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    image?: string;
    bio?: string;
    isOnline: boolean;
    lastOnline: Date | null;
    username?: string | null;
    hasPassword: boolean;
    createdAt: Date;
  }
}
