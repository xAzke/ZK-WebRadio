import "dotenv/config";
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

// Use the same database as the .NET API for shared session data
const db = new Database("../webradio/auth.db");

// Parse allowed Discord IDs from environment variable
const allowedDiscordIds = process.env.ALLOWED_DISCORD_IDS
    ? process.env.ALLOWED_DISCORD_IDS.split(",").map((id) => id.trim())
    : [];

export const auth = betterAuth({
    database: db,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,

    // Redirect errors to dashboard with error code
    onAPIError: {
        onError: (error: unknown) => {
            console.log(
                `[Auth Error] ${error instanceof Error ? error.message : error}`,
            );
        },
    },

    socialProviders: {
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID as string,
            clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
        },
    },

    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Update session every 24 hours
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes
        },
    },

    trustedOrigins: [
        "http://localhost:5173", // Vite dev server
        "http://localhost:3000", // Auth server
        "https://dash.api.azke.tech",
        "https://auth.api.azke.tech",
    ],

    // Hook to validate user on account link (after Discord OAuth)
    account: {
        accountLinking: {
            enabled: true,
        },
    },

    // Validate user access after login
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    // If no allowed IDs configured, allow everyone
                    if (allowedDiscordIds.length === 0) {
                        console.log(
                            `⚠️ No ALLOWED_DISCORD_IDS configured - allowing all users`,
                        );
                        return { data: user };
                    }
                    return { data: user };
                },
            },
        },
        session: {
            create: {
                before: async (session) => {
                    // If no allowed IDs configured, allow everyone
                    if (allowedDiscordIds.length === 0) {
                        return { data: session };
                    }

                    // Check if the user's Discord ID is in the allowed list
                    const userId = session.userId;

                    // Query the account table to get the Discord account ID
                    const stmt = db.prepare(
                        "SELECT accountId FROM account WHERE userId = ? AND providerId = 'discord'",
                    );
                    const account = stmt.get(userId) as
                        | { accountId: string }
                        | undefined;

                    if (!account) {
                        console.log(
                            `❌ No Discord account found for user ${userId}`,
                        );
                        return false; // Reject session creation gracefully
                    }

                    if (!allowedDiscordIds.includes(account.accountId)) {
                        console.log(
                            `❌ Discord ID ${account.accountId} not in allowed list`,
                        );
                        return false; // Reject session creation gracefully
                    }

                    console.log(
                        `\n  ✅ Discord ID ${account.accountId} autorizado\n`,
                    );
                    return { data: session };
                },
            },
        },
    },
});

export type Session = typeof auth.$Infer.Session;

// Log configuration on startup
if (allowedDiscordIds.length > 0) {
    console.log(
        `🔒 Access restricted to Discord IDs: ${allowedDiscordIds.join(", ")}`,
    );
} else {
    console.log(
        `⚠️ ALLOWED_DISCORD_IDS not set - all Discord users can login!`,
    );
}
