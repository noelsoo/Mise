"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Toast = { id: number; message: string; actionLabel?: string; onAction?: () => void; onExpire?: () => void; tone?: "error" | "info" };
type Ctx = { show: (t: Omit<Toast, "id">) => void };

const ToastContext = createContext<Ctx>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number, expired: boolean) => {
    setToasts((all) => {
      const t = all.find((x) => x.id === id);
      if (t && expired) t.onExpire?.();
      return all.filter((x) => x.id !== id);
    });
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    timers.current.set(id, setTimeout(() => dismiss(id, true), 6000));
  }, [dismiss]);

  // Commit pending deletes if the page is closed before the toast expires.
  useEffect(() => {
    const flush = () => toasts.forEach((t) => t.onExpire?.());
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg bg-[#2d312e] px-4 py-3 text-sm text-[#eff2ec] shadow-3">
            <span className="flex-1">{t.message}</span>
            {t.actionLabel ? (
              <button className="min-h-11 rounded-md px-3 font-semibold text-[#9fd3ab] hover:bg-white/10" onClick={() => { t.onAction?.(); dismiss(t.id, false); }}>
                {t.actionLabel}
              </button>
            ) : null}
            <button aria-label="Dismiss" className="grid size-11 place-items-center rounded-md hover:bg-white/10" onClick={() => dismiss(t.id, true)}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Hide something now, really delete it only if the user doesn't press Undo. */
export function useUndoableDelete() {
  const { show } = useToast();
  return useCallback(
    (opts: { message: string; hide: () => void; restore: () => void; commit: () => Promise<{ error?: string } | void> }) => {
      opts.hide();
      let done = false;
      show({
        message: opts.message,
        actionLabel: "Undo",
        onAction: () => { done = true; opts.restore(); },
        onExpire: async () => {
          if (done) return;
          done = true;
          const res = await opts.commit();
          if (res && res.error) { opts.restore(); show({ message: res.error, tone: "error" }); }
        },
      });
    },
    [show],
  );
}
