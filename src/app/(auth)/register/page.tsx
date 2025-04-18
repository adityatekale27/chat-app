"use client";

import { RegisterForm } from "@/components/auth/RegisterForm";
import LoadingScreen from "@/components/loading-states/LoadingScreen";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
  const { status } = useSession();
  const router = useRouter();

  /* Check user has session, redirect to '/chat' if authenticated */
  useEffect(() => {
    if (status === "authenticated") router.push("/chat");
  }, [router, status]);

  // Loadign screen
  if (status === "loading" || status === "authenticated") return <LoadingScreen />;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="max-w-sm md:max-w-3xl">
        <RegisterForm />
      </div>
    </div>
  );
}
