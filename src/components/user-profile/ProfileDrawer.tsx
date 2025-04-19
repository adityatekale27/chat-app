"use client";

import { ConversationWithMessages } from "@/types/chat";
import { DialogBox } from "../dialogs/DialogBox";
import Image from "next/image";
import { CalendarDays, Mail, Users, Captions, Trash, UserX, Clock, CircleOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import toast from "react-hot-toast";
import axios from "axios";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import { usePathname, useRouter } from "next/navigation";
import { EditProfile } from "./EditProfile";
import { Card } from "@/components/ui/card";
import clsx from "clsx";

interface ProfileDrawerProps {
  trigger: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  data: ConversationWithMessages;
}

const ProfileDrawerComponent = ({ isOpen, onClose, trigger, data }: ProfileDrawerProps) => {
  const { data: session } = useSession();
  const currentUser = session?.user;
  const pathname = usePathname();
  const router = useRouter();
  const { cancelFriendRequest, isLoading, error, friends, fetchOtherUserFriends, otherUserFriends } = useFriendRequests(currentUser?.id ?? "");

  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveGroupConfirm, setShowLeaveGroupConfirm] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);

  // Show toast error if friend reqeust error occurs
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  /* Check if the current user (logged in user) is group admin */
  const isGroupAdmin = useMemo(() => {
    return data.groupAdmins?.some((admin) => admin.id === currentUser?.id) ?? false;
  }, [currentUser?.id, data.groupAdmins]);

  /* Get the other user in 1:1 conversation */
  const otherUser = useMemo(() => {
    return !data.isGroup ? data.users.find((user) => user.id !== currentUser?.id) : null;
  }, [currentUser?.id, data.isGroup, data.users]);

  // Fetch other users friends
  useEffect(() => {
    if (otherUser) fetchOtherUserFriends(otherUser?.id, otherUser?.name ?? "");
  }, [fetchOtherUserFriends, otherUser]);

  // Get all the mutual friends from other user's friends list
  const isMutualFriend = useCallback(
    (id: string) => {
      if (!friends || !otherUserFriends) return false;

      const isFriend = friends.some((friend) => {
        return (friend.sender.id === currentUser?.id && friend.receiver.id === id) || (friend.receiver.id === currentUser?.id && friend.sender.id === id);
      });
      return isFriend;
    },
    [currentUser?.id, friends, otherUserFriends]
  );

  // Handler to start a conversation from mutual friends
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
          toast.error("An unexpected error occurred!");
        }
      }
    },
    [router]
  );

  /* Check if other user is still a friend */
  const isFriendStill = useMemo(() => {
    return friends.some(
      (friend) => (friend.sender.id === currentUser?.id && friend.receiver.id === otherUser?.id) || (friend.receiver.id === currentUser?.id && friend.sender.id === otherUser?.id)
    );
  }, [currentUser?.id, friends, otherUser?.id]);

  /* Show limited or all group members */
  const displayedMembers = useMemo(() => {
    return data.users.slice(0, showAllMembers ? data.users.length : 4);
  }, [data.users, showAllMembers]);

  /*
    Delete one to one conversation or group if current user is admin
  */
  const handleDeleteConversation = useCallback(async () => {
    try {
      setDeleteLoading(true);
      const actionParams = data.isGroup && isGroupAdmin ? "?action=delete" : "";
      await axios.delete(`/api/chat/${data.id}${actionParams}`);

      toast.success(data.isGroup && isGroupAdmin ? "Group deleted successfully!" : "Conversation deleted successfully!");
      if (pathname === `/chat/${data.id}`) router.push("/");
    } catch (error: unknown) {
      console.error("handleDeleteConversation error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error?.response?.data?.message || "Failed to delete conversation");
      } else {
        toast.error("An unexpected error occurred!");
      }
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setShowDeleteGroupConfirm(false);
    }
  }, [data.id, data.isGroup, isGroupAdmin, pathname, router]);

  /* 
    Leave the group as admin or participant
  */
  const handleLeaveGroup = useCallback(async () => {
    try {
      setDeleteLoading(true);
      await axios.delete(`/api/chat/${data.id}?action=leave`);

      onClose();
      toast.success("Left group successfully!");
      if (pathname === `/chat/${data.id}`) router.push("/");
    } catch (error: unknown) {
      console.error("handleLeaveGroup error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to leave group!");
      } else {
        toast.error("An unexpected error occurred!");
      }
    } finally {
      setDeleteLoading(false);
      setShowLeaveGroupConfirm(false);
    }
  }, [data.id, onClose, pathname, router]);

  /*
    Unfriend a user from one to one conversation
  */
  const handleUnfriend = useCallback(async () => {
    try {
      const hasMessages = data.messagesIds.length > 0;
      await cancelFriendRequest(otherUser?.id ?? "");

      // if no messages, remove conversation
      if (!hasMessages) {
        await axios.delete(`/api/chat/${data.id}`);
        onClose();
        router.push("/");
      }
    } catch (error: unknown) {
      console.error("handleFriend error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error?.response?.data?.message || "Failed to unfriend user");
      } else {
        toast.error("An unexpected error occurred!");
      }
    } finally {
      setShowUnfriendConfirm(false);
    }
  }, [cancelFriendRequest, data.id, data.messagesIds.length, onClose, otherUser?.id, router]);

  return (
    <>
      <DialogBox isOpen={isOpen} onClose={onClose} trigger={trigger} dialogTitle="" dialogDescription="">
        {showGroupEdit ? (
          <Card>
            {/* Edit group profile component, show only when show group edit is true */}
            <EditProfile mode="group" open={showGroupEdit} group={data} onChange={() => setShowGroupEdit(false)} />
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Name, profile photo, group created by (group creator name) */}
            <div className="flex flex-col items-center justify-evenly">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="relative h-16 w-16 rounded-full">
                  <Image
                    src={data.isGroup ? data.groupAvatar || "/images/avatar.jpg" : otherUser?.image || "/images/avatar.jpg"}
                    alt={data.isGroup ? data.name || "Group" : otherUser?.name || "Profile"}
                    fill
                    className="rounded-full object-cover"
                    priority
                  />
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-lg font-bold text-foreground">{data.isGroup ? data.name : otherUser?.name || "User"}</h2>
                  <p className="text-xs text-muted-foreground">
                    {data.isGroup && data.groupCreator ? `Created by: ${data.groupCreator.name}` : otherUser?.username ? `${otherUser?.username}` : ""}
                  </p>
                </div>
              </div>

              {/* add members and edit group button */}
              {data.isGroup && isGroupAdmin && (
                <div className="text-xs bg-gray-600/50 px-2 py-1 rounded-lg hover:bg-gray-600 hover:cursor-pointer mt-2" onClick={() => setShowGroupEdit(true)}>
                  Edit group
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Group or other user bio */}
              {(data.isGroup ? data.groupBio : otherUser?.bio) ? (
                <div className="flex items-start gap-3 p-4 bg-[#F5F5F6] dark:bg-muted/50 rounded-lg">
                  <Captions className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{data.isGroup ? "Group Description" : "Bio"}</p>
                    <p className="whitespace-pre-line text-foreground">{data.isGroup ? data.groupBio : otherUser?.bio}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#F5F5F6] dark:bg-muted/50 rounded-lg text-center text-muted-foreground">No {data.isGroup ? "group description" : "bio"} available</div>
              )}

              {/* Group members list or other user email */}
              <div className="p-4 bg-[#F5F5F6] dark:bg-muted/50 rounded-lg space-y-2">
                {data.isGroup ? (
                  <>
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">Members</h3>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                      {displayedMembers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-gray-300/30 dark:bg-[#212121]">
                          <div className="flex items-center gap-2">
                            <div className="relative h-8 w-8">
                              <Image src={user.image || "/images/avatar.jpg"} alt={user.name || "Member"} fill className="rounded-full object-cover" />
                            </div>
                            <div className="font-medium text-sm">
                              <p className="flex items-center gap-1 max-w-50 truncate overflow-hidden">
                                <span className="max-w-25 truncate overflow-hidden">{user.name}</span>{" "}
                                {user.username && <span className="text-muted-foreground text-xs max-w-25 truncate overflow-hidden">~ {user.username}</span>}
                              </p>

                              <p className="text-muted-foreground text-xs max-w-50 truncate overflow-x-hidden">{user.email ?? ""}</p>
                            </div>
                          </div>

                          {data.groupAdmins?.some((admin) => admin.id === user.id) && (
                            <div className="text-xs text-white bg-gray-500/60 rounded-full px-2 py-[2px] flex items-center justify-center h-fit">Admin</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {data.users.length > 4 && (
                      <Button variant="ghost" className="w-full cursor-pointer hover:border" onClick={() => setShowAllMembers(!showAllMembers)}>
                        {showAllMembers ? "Show fewer members" : `Show all ${data.users.length} members`}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {/* other user email id */}
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-foreground">{otherUser?.email ?? "Not available"}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Other user's frineds list */}
              {!data.isGroup && (
                <div className="p-4 bg-[#F5F5F6] dark:bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-4">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground truncate max-w-[90%]">{`${otherUser?.name}'s Friends`}</h3>
                    </div>
                    {otherUserFriends?.length && otherUserFriends?.length > 0 && (
                      <p className="text-sm font-medium text-muted-foreground">{`${otherUserFriends?.length} friend`}</p>
                    )}
                  </div>
                  {otherUserFriends && otherUserFriends.length > 0 ? (
                    <div className="flex flex-col gap-1 w-full">
                      {otherUserFriends &&
                        otherUserFriends.map((user) => (
                          <div
                            key={user.id}
                            className={clsx(
                              "flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-gray-300/30 dark:bg-[#212121]",
                              isMutualFriend(user.id) && "hover:cursor-pointer"
                            )}
                            onClick={isMutualFriend(user.id) ? () => handleFriendClick(user.id) : undefined}>
                            <div className="flex items-center gap-2">
                              <div className="relative h-8 w-8">
                                <Image src={user.image || "/images/avatar.jpg"} alt={user.name || "Member"} fill className="rounded-full object-cover" />
                              </div>
                              <div className="font-medium text-sm">
                                <p className="flex items-center gap-1 max-w-50 truncate overflow-hidden">
                                  <span className="max-w-25 truncate overflow-hidden">{user.name}</span>{" "}
                                  {user.username && <span className="text-muted-foreground text-xs max-w-25 truncate overflow-hidden">~ {user.username}</span>}
                                </p>

                                <p className="text-muted-foreground text-xs max-w-50 truncate overflow-x-hidden">{user.email ?? ""}</p>
                              </div>
                            </div>

                            <div
                              className={clsx(
                                "text-xs text-white rounded-full px-2 py-[2px] flex items-center justify-center h-fit",
                                user.id === currentUser?.id ? "bg-gray-500/60" : isMutualFriend(user.id) ? "dark:bg-green-500/60 bg-green-500/90" : ""
                              )}>
                              {(user.id === currentUser?.id && "You") || (isMutualFriend(user.id) && "Mutual")}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-2 bg-[#F5F5F6] dark:bg-muted/90 rounded-lg text-center text-muted-foreground">{`No friends available`}</div>
                  )}

                  {otherUserFriends && otherUserFriends.length > 4 && (
                    <Button variant="ghost" className="w-full cursor-pointer hover:border" onClick={() => setShowAllMembers(!showAllMembers)}>
                      {showAllMembers ? "Show fewer members" : `Show all ${otherUserFriends?.length} friends`}
                    </Button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-[#F5F5F6] dark:bg-muted/50 rounded-lg">
                {/* group created or other user joined date */}
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{data.isGroup ? "Created on" : "Joined on"}</p>
                    <p className="text-foreground">{format(new Date(data.isGroup ? data.createdAt ?? Date.now() : otherUser?.createdAt ?? Date.now()), "PP")}</p>
                  </div>
                </div>

                {/* other user online info */}
                {!data.isGroup && otherUser?.lastOnline && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Seen</p>
                      <p className="text-foreground">{otherUser.isOnline ? "Online now" : format(new Date(otherUser.lastOnline), "PPp")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* action buttons */}
            <div className="flex gap-3">
              {/* leave group */}
              {data.isGroup && (
                <Button variant="secondary" className="flex-1 gap-2 cursor-pointer" onClick={() => setShowLeaveGroupConfirm(true)} disabled={isLoading}>
                  <CircleOff />
                  Leave Group
                </Button>
              )}

              {/* delete group (only for admins) */}
              {data.isGroup && isGroupAdmin && (
                <Button
                  variant="destructive"
                  className="flex-1 gap-2 hover:cursor-pointer bg-red-600/80 hover:bg-red-700 dark:bg-red-600/70 dark:hover:bg-red-800/70"
                  onClick={() => setShowDeleteGroupConfirm(true)}
                  disabled={deleteLoading}>
                  <Trash />
                  Delete Group
                </Button>
              )}

              {/* 1:1 conversation: unfriend and delete chat */}
              {!data.isGroup && (
                <>
                  <Button
                    variant="secondary"
                    className="flex-1 gap-2 hover:cursor-pointer bg-gray-200 hover:bg-gray-300 dark:bg-gray-700/30 dark:hover:bg-gray-800/70 "
                    onClick={() => setShowUnfriendConfirm(true)}
                    disabled={!isFriendStill || isLoading}>
                    <UserX />
                    {!isFriendStill ? "Unfriended" : "Unfriend"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2 hover:cursor-pointer bg-red-600/80 hover:bg-red-700 dark:bg-red-600/70 dark:hover:bg-red-800/70"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteLoading}>
                    <Trash />
                    Delete Chat
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogBox>

      {/* conversation delete confirmation dialog (one to one and group for only admins) */}
      <ConfirmationDialog
        open={data.isGroup ? showDeleteGroupConfirm : showDeleteConfirm}
        loading={deleteLoading}
        onOpenChange={data.isGroup ? setShowDeleteGroupConfirm : setShowDeleteConfirm}
        title={data.isGroup ? "Delete Group" : "Delete Chat"}
        description={
          data.isGroup
            ? "This will permanently delete this group, and all its messages with added friends."
            : "This will permanently delete this conversation and all its messages."
        }
        onConfirm={handleDeleteConversation}
      />

      {/* Leave group conversation confirmation dialog */}
      <ConfirmationDialog
        open={showLeaveGroupConfirm}
        loading={deleteLoading}
        onOpenChange={setShowLeaveGroupConfirm}
        title={"Leave Group"}
        description={"You will permanantly leave this group, and not able to join again except invited by group admins."}
        onConfirm={handleLeaveGroup}
      />

      {/* Unfriend confirmation dialog */}
      <ConfirmationDialog
        open={showUnfriendConfirm}
        loading={isLoading}
        onOpenChange={setShowUnfriendConfirm}
        title={`Unfriend ${otherUser?.name}?`}
        description="This will remove them from your friends list but keep your conversation history."
        onConfirm={handleUnfriend}
      />
    </>
  );
};

export const ProfileDrawer = React.memo(ProfileDrawerComponent, (prev, next) => {
  return (
    prev.isOpen === next.isOpen &&
    prev.trigger === next.trigger &&
    prev.onClose === next.onClose &&
    prev.data.name === next.data.name &&
    prev.data.groupAdmins === next.data.groupAdmins &&
    prev.data.groupAvatar === next.data.groupAvatar &&
    prev.data.groupBio === next.data.groupBio &&
    prev.data.isGroup === next.data.isGroup &&
    prev.data.users === next.data.users
  );
});
