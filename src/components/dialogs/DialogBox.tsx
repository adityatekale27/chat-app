import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReactNode } from "react";

interface DialogBoxProps {
  trigger: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  dialogTitle?: string;
  dialogDescription?: string;
}

export function DialogBox({ isOpen, onClose, trigger, dialogTitle = "", dialogDescription = "", children }: DialogBoxProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogOverlay className="bg-black/70 fixed inset-0 transition-opacity" />
      <DialogContent className="max-h-[80%] overflow-y-auto fixed left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white dark:bg-[#212121] p-3 md:p-5 shadow-lg transition-all">
        <DialogHeader className="mb-2">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  );
}
