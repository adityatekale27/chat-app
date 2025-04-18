"use client";

import EmptyState from "@/components/loading-states/EmptyState";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

const Chats = () => {
  const { conversationId } = useParams();
  const { status } = useSession();
  const router = useRouter();

  /* Check if user have the session, if not redirect to login page */
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [router, status]);

  return (
    <div className={`h-full ${conversationId ? "hidden" : "block"}`}>
      <EmptyState />
    </div>
  );
};

export default Chats;
