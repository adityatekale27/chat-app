"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmationDialog({ open, loading, onOpenChange, title, description, onConfirm, confirmText = "Confirm", cancelText = "Cancel" }: ConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark:bg-black">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="hover:cursor-pointer bg-gray-200 hover:bg-gray-300 dark:bg-gray-700/30 dark:hover:bg-gray-800/70 ">
            {cancelText}
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="hover:cursor-pointer bg-red-600/80 hover:bg-red-700 dark:bg-red-600/70 dark:hover:bg-red-800/70">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>{confirmText}</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
