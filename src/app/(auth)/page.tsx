"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import LoadingScreen from "@/components/loading-states/LoadingScreen";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  /* Check the session, if exists redirect to '/chat' */
  useEffect(() => {
    if (status === "authenticated") router.push("/chat");
  }, [router, status]);

  // Loading screen
  if (status === "loading" || status === "authenticated") return <LoadingScreen />;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </main>
  );
}
