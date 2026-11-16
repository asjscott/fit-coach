import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { Toast, type ToastAction } from "@/components/toast";

type ToastType = "success" | "error" | "warning" | "info";

type ToastOptions = { type?: ToastType; duration?: number; error?: unknown; action?: ToastAction };

type ToastContextValue = { showToast: (message: string, options?: ToastOptions) => void };

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

// How long a toast stays up. One with an action stays long enough to read it and tap the action (#146)
const DURATION = 3000;
const ACTION_DURATION = 10_000;

// One app-wide toast; showing another replaces the current one and starts its own time
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    id: number;
    visible: boolean;
    message: string;
    type: ToastType;
    duration: number;
    action?: ToastAction;
  }>({ id: 0, visible: false, message: "", type: "info", duration: DURATION });

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const { type = "error", action, duration = action ? ACTION_DURATION : DURATION, error } = options ?? {};
    if (__DEV__ && type === "error") console.error(error ?? message);
    setToast((prev) => ({ id: prev.id + 1, visible: true, message, type, duration, action }));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={value}>
      {children}
      <Toast
        key={toast.id}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        action={toast.action}
        isVisible={toast.visible}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </ToastContext>
  );
}

export const useToast = () => use(ToastContext);
