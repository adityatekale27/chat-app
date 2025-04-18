"use client";

import React from "react";

function EmptyState() {
  return (
    <div className=" px-4 py-10 sm:px-6 h-full flex justify-center items-center dark:bg-[#212121] bg-[#fffbfe] rounded-lg">
      <div className="text-center items-center flex flex-col">
        <h3 className="mt-2 text-2xl font-semibold dark:text-white text-slate-900">Select a chat or start a new conversation</h3>
      </div>
    </div>
  );
}

export default EmptyState;
