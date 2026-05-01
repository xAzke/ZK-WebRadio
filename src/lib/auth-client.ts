import { createAuthClient } from "better-auth/react";

const authServerUrl = import.meta.env.VITE_AUTH_URL || "http://localhost:3000";

export const authClient = createAuthClient({
    baseURL: authServerUrl,
});

// Export hooks for React components
export const { useSession, signIn, signOut } = authClient;
