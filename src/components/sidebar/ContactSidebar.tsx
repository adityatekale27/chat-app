"use client";

import toast from "react-hot-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserBoxSkeleton } from "../loading-states/LoadingSkeleton";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { EllipsisVertical, Send, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";

interface ContactSidebarProps {
  searchTerm?: string;
  currentUser: {
    id: string;
    name?: string | null;
    image?: string | null;
    isOnline?: boolean;
  } | null;
}

export default function ContactSidebar({ currentUser, searchTerm }: ContactSidebarProps) {
  const router = useRouter();
  const [unfriendUserId, setUnfriendUserId] = useState<string | null>(null);
  const [unfriendLoading, setUnfriendLoading] = useState(false);
  const { friends, isLoading, error, containerRef, cancelFriendRequest } = useFriendRequests(currentUser?.id ?? "", searchTerm);

  // Show error if available
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  /* Handler to start a conversation from contact list */
  const handleFriendClick = useCallback(
    async (userId: string) => {
      try {
        const { data } = await axios.post("/api/chat", { userId });
        router.push(`/chat/${data.id}`);
      } catch (error: unknown) {
        console.error("Error starting chat:", error);
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "Failed to start conversation!");
        } else {
          toast.error("Failed to start conversation!");
        }
      }
    },
    [router]
  );

  /* Handler to unfriend a user */
  const handleUnfriend = useCallback(
    async (otherUserId: string) => {
      try {
        setUnfriendLoading(true);
        await cancelFriendRequest(otherUserId);
      } catch (error: unknown) {
        console.error("handleFriend error:", error);
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "Failed to unfriend user");
        } else {
          toast.error("Failed to unfriend user");
        }
      } finally {
        setUnfriendLoading(false);
      }
    },
    [cancelFriendRequest]
  );

  return (
    <div ref={containerRef}>
      {isLoading ? (
        <div className="space-y-4 p-4">
          <UserBoxSkeleton freq={8} />
        </div>
      ) : friends.length === 0 ? (
        <p className="text-center dark:text-slate-50/80 text-black/60 py-4">No friends to show</p>
      ) : (
        <ul>
          {friends.map((friend) => {
            const user = friend.sender.id === currentUser?.id ? friend.receiver : friend.sender;

            return (
              <li key={user.id} className="flex relative">
                <div
                  onClick={() => handleFriendClick(user.id)}
                  className="min-w-full relative flex items-center gap-3 p-3 rounded-lg transition cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 max-w-76 truncate">
                  {/* User image */}
                  <div className="inline-block rounded-full overflow-hidden h-10 w-10">
                    <Image
                      src={user.image || "/images/avatar.jpg"}
                      alt={user.name || "User"}
                      height={40}
                      width={40}
                      className="object-cover rounded-full"
                      priority={friends.indexOf(friend) < 5}
                    />
                  </div>

                  {/* Name and bio */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between items-start">
                    <p className="font-medium truncate max-w-[99%]">{user.name ?? "User"}</p>
                    {user.bio && <p className="text-sm text-gray-500 truncate max-w-[95%]">{user.bio}</p>}
                  </div>
                </div>

                {/* Contact options (send message and unfriend) */}
                <div className="absolute right-0 top-5">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-400 dark:hover:bg-gray-500/50">
                      <EllipsisVertical size={16} className="text-slate-600 hover:text-white dark:text-gray-300 cursor-pointer" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleFriendClick(user.id);
                        }}
                        className="cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Send size={14} />
                          <span>Send Message</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setUnfriendUserId(user.id);
                        }}
                        className="text-red-600 focus:text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/30 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Trash2 size={14} />
                          <span>Unfriend</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Unfriend confirmation dialog */}
                <ConfirmationDialog
                  open={unfriendUserId === user.id}
                  loading={unfriendLoading}
                  title={`Unfriend ${user.name}?`}
                  description="This will remove them from your friends list but keep your conversation history."
                  onConfirm={() => handleUnfriend(user.id)}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) setUnfriendUserId(null);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
