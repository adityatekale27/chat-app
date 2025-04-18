import { signIn, signOut, useSession } from "next-auth/react";

export const useAuth = () => {
  const { data: session } = useSession();

  return {
    login: async (provider: "credentials" | "google" | "github", data?: { email: string; password: string }) => {
      return signIn(provider, { ...data, redirect: false });
    },

    logout: async () => {
      await signOut({ callbackUrl: "/" });
    },

    user: session?.user,
  };
};
