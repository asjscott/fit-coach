import { useAuth } from "@clerk/expo";
import { User, type EquipmentProfileInput, type UserUpdate } from "@fit/shared";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { ApiError, useApi } from "@/api";
import { errorMessage } from "@/utils/error-message";

type CurrentUserContextValue = {
  // null until loaded, and while signed out
  user: User | null;
  error: string | null;
  refresh: () => Promise<void>;
  updateUser: (update: UserUpdate) => Promise<User>;
  // Creates a profile without an id, or updates the one with this id
  saveEquipmentProfile: (input: EquipmentProfileInput, id?: string) => Promise<User>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

// Loads the signed-in user's record once and shares it with every screen
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const api = useApi();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // First sign-in has no record yet, so create it
  const fetchOrCreateUser = useCallback(async () => {
    try {
      return await api("/user");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return api("/users", { method: "POST" });
      throw err;
    }
  }, [api]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setUser(User.parse(await fetchOrCreateUser()));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [fetchOrCreateUser]);

  useEffect(() => {
    if (isSignedIn) {
      refresh();
    } else {
      setUser(null);
      setError(null);
    }
  }, [isSignedIn, refresh]);

  const updateUser = useCallback(
    async (update: UserUpdate) => {
      const updated = User.parse(await api("/user", { method: "PATCH", body: JSON.stringify(update) }));
      setUser(updated);
      return updated;
    },
    [api],
  );

  const saveEquipmentProfile = useCallback(
    async (input: EquipmentProfileInput, id?: string) => {
      const path = id ? `/user/equipment-profiles/${encodeURIComponent(id)}` : "/user/equipment-profiles";
      const updated = User.parse(await api(path, { method: id ? "PUT" : "POST", body: JSON.stringify(input) }));
      setUser(updated);
      return updated;
    },
    [api],
  );

  return <CurrentUserContext value={{ user, error, refresh, updateUser, saveEquipmentProfile }}>{children}</CurrentUserContext>;
}

export function useCurrentUser() {
  const context = use(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser must be used inside <CurrentUserProvider>");
  return context;
}
