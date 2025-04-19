"use client";

import { DialogBox } from "./DialogBox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

import { useEffect, useMemo, useState } from "react";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import toast from "react-hot-toast";
import { useAllUsers } from "@/hooks/useAllUsers";
import { UserBoxSkeleton } from "../loading-states/LoadingSkeleton";
import { FormError } from "../auth/FormError";
import clsx from "clsx";
import { useIsMobile } from "@/hooks/useMobile";
import { UserCheck, UserX } from "lucide-react";

interface FindFriendProps {
  trigger: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export function FindFriend({ isOpen, onClose, trigger, currentUser }: FindFriendProps) {
  const isMobile = useIsMobile();
  const [searchFriendTerm, setSearchFriendTerm] = useState("");
  const [showRequestNumbers, setShowRequestNumbers] = useState(false);
  const [disableSendRequest, setDisableSendRequest] = useState(false);
  const [showRateLimitError, setShowRateLimitError] = useState("");

  const { allUsers, isItLoading, isError, containerRef } = useAllUsers(searchFriendTerm);
  const { friends, receivedRequests, sentRequests, error, isRateLimited, sendFriendRequest, cancelFriendRequest, acceptFriendRequest } = useFriendRequests(currentUser?.id);

  /** Show error from hooks if available */
  useEffect(() => {
    if (isRateLimited) {
      setDisableSendRequest(true);

      // calculate 1 hour from now
      const resetTime = Date.now() + 60 * 60 * 1000;

      const interval = setInterval(() => {
        const remainingMs = resetTime - Date.now();

        if (remainingMs <= 0) {
          clearInterval(interval);
          setShowRateLimitError("");
          setDisableSendRequest(false);
          return;
        }

        const minutes = Math.floor(remainingMs / (60 * 1000));
        const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

        setShowRateLimitError(`Too many friend requests! Please wait ${minutes}m ${seconds}s before trying again.`);
      }, 1000);

      return () => clearInterval(interval);
    } else if (error) {
      toast.error(error);
      setDisableSendRequest(false);
    }

    if (isError) toast.error(isError);
  }, [error, isError, isRateLimited]);

  /* Set show friend request numbers (notificaiton) when received requests length changes */
  useEffect(() => {
    setShowRequestNumbers(receivedRequests.length > 0);
  }, [receivedRequests.length]);

  /* Filter out users who are already friends or have sent a friend request */
  const filteredUsers = useMemo(() => {
    return allUsers.filter(
      (user) => !receivedRequests.some((req) => req.sender.id === user.id) && !friends.some((friend) => friend.receiverId === user.id || friend.senderId === user.id)
    );
  }, [allUsers, friends, receivedRequests]);

  return (
    <DialogBox
      isOpen={isOpen}
      onClose={onClose}
      trigger={trigger}
      dialogTitle={"Connect with Friends"}
      dialogDescription={"Search for people, send friend requests, and manage your connections."}>
      <Tabs
        defaultValue="searchFriends"
        className="w-full"
        onValueChange={(value) => {
          if (value === "friendRequests") setShowRequestNumbers(false);
        }}>
        {/* Tab header: search friends and friend requests */}
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="searchFriends" className="hover:cursor-pointer">
            Search Friends
          </TabsTrigger>
          <TabsTrigger value="friendRequests" className="hover:cursor-pointer flex items-center justify-center">
            Friend Requests
            {showRequestNumbers && receivedRequests.length && (
              <span className="ml-1 px-2 py-1 text-xs font-semibold leading-none text-white bg-green-600/70 rounded-full">{receivedRequests.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab content: Search friends tab */}
        <TabsContent value="searchFriends">
          <Card>
            <CardHeader>
              <CardTitle>Find People</CardTitle>
              <CardDescription>Search for friends by name, email, or username to connect.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-2">
              {/* Search box for finding users available on platform */}
              <Input id="search" className="" placeholder="Type to search..." value={searchFriendTerm} onChange={(e) => setSearchFriendTerm(e.target.value)} />

              {/* Rate limiter error */}
              {showRateLimitError && <FormError message={showRateLimitError} />}

              {/* Scroll area for showing all users */}
              <ScrollArea className="max-h-60 overflow-y-auto w-full rounded-lg border mt-4">
                <div ref={containerRef}>
                  {isItLoading ? (
                    // loading skeleton
                    <div className="space-y-4 p-4">
                      <UserBoxSkeleton freq={6} />
                    </div>
                  ) : allUsers?.length > 0 ? (
                    filteredUsers.map((user, index) => {
                      // check if the request has been sent
                      const hasSentRequest = sentRequests.some((req) => req.receiver && req.receiver?.id === user?.id);

                      return (
                        <div key={user.id}>
                          <div className="w-full flex items-center gap-3 p-3 transition hover:bg-gray-200 dark:hover:bg-gray-700/20">
                            {/* User info, profile photo */}
                            <div className="rounded-full overflow-hidden h-10 w-10">
                              <Image height={40} width={40} alt="User Avatar" className="object-cover w-full h-full" src={user?.image || "/images/avatar.jpg"} />
                            </div>

                            <div className="flex-1 flex items-center justify-between">
                              {/* User info, name, username and email */}
                              <div className="flex flex-col items-start max-w-[7rem] md:max-w-[13rem]">
                                <div className="flex flex-wrap sm:flex-nowrap items-center w-full">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate mr-1">{user?.name || "User"}</p>
                                  {user?.username && <p className="text-xs text-gray-500/80 dark:text-gray-200/60 truncate">~ {user?.username || ""}</p>}
                                </div>

                                <p className="text-xs text-gray-500/80 dark:text-gray-200/60 truncate max-w-[11rem]">{user?.email || ""}</p>
                              </div>

                              {/* Action buttons (send request, cancel request) */}
                              {hasSentRequest ? (
                                <button
                                  className="px-3 py-1 text-sm font-medium text-white hover:bg-slate-950 bg-slate-700 rounded-md transition hover:cursor-pointer"
                                  onClick={() => cancelFriendRequest(user.id)}>
                                  Cancel
                                </button>
                              ) : (
                                <button
                                  disabled={disableSendRequest}
                                  className={clsx(
                                    "px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded-md transition",
                                    disableSendRequest ? "bg-slate-400 text-white cursor-not-allowed opacity-60" : "bg-slate-700 text-white hover:bg-slate-950 cursor-pointer"
                                  )}
                                  onClick={() => sendFriendRequest(user.id)}>
                                  Send Request
                                </button>
                              )}
                            </div>
                          </div>
                          {allUsers.length - 1 !== index && <Separator />}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-black/60 dark:text-slate-50/80 py-4">No users found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab content: Friend Requests Tab */}
        <TabsContent value="friendRequests">
          <Card>
            <CardHeader>
              <CardTitle>Friend Requests</CardTitle>
              <CardDescription>Accept or decline friend requests from people who want to connect.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ScrollArea className="max-h-80 overflow-y-auto w-full rounded-lg border ">
                {/* Show all friend requests */}
                {receivedRequests.length ? (
                  receivedRequests.map((user, index) => (
                    <div key={user.id}>
                      <div className="w-full flex items-center gap-3 p-3 transition hover:bg-gray-200 dark:hover:bg-gray-700/20">
                        <div className="rounded-full overflow-hidden h-10 w-10">
                          <Image height={40} width={40} alt="User Avatar" className="object-cover w-full h-full" src={user.sender?.image || "/images/avatar.jpg"} />
                        </div>

                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex flex-col items-start">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.sender?.name || "User"}</p>
                            <p className="text-xs text-gray-500/80 dark:text-gray-200/60">{user.sender?.username || ""}</p>
                          </div>
                          <div className="flex">
                            <button
                              className="px-3 py-1 mr-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-900 hover:cursor-pointer"
                              onClick={() => acceptFriendRequest(user.sender?.id)}>
                              {isMobile ? <UserCheck size={20} /> : "Accept"}
                            </button>
                            <button
                              className="px-3 py-1 text-sm font-medium text-white hover:bg-slate-950 bg-slate-700 rounded-md transition hover:cursor-pointer"
                              onClick={() => cancelFriendRequest(user.sender?.id)}>
                              {isMobile ? <UserX size={20} /> : "Cancel"}
                            </button>
                          </div>
                        </div>
                      </div>
                      {index !== receivedRequests.length - 1 && <Separator />}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-black/60 dark:text-slate-50/80 py-4">No friend requests</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DialogBox>
  );
}
