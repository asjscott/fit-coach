import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { Toast } from "@/components/toast";

type ToastType = "success" | "error" | "warning" | "info";

type ToastOptions = { type?: ToastType; duration?: number; error?: unknown };

type ToastContextValue = { showToast: (message: string, options?: ToastOptions) => void };

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

// One app-wide toast; showing another replaces the current message
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" as ToastType, duration: 3000 });

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const { type = "error", duration = 3000, error } = options ?? {};
    if (__DEV__ && type === "error") console.error(error ?? message);
    setToast({ visible: true, message, type, duration });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={value}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        isVisible={toast.visible}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </ToastContext>
  );
}

export const useToast = () => use(ToastContext);
