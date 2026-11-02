"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native <dialog>: focus trapping, Escape and backdrop come from the browser. */
export function Dialog({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-label={title}
      className={cn("m-auto w-[min(100%-2rem,32rem)] rounded-xl border border-border bg-surface p-0 text-ink shadow-3 backdrop:bg-black/40", className)}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-xl">{title}</h2>
        <button aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-md hover:bg-surface-muted"><X className="size-5" /></button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{open ? children : null}</div>
    </dialog>
  );
}
