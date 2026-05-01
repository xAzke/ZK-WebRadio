import "dotenv/config";
import { Hono } from "hono";
import { auth } from "./auth";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { sign } from "hono/jwt";

const app = new Hono();

// Shared secret for JWT (same as BETTER_AUTH_SECRET for simplicity)
const JWT_SECRET =
    process.env.BETTER_AUTH_SECRET || "fallback-secret-change-me";

// CORS for dashboard frontend
app.use(
    "*",
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://dash.api.azke.tech",
            "https://auth.api.azke.tech",
        ],
        credentials: true,
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
);

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "auth" }));

// Dashboard URL for redirects
const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:5173";

// Better-auth handler with error handling
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
    try {
        const response = await auth.handler(c.req.raw);

        // Check if response is an error redirect (unable_to_create_session)
        if (response.status === 302) {
            const location = response.headers.get("Location");
            if (location?.includes("error=")) {
                // Redirect to custom dashboard error page instead
                const url = new URL(location, c.req.url);
                const errorCode = url.searchParams.get("error") || "generic";
                return c.redirect(
                    `${DASHBOARD_URL}/auth-error?type=${errorCode}`,
                );
            }
        }

        return response;
    } catch (error) {
        console.error("❌ Error manejando solicitud de auth:", error);
        return c.redirect(`${DASHBOARD_URL}/auth-error?type=generic`);
    }
});

// Generate admin JWT for authenticated users
// Dashboard calls this after successful Discord login
app.get("/api/admin-token", async (c) => {
    try {
        // Get session from better-auth
        const session = await auth.api.getSession({
            headers: c.req.raw.headers,
        });

        if (!session?.user) {
            return c.json({ error: "Not authenticated" }, 401);
        }

        // Generate JWT valid for 24 hours
        const payload = {
            sub: session.user.id,
            name: session.user.name,
            email: session.user.email,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
        };

        const token = await sign(payload, JWT_SECRET);

        console.log(`\n  ✅ Token generado para ${session.user.name}\n`);

        return c.json({
            token,
            expiresIn: 60 * 60 * 24,
            user: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
            },
        });
    } catch (error) {
        console.error("❌ Error generando token:", error);
        return c.json({ error: "Failed to generate token" }, 500);
    }
});

const port = parseInt(process.env.AUTH_PORT || "3000");

console.log("");
console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║      🔐 Servidor de Autenticación - Webradio Dashboard     ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log("");
console.log(`  🌐 URL:              http://localhost:${port}`);
console.log(
    `  🎮 Discord OAuth:    http://localhost:${port}/api/auth/callback/discord`,
);
console.log(`  🎫 Token Admin:      http://localhost:${port}/api/admin-token`);
console.log("");
console.log("  ✨ ¡Servidor listo para recibir conexiones!");
console.log("");

serve({
    fetch: app.fetch,
    port,
});
