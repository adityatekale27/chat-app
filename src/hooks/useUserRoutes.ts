"use client"

import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { MessageSquare, LogOut, Users, UserSearch } from "lucide-react";

const useUserRoutes = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const params = useParams();

  const conversationId = useMemo(() => {
    if (!params?.conversationId) return "";
    return params.conversationId as string;
  }, [params?.conversationId]);

  const isFindFriendActive = searchParams?.get("view") === "findFriends";

  const routes = useMemo(() => {
    const basepath = pathname.split("?")[0];
    
    return [
      {
        title: "Chats",
        url: "/chat",
        icon: MessageSquare,
        isActive: basepath === "/chat" && !conversationId && !isFindFriendActive,
      },
      {
        title: "Contacts",
        url: "/contact",
        icon: Users,
        isActive: basepath === "/contact" && !isFindFriendActive,
      },
      {
        title: "Find Friends",
        url: `${basepath}?view=findFriends`,
        icon: UserSearch,
        isActive: isFindFriendActive,
      },
      {
        title: "Logout",
        url: "#",
        icon: LogOut,
      },
    ];
  }, [pathname, conversationId, isFindFriendActive]);

  return routes;
};

export default useUserRoutes;
