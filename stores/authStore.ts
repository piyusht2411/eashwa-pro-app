import {
  logout as apiLogout,
  registerUser as apiRegisterUser,
  loginUser,
  switchPortal as apiSwitchPortal,
  type AuthUser,
} from "@/lib/api";
import type { AppUser, Portal } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { StorageValue } from "zustand/middleware";
import { persist } from "zustand/middleware";

interface AuthStore {
  isSignedIn: boolean;
  user: AppUser | null;
  token: string | null;
  /**
   * The saved session is read back from AsyncStorage asynchronously, so for the
   * first frames of a cold start the store looks signed out even when it is
   * not. Nothing may route on auth state until this turns true.
   */
  hasHydrated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    role: "admin" | "team" | "pdi",
    phone: string,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Cross-portal admins only: move the session into the other portal. */
  switchPortal: (
    portal: Portal,
  ) => Promise<{ success: boolean; error?: string }>;
  switchingPortal: boolean;
  logout: () => Promise<void>;
}

/** Map a login / switch-portal response user onto the app's user shape. */
const toAppUser = (u: AuthUser): AppUser => ({
  _id: u._id,
  name: u.name,
  role: u.role as AppUser["role"],
  portal: u.portal,
  homePortal: u.homePortal ?? u.portal,
  crossPortalAccess: u.crossPortalAccess ?? false,
  availablePortals: u.availablePortals ?? (u.portal ? [u.portal] : []),
  email: u.email,
  phone: u.phone,
});

const asyncStorageAdapter = {
  getItem: async (name: string) => {
    const item = await AsyncStorage.getItem(name);
    return item ? JSON.parse(item) : null;
  },
  setItem: async (name: string, value: StorageValue<AuthStore>) => {
    await AsyncStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isSignedIn: false,
      user: null,
      token: null,
      hasHydrated: false,
      switchingPortal: false,

      login: async (email, password) => {
        try {
          const response = await loginUser(email, password);
          set({
            isSignedIn: true,
            user: toAppUser(response.user),
            token: response.token,
          });
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message || "Login failed" };
        }
      },

      switchPortal: async (portal) => {
        const { token, user } = get();
        if (!token || !user) {
          return { success: false, error: "Not signed in" };
        }
        if (user.portal === portal) return { success: true };

        set({ switchingPortal: true });
        try {
          const response = await apiSwitchPortal(portal, token);
          set({
            user: toAppUser(response.user),
            token: response.token,
            switchingPortal: false,
          });
          return { success: true };
        } catch (error: any) {
          set({ switchingPortal: false });
          return {
            success: false,
            error: error.message || "Could not switch portal",
          };
        }
      },

      register: async (name, email, password, role, phone) => {
        try {
          // For now, registration requires admin token. In a real app, initial admin setup would be different
          // This is a simplified approach - adjust based on your backend setup
          const response = await apiRegisterUser({
            name,
            email,
            password,
            role,
            phone,
          });
          return { success: true };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || "Registration failed",
          };
        }
      },

      logout: async () => {
        try {
          await apiLogout();
        } catch (error) {
          console.error("Logout API error:", error);
        }
        set({
          isSignedIn: false,
          user: null,
          token: null,
          switchingPortal: false,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: asyncStorageAdapter,
      // Runs once the saved session has been read back (or failed to read) —
      // either way the app may start routing on auth state from here on.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.error("Auth rehydrate failed:", error);
        useAuthStore.setState({ hasHydrated: true });
      },
      // zustand v5: partialize must satisfy full store type.
      // Cast is safe — JSON serialization ignores functions automatically.
      partialize: (state) =>
        ({
          user: state.user,
          token: state.token,
          isSignedIn: state.isSignedIn,
        }) as AuthStore,
    },
  ),
);
