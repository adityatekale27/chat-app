import { useEffect, useRef } from "react";

interface UseInfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}

/**
 * Implement infinite scroll on a scrollable container,
 * triggers `onLoadMore` when user scrolls near the bottom of the container
 */
export function useInfiniteScroll({ onLoadMore, hasMore, isLoading, threshold = 100 }: UseInfiniteScrollProps) {
  /* ref to attach the scrollable container */
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /* handler to manage scroll event */
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      // check if we are within threshold pixels
      if (scrollHeight - scrollTop - clientHeight < threshold && hasMore && !isLoading) {
        onLoadMore();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return { containerRef };
}
