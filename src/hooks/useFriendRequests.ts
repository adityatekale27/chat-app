"use client";

import { Contact, User } from "@prisma/client";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useInfiniteScroll } from "./useInfiniteScroll";
import { getPusherClient } from "@/libs/pusher/pusherClient";

interface UpdatedUser {
  name: string | null;
  bio: string | null;
  username: string;
  image: string | null;
  id: string;
  email: string;
  isOnline: boolean;
  lastOnline: Date | null;
}

interface FriendRequestProps {
  sentRequest: (Contact & { receiver: User })[];
  receivedRequest: (Contact & { sender: User })[];
  rejectedRequests: (Contact & { sender: User; receiver: User })[];
  friends: (Contact & { sender: User; receiver: User })[];
  otherUserFriends: (Contact & { sender: User; receiver: User })[];
  lastFriendId: string;
}

export function useFriendRequests(currentUserId: string, searchFriendTerm: string = "") {
  const pusher = getPusherClient();
  const [allContacts, setAllContacts] = useState<FriendRequestProps | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherUserFriends, setOtherFriends] = useState<User[] | null>(null);

  const [lastFriendId, setLastFriendId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isRateLimited, setIsRateLimited] = useState(false);

  /**
   * Fetch paginated friend contacts (50 at a time).
   * If search term changed, it resets the list.
   */
  const fetchAllContacts = useCallback(
    async (friendSearchChanged = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await axios.get<FriendRequestProps>("/api/contact", {
          params: { search: searchFriendTerm, lastFriendId: friendSearchChanged ? undefined : lastFriendId },
        });

        // if serach term changes, replace list
        if (friendSearchChanged) {
          setAllContacts({ ...data, friends: data.friends });
        } else {
          setAllContacts((prev) =>
            prev ? { ...prev, friends: [...prev.friends, ...data.friends.filter((newUser) => !prev.friends.some((prevUser) => prevUser.id === newUser.id))] } : data
          );
        }

        // update the pagination pointer (lastUserId)
        setLastFriendId(data.lastFriendId);

        // if lastUserId is null then their are no more users
        setHasMore(Boolean(data.lastFriendId));
      } catch (error: unknown) {
        if (axios.isCancel(error)) return;
        console.log("fetchAllContact error:", error);
        if (axios.isAxiosError(error)) {
          setError(error.response?.data?.message || "Failed to get Contacts Data");
        } else {
          setError("An unexpected error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [searchFriendTerm, lastFriendId]
  );

  // Fetch other user friends list
  const fetchOtherUserFriends = useCallback(async (otherUserId: string, otherUserName: string) => {
    try {
      const { data } = await axios.get<FriendRequestProps>("/api/contact", { params: { otherUserId } });
      const otherUserFriends = data.otherUserFriends.map((friend) => (friend.sender.id === otherUserId ? friend.receiver : friend.sender));

      setOtherFriends(otherUserFriends as User[]);
    } catch (error) {
      toast.error(`Couldn't load ${otherUserName}'s friends`);
      console.log("fetchOtherUserFriends error", error);
    }
  }, []);

  /**
   * Send a friend request
   */
  const sendFriendRequest = async (receiverId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await axios.post("/api/contact", { receiverId });

      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              sentRequest: [...prev.sentRequest, { receiver: { id: receiverId } } as Contact & { receiver: User }],
            }
          : prev
      );

      toast.success("Friend request sent!");
    } catch (error: unknown) {
      console.log("sendFriendRequest error:", error);
      const errorMessage = axios.isAxiosError(error) ? error.response?.data?.message || "Failed to send request" : "An unexpected error occurred";

      if (axios.isAxiosError(error) && error.response?.status === 429) {
        setIsRateLimited(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel a friend request or unfriend an existing friend
   */
  const cancelFriendRequest = async (receiverId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await axios.post("/api/contact", { receiverId, deleteRequest: true });

      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              sentRequest: prev.sentRequest.filter((request) => request.receiver.id !== receiverId),
              receivedRequest: prev.receivedRequest.filter((request) => request.sender.id !== receiverId),
              friends: prev.friends.filter((friend) => friend.sender.id !== receiverId && friend.receiver.id !== receiverId),
            }
          : prev
      );

      const wasFriend = allContacts?.friends.some((friend) => {
        return (friend.sender.id === currentUserId && friend.receiver.id === receiverId) || (friend.receiver.id === currentUserId && friend.sender.id === receiverId);
      });

      toast.success(wasFriend ? "Friend removed successfully" : "Friend request canceled");
    } catch (error: unknown) {
      console.log("cancelFriendRequest error:", error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Failed to delete");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Accept a received friend request
   */
  const acceptFriendRequest = async (senderId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await axios.post("/api/contact", {
        receiverId: currentUserId,
        senderId,
        acceptRequest: true,
      });

      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              receivedRequest: prev.receivedRequest.filter((request) => request.sender.id !== senderId),
              friends: [
                ...prev.friends,
                {
                  sender: { id: senderId },
                  receiver: { id: currentUserId },
                } as Contact & { sender: User; receiver: User },
              ],
            }
          : prev
      );

      toast.success("Friend request accepted!");
    } catch (error: unknown) {
      console.log("acceptFriendRequests:", error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || "Failed to accept request");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Re-fetch contacts when search term changes
   */
  useEffect(() => {
    setLastFriendId(null);
    setHasMore(true);

    const delayDebounce = setTimeout(() => fetchAllContacts(true), 300);
    return () => clearTimeout(delayDebounce);
  }, [searchFriendTerm, fetchAllContacts]);

  // handle infinite scroll
  const { containerRef } = useInfiniteScroll({
    onLoadMore: fetchAllContacts,
    hasMore,
    isLoading: isLoading,
    threshold: 100,
  });

  /**
   * Pusher events triggered for friend reqeusts
   */
  useEffect(() => {
    const friendsChannel = pusher.subscribe(currentUserId);

    // bind request send
    friendsChannel.bind("friend:request:new", (data: Contact & { sender: User; receiver: User }) => {
      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              receivedRequest: currentUserId === data.receiverId ? [...prev.receivedRequest, { ...data }] : prev.receivedRequest,
            }
          : prev
      );
    });

    // bind reqeust accept
    friendsChannel.bind("friend:request:accepted", (data: Contact & { sender: User; receiver: User }) => {
      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              sentRequest: data.senderId === currentUserId ? prev.sentRequest.filter((req) => req.senderId !== data.senderId) : prev.sentRequest,
              receivedRequest: prev.receivedRequest.filter((req) => req.sender.id !== data.senderId),
              friends: [...prev.friends, { ...data }],
            }
          : prev
      );
    });

    // bind reqeust cancel
    friendsChannel.bind("friend:request:canceled", (data: Contact & { sender: User; receiver: User }) => {
      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              sentRequest: data.senderId === currentUserId ? prev.sentRequest.filter((request) => request.receiver.id !== data.receiverId) : prev.sentRequest,
              receivedRequest: data.receiverId === currentUserId ? prev.receivedRequest.filter((request) => request.sender.id !== data.senderId) : prev.receivedRequest,
              friends: prev.friends.filter(
                (friend) =>
                  !(
                    (friend.sender.id === data.senderId && friend.receiver.id === data.receiverId) ||
                    (friend.sender.id === data.receiverId && friend.receiver.id === data.senderId)
                  )
              ),
            }
          : prev
      );
    });

    // bind reqeust removed (unfriend)
    friendsChannel.bind("friend:removed", (data: Contact & { sender: User; receiver: User }) => {
      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              sentRequest: prev.sentRequest.filter((req) => req.receiver.id !== data.receiverId),
              receivedRequest: prev.receivedRequest.filter((req) => req.sender.id !== data.senderId),
              friends: prev.friends.filter((friend) => {
                const friendUserIds = [friend.sender.id, friend.receiver.id];
                return !(friendUserIds.includes(data.senderId) && friendUserIds.includes(data.receiverId));
              }),
            }
          : prev
      );
    });

    return () => {
      friendsChannel.unbind_all();
      pusher.unsubscribe(currentUserId);
    };
  }, [currentUserId, pusher]);

  // Pusher event for updated user
  useEffect(() => {
    const updatedUser = pusher.subscribe("userUpdate");

    updatedUser.bind("user:updated", (data: UpdatedUser) => {
      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              friends: prev.friends.map((friend) => {
                if (friend.sender.id === data.id) {
                  return { ...friend, sender: { ...friend.sender, ...data } };
                } else if (friend.receiver.id === data.id) {
                  return { ...friend, receiver: { ...friend.receiver, ...data } };
                }
                return friend;
              }),
            }
          : prev
      );
    });

    updatedUser.bind("user:deleted", (userId: string) => {
      setAllContacts((prev) =>
        prev
          ? {
              ...prev,
              friends: prev.friends.filter((friend) => friend.sender.id !== userId && friend.receiver.id !== userId),
            }
          : prev
      );
    });

    return () => {
      updatedUser.unbind_all();
      pusher.unsubscribe("userUpdate");
    };
  }, [pusher]);

  return {
    sentRequests: allContacts?.sentRequest ?? [],
    receivedRequests: allContacts?.receivedRequest ?? [],
    friends: allContacts?.friends ?? [],
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    fetchOtherUserFriends,
    otherUserFriends,
    error,
    isRateLimited,
    isLoading,
    containerRef,
  };
}
