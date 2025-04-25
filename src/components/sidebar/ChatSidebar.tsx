"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import useChat from "@/hooks/useChat";
import { UserBoxSkeleton } from "../loading-states/LoadingSkeleton";
import Image from "next/image";
import toast from "react-hot-toast";
import { format } from "date-fns";
import clsx from "clsx";
import { usePresenceContext } from "@/contexts/PresenceContext";
import { getPusherClient } from "@/libs/pusher/pusherClient";

interface ChatSidebarProps {
  searchTerm: string;
  currentUser: User;
}

export default function ChatSidebar({ currentUser, searchTerm }: ChatSidebarProps) {
  const router = useRouter();
  const { onlineUsers } = usePresenceContext();
  const { conversations, fetchConversations, loading, error } = useChat(currentUser.id);
  const [unseenMessage, setUnseenMessage] = useState<Record<string, number>>({});

  // Fetch conversations based on serachTerm
  useEffect(() => {
    fetchConversations(searchTerm);
  }, [fetchConversations, searchTerm]);

  // Display error message if there is an error
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Render the last message
  const renderLastMessage = useMemo(
    () => (chat: Conversation) => {
      if (!chat.messages[0])
        return {
          lastMessage: `${
            chat.isGroup && chat.groupCreatorId !== currentUser.id
              ? `You been added by ${chat.groupCreator?.name}`
              : chat.isGroup && chat.groupCreatorId === currentUser.id
              ? "You created this group"
              : "No messages yet"
          }`,
          lastMessageTime: null,
        };

      const lastMessage = chat.messages[0].imageUrl ? "sent an image" : chat.messages[0].text || "No message yet";
      const lastMessageTime = chat.lastMessageAt ? format(new Date(chat.lastMessageAt), "p") : null;

      return { lastMessage, lastMessageTime };
    },
    [currentUser.id]
  );

  // Get chat details (name, image, isOnline)
  const getChatDetails = useMemo(
    () => (chat: Conversation) => {
      const isGroup = chat.isGroup;
      const otherUser = isGroup ? null : chat.users.find((user: { id: string }) => user.id !== currentUser?.id);

      return {
        name: isGroup ? chat.name || "Group" : otherUser?.name || "User",
        image: isGroup ? chat.groupAvatar || "/images/avatar.jpg" : otherUser?.image || "/images/avatar.jpg",
        isOnline: !isGroup && onlineUsers[otherUser?.id ?? ""],
      };
    },
    [currentUser?.id, onlineUsers]
  );

  // Set pusher for lastMessage
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(currentUser.id);

    channel.bind("conversation:lastMessage", (updated: { id: string; message: Message[] }) => {
      const latestMessage = updated.message?.[0];
      if (latestMessage && latestMessage.sender?.id !== currentUser.id) {
        setUnseenMessage((prev) => ({
          ...prev,
          [updated.id]: (prev[updated.id] || 0) + 1,
        }));
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(currentUser.id);
    };
  }, [currentUser.id]);

  // Handle conversation click
  const handleConversationClick = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);

      setUnseenMessage((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    },
    [router]
  );

  return (
    <div>
      {loading ? (
        <div className="space-y-4 p-4">
          <UserBoxSkeleton freq={8} />
        </div>
      ) : conversations.length === 0 ? (
        <p className="text-center dark:text-slate-50/80 text-black/60 py-4">No conversations to show</p>
      ) : (
        <ul>
          {conversations.map((chat) => {
            const { name, image, isOnline } = getChatDetails(chat);
            const { lastMessage, lastMessageTime } = renderLastMessage(chat);

            return (
              <li
                key={chat.id}
                onClick={() => handleConversationClick(chat.id)}
                className="min-w-full relative flex items-center gap-3 p-3 rounded-lg transition cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 max-w-76 truncate">
                <div className="relative">
                  {/* User or group image */}
                  <div className="relative inline-block rounded-full overflow-hidden h-10 w-10">
                    <Image src={image || "/images/avatar.jpg"} alt={name || "User"} fill loading="lazy" className="object-cover rounded-full" />
                  </div>
                  {/* User online indicator */}
                  {!chat.isGroup && (
                    <span className={clsx("absolute top-0 right-0 h-3 w-3 rounded-full ring-2 ring-white dark:ring-[#212121]", isOnline ? "bg-green-500" : "bg-gray-400")} />
                  )}
                </div>

                {/* Name, last message and time */}
                <div className="flex-1 min-w-0 flex justify-between items-center max-w-full">
                  <div>
                    <p className="font-medium truncate max-w-[160px]">{name}</p>
                    <p className="text-sm text-gray-500 truncate max-w-70">{lastMessage}</p>
                  </div>
                  <div>
                    {lastMessageTime && <span className="text-xs text-gray-500">{lastMessageTime}</span>}
                    {unseenMessage[chat.id] > 0 && (
                      <span className="p-0.5 px-2 ml-2 text-xs font-semibold leading-none text-white bg-green-600/70 rounded-full">{unseenMessage[chat.id]}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
