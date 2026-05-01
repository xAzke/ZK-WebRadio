module.exports = {
    apps: [
        {
            name: "auth-server",
            script: "./server/index.ts",
            interpreter: "npx",
            interpreter_args: "tsx",
            cwd: __dirname,
            env: {
                NODE_ENV: "production",
                AUTH_PORT: 6000,
                BETTER_AUTH_SECRET: "8q4eWGxgZsL4JJWD9lHkAGaKxcRLvM1Ec8BWD9O4XqoT5DGwJxLtUmIK9Fj3d4di",
                BETTER_AUTH_URL: "https://auth.api.azke.tech",
                DISCORD_CLIENT_ID: "1427204165834379274",
                DISCORD_CLIENT_SECRET: "SJcy4h4KcZ_Jv0JtGo9jbn-DH_fjzYvk",
                ALLOWED_DISCORD_IDS: "394920068447731712,924386210980462642",
                DASHBOARD_URL: "https://dash.api.azke.tech",
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
        },
    ],
};

