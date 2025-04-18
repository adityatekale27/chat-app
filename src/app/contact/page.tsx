"use client";

import EmptyState from "@/components/loading-states/EmptyState";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Contacts = () => {
  const { status } = useSession();
  const router = useRouter();

  /* Check if user has session, if not redirect to login page */
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [router, status]);

  return (
    <div className="h-full hidden md:block">
      <EmptyState />
    </div>
  );
};

export default Contacts;
