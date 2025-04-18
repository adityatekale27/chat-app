"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useInfiniteScroll } from "./useInfiniteScroll";

interface AllUsersProps {
  name: string | null;
  id: string;
  username: string | null;
  email: string;
  image: string | null;
}

interface AxiosDataProps {
  lastUserId: string;
  users: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    image: string | null;
  }[];
}

/**
 * Fetch all users in a paginated format infinite scroll and search support
 */
export function useAllUsers(searchFriendTerm: string) {
  const [allUsers, setAllUsers] = useState<AllUsersProps[]>([]);
  const [isItLoading, setIsItLoading] = useState(false);
  const [isError, setIsError] = useState<string | null>(null);

  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  /* 
    fetchUsers: retrieves a batch of 50 users,
    if serach term changes then it replaces the list
  */
  const fetchUsers = useCallback(
    async (searchChanged = false) => {
      setIsItLoading(true);
      setIsError(null);

      try {
        const { data } = await axios.get<AxiosDataProps>("/api/users", { params: { search: searchFriendTerm, lastUserId: searchChanged ? undefined : lastUserId } });

        // If search changes then show new list
        if (searchChanged) {
          setAllUsers(data.users);
        } else {
          setAllUsers((prev) => [...prev, ...data.users.filter((newUser) => !prev.some((prevUser) => prevUser.id === newUser.id))]);
        }

        // Update the last user id pointer for pagination
        setLastUserId(data.lastUserId);

        // If lastUserId is null, we reached the end of the list
        setHasMore(Boolean(data.lastUserId));
      } catch (error: unknown) {
        if (axios.isCancel(error)) return;
        if (axios.isAxiosError(error) && error.response?.data?.message) {
          setIsError(error.response.data.message);
        } else {
          setIsError("Failed to fetch users");
        }
      } finally {
        setIsItLoading(false);
      }
    },
    [lastUserId, searchFriendTerm]
  );

  /* Re-fetch users when search term changes, with 300ms debounce */
  useEffect(() => {
    setLastUserId(null);
    setHasMore(true);

    const delayDebounce = setTimeout(() => fetchUsers(true), 300);
    return () => clearTimeout(delayDebounce);
  }, [searchFriendTerm, fetchUsers]);

  /* Hook to hanlde scroll behavior */
  const { containerRef } = useInfiniteScroll({
    onLoadMore: fetchUsers,
    hasMore,
    isLoading: isItLoading,
    threshold: 100,
  });

  return { allUsers, isItLoading, isError, containerRef };
}
