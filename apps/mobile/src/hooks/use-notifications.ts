import { useCallback, useMemo } from "react";
import { ErrorResponse } from "@fit/shared";
import { useToast } from "@/contexts/toast-context";

type NotificationType = "error" | "success" | "warning" | "info";

const DEFAULT_NOTIFICATION_MESSAGES: Record<NotificationType, string> = {
  error: "Error",
  success: "Success",
  warning: "Warning",
  info: "Complete",
};

// API errors carry the raw response body; show the server's `error` field rather than JSON
function messageFromError(error: unknown) {
  if (typeof error === "string") return error;
  if (!(error instanceof Error)) return "Unknown Error";
  try {
    const parsed = ErrorResponse.safeParse(JSON.parse(error.message));
    if (parsed.success) return parsed.data.error;
    const body = JSON.parse(error.message) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // Not JSON: the message is already readable
  }
  return error.message || "Unknown Error";
}

export function useNotifications() {
  const { showToast } = useToast();

  const showNotification = useCallback(
    ({ type = "error", duration = 3000, message, error }: { type?: NotificationType; duration?: number; message?: string; error?: unknown }) =>
      showToast(message || DEFAULT_NOTIFICATION_MESSAGES[type], { type, duration, error }),
    [showToast],
  );

  const handleError = useCallback(
    (error: unknown, options?: { duration?: number }) => {
      const message = messageFromError(error);
      showNotification({ type: "error", message, duration: options?.duration, error });
      return new Error(message);
    },
    [showNotification],
  );

  const handleSuccess = useCallback(
    (message = "Updated successfully!", options?: { duration?: number }) => {
      showNotification({ type: "success", message, duration: options?.duration });
      return message;
    },
    [showNotification],
  );

  return useMemo(() => ({ handleError, handleSuccess, showNotification }), [handleError, handleSuccess, showNotification]);
}
