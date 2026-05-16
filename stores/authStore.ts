import {
  logout as apiLogout,
  registerUser as apiRegisterUser,
  loginUser,
} from "@/lib/api";
import type { AppUser } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { StorageValue } from "zustand/middleware";
import { persist } from "zustand/middleware";

interface AuthStore {
  isSignedIn: boolean;
  user: AppUser | null;
  token: string | null;
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
  logout: () => Promise<void>;
}

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
    (set) => ({
      isSignedIn: false,
      user: null,
      token: null,

      login: async (email, password) => {
        try {
          const response = await loginUser(email, password);
          const user: AppUser = {
            _id: response.user._id,
            name: response.user.name,
            role: response.user.role,
          };
          set({ isSignedIn: true, user, token: response.token });
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message || "Login failed" };
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
        set({ isSignedIn: false, user: null, token: null });
      },
    }),
    {
      name: "auth-storage",
      storage: asyncStorageAdapter,
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
