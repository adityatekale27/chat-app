"use client";

import { Skeleton } from "../ui/skeleton";

const UserBoxSkeleton = ({ freq }: { freq: number }) => {
  return [...Array(freq)].map((_, index) => (
    <div key={index} className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full bg-gray-400/40" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-full bg-gray-400/40" />
        <Skeleton className="h-3 w-3/4 bg-gray-400/40" />
      </div>
    </div>
  ));
};

const ChatSkeleton = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Skeleton */}
      <div className="p-4 border-b border-b-gray-500/50 bg-gray-100 dark:bg-[#212529] flex justify-between items-center w-full rounded-t-lg">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10 rounded-full bg-gray-400/40" />
          <div>
            <Skeleton className="h-3 w-32 bg-gray-400/40 mb-1" />
            <Skeleton className="h-2 w-20 bg-gray-400/40" />
          </div>
        </div>
        <div className="flex gap-0.5">
          <Skeleton className="w-2 h-2 bg-gray-400/40" />
          <Skeleton className="w-2 h-2 bg-gray-400/40" />
          <Skeleton className="w-2 h-2 bg-gray-400/40" />
        </div>
      </div>

      {/* Messages Skeleton */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto justify-end">
        <div className="space-y-4">
          {[...Array(2)].map((_, index) => (
            <div key={index}>
              <div className="flex flex-col gap-5 mx-4">
                <div className="flex flex-col items-end">
                  <Skeleton className="w-60 h-5 bg-gray-400/40 rounded-full mb-2" />
                  <Skeleton className="w-80 h-5 bg-gray-400/40 rounded-full" />
                </div>
                <div className="flex flex-col items-start">
                  <Skeleton className="w-60 h-5 bg-gray-400/40 rounded-full mb-2" />
                  <Skeleton className="w-80 h-5 bg-gray-400/40 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="py-3 px-2 border-t flex items-center space-x-2 justify-evenly mb-4">
        <Skeleton className="w-9 h-9 rounded-full bg-gray-400/40" />
        <Skeleton className="flex-1 h-9 rounded-full bg-gray-400/40" />
        <Skeleton className="w-9 h-9 rounded-full bg-gray-400/40" />
      </div>
    </div>
  );
};

const FileSkeleton = () => {
  return (
    <div>
      <Skeleton className="h-100 w-100 bg-gray-500/80" />
    </div>
  );
};

export { UserBoxSkeleton, ChatSkeleton, FileSkeleton };
