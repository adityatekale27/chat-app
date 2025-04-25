"use client";

import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col gap-2 items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 md:h-10  md:w-10 text-muted-foreground animate-spin" />
      <div className="text-sm md:text-lg">Loading</div>
    </div>
  );
}
