import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { Toast, type ToastAction } from "@/components/toast";

type ToastType = "success" | "error" | "warning" | "info";

// action: a button on the toast, e.g. "See results"
type ToastOptions = { type?: ToastType; duration?: number; error?: unknown; action?: ToastAction };

type ToastContextValue = { showToast: (message: string, options?: ToastOptions) => void };

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

// One app-wide toast; showing another replaces the current message
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
    duration: number;
    action?: ToastAction;
  }>({ visible: false, message: "", type: "info", duration: 3000 });

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const { type = "error", duration = 3000, error, action } = options ?? {};
    if (__DEV__ && type === "error") console.error(error ?? message);
    setToast({ visible: true, message, type, duration, action });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={value}>
      {children}
      <Toast
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
