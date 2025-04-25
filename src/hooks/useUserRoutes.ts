"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { MessageSquare, Users, UserSearch, Phone } from "lucide-react";

const useUserRoutes = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const params = useParams();

  // Get the current conversationId from route parameters (if available)
  const conversationId = useMemo(() => {
    if (!params?.conversationId) return "";
    return params.conversationId as string;
  }, [params?.conversationId]);

  // Check if "Find Friends" view is active via query parameter
  const isFindFriendActive = searchParams?.get("view") === "findFriends";

  // Define the navigation routes with labels, URLs, icons, and active states
  const routes = useMemo(() => {
    // Remove query string from pathname to get base path
    const basepath = pathname.split("?")[0];

    return [
      {
        title: "Chats",
        url: "/chat",
        icon: MessageSquare,
        // Active when on /chat and not in a specific conversation or find-friends view
        isActive: basepath === "/chat" || basepath === `/chat/${conversationId}` && !isFindFriendActive,
      },
      {
        title: "Contacts",
        url: "/contact",
        icon: Users,
        // Active when on /contact and not in find-friends view
        isActive: basepath === "/contact" && !isFindFriendActive,
      },
      {
        title: "Find Friends",
        url: `${basepath}?view=findFriends`,
        icon: UserSearch,
        // Active when view=findFriends is in query string
        isActive: isFindFriendActive,
      },
      {
        title: "Calls",
        url: `/calls`,
        icon: Phone,
        // Active when in a conversation on /chat but not in find-friends view
        isActive: basepath === "/calls" && !isFindFriendActive,
      }
    ];
  }, [pathname, conversationId, isFindFriendActive]);

  return routes;
};

export default useUserRoutes;
