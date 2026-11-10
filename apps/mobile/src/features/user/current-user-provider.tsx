import { useAuth } from "@clerk/expo";
import { User, type EquipmentProfileInput, type UserUpdate } from "@fit/shared";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { ApiError, useApi } from "@/api";
import { deviceStorage } from "@/features/workouts/device-storage";
import { errorMessage } from "@/utils/error-message";
import { useSendTimeZone } from "./hooks/use-send-time-zone";
import { createStoredUser } from "./stored-user";

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

const storedUser = createStoredUser(deviceStorage);

// Loads the signed-in user's record once and shares it with every screen, starting from the copy on the phone so the
// app opens with no signal
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const api = useApi();
  const [user, setUserOnly] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setUser = useCallback((loaded: User) => {
    setUserOnly(loaded);
    storedUser.keep(loaded).catch(() => {});
  }, []);

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
  }, [fetchOrCreateUser, setUser]);

  useEffect(() => {
    if (isSignedIn) {
      // The server's answer can get here first, and wins
      storedUser.read().then(
        (stored) => setUserOnly((loaded) => loaded ?? stored),
        () => {},
      );
      refresh();
    } else {
      setUserOnly(null);
      setError(null);
      // Undefined is Clerk still loading, when the user may yet turn out to be signed in
      if (isSignedIn === false) storedUser.forget().catch(() => {});
    }
  }, [isSignedIn, refresh]);

  const updateUser = useCallback(
    async (update: UserUpdate) => {
      const updated = User.parse(await api("/user", { method: "PATCH", body: JSON.stringify(update) }));
      setUser(updated);
      return updated;
    },
    [api, setUser],
  );

  const saveEquipmentProfile = useCallback(
    async (input: EquipmentProfileInput, id?: string) => {
      const path = id ? `/user/equipment-profiles/${encodeURIComponent(id)}` : "/user/equipment-profiles";
      const updated = User.parse(await api(path, { method: id ? "PUT" : "POST", body: JSON.stringify(input) }));
      setUser(updated);
      return updated;
    },
    [api, setUser],
  );

  useSendTimeZone(user, updateUser);

  return (
    <CurrentUserContext value={{ user, error, refresh, updateUser, saveEquipmentProfile }}>
      {children}
    </CurrentUserContext>
  );
}

export function useCurrentUser() {
  const context = use(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser must be used inside <CurrentUserProvider>");
  return context;
}

// The Equipment Profile the user trains with by default; undefined until the user loads
export function usePrimaryEquipmentProfile() {
  return useCurrentUser().user?.equipmentProfiles.find((profile) => profile.isPrimary);
}
