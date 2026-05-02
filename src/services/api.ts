import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "/admin";

// Get admin token from Supabase session
export async function getAdminToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

// Clear token on logout (handled by Supabase, but kept for compatibility)
export function clearAdminToken() {
    // Supabase handles this via signOut()
}

// Fetch with JWT Bearer token
async function fetchWithAuth(
    url: string,
    options: RequestInit = {},
): Promise<Response> {
    const token = await getAdminToken();

    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    console.log(`[API] Fetching: ${url}`); // Debugging

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            console.error(`[API] Error ${response.status}: ${response.statusText} at ${url}`);
        }

        return response;
    } catch (err) {
        console.error(`[API] Network error at ${url}:`, err);
        throw err;
    }
}

// Stats API
export interface Stats {
    uptime: string;
    uptimeSeconds: number;
    cache: {
        files: number;
        sizeBytes: number;
        sizeMB: number;
    };
    requests: {
        today: { searches: number; streams: number };
        total: { searches: number; streams: number };
    };
    topApiKeys: { name: string; requests: number }[];
    topIPs: { name: string; requests: number }[];
    topUserAgents: { name: string; requests: number }[];
    topTracks: { name: string; requests: number }[];
    totalFailures: number;
    failureRatio: number;
    timestamp: string;
}

export async function getStats(): Promise<Stats> {
    const response = await fetchWithAuth(`${API_BASE}/stats`);
    if (!response.ok) throw new Error("Failed to fetch stats");
    return response.json();
}

export async function resetFailures(): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE}/stats/failures`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to reset failures");
}

export async function fixUnknownTracks(): Promise<{
    message: string;
    fixed_count: number;
    total: number;
}> {
    const response = await fetchWithAuth(`${API_BASE}/tracks/fix-unknown`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to fix unknown tracks");
    return response.json();
}

// Cache API
export interface CacheFile {
    id: string;
    title: string;
    artist: string;
    cover: string;
    sizeMB: number;
    lastAccessed: string;
}

export async function getCacheFiles(search?: string): Promise<CacheFile[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await fetchWithAuth(`${API_BASE}/cache/files${params}`);
    if (!response.ok) throw new Error("Failed to fetch cache files");
    const data = await response.json();
    return data.files;
}

export async function getCachePlayUrl(trackId: string): Promise<string> {
    const response = await fetchWithAuth(`${API_BASE}/cache/play/${trackId}`);
    if (!response.ok) throw new Error("Failed to fetch audio");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

// Runtime Settings API
export interface RuntimeSettingsData {
    useApiKeyAuthentication: boolean | null;
    useUserAgentAuthentication: boolean | null;
    logUserAgent: boolean | null;
}

export async function getSettings(): Promise<RuntimeSettingsData> {
    const response = await fetchWithAuth(`${API_BASE}/settings`);
    if (!response.ok) throw new Error("Failed to fetch settings");
    return response.json();
}

export async function updateSettings(
    settings: Partial<RuntimeSettingsData>,
): Promise<RuntimeSettingsData> {
    const response = await fetchWithAuth(`${API_BASE}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error("Failed to update settings");
    return response.json();
}

// Top Tracks API
export interface Track {
    trackId: string;
    title: string;
    artist: string;
    albumCover?: string;
    previewUrl?: string;
    playCount: number;
    failureCount: number;
    lastPlayedAt?: string;
}

// Track failures API
export interface FailureTrack {
    trackId: string;
    title: string;
    artist: string;
    albumCover?: string;
    playCount: number;
    failureCount: number;
    failureRatio: number;
    lastPlayedAt?: string;
}

export async function getTopTracks(limit = 10): Promise<Track[]> {
    const response = await fetchWithAuth(
        `${API_BASE}/tracks/top?limit=${limit}`,
    );
    if (!response.ok) throw new Error("Failed to fetch top tracks");
    return response.json();
}

export async function getTopFailures(limit = 10): Promise<FailureTrack[]> {
    const response = await fetchWithAuth(
        `${API_BASE}/tracks/top-failures?limit=${limit}`,
    );
    if (!response.ok) throw new Error("Failed to fetch top failures");
    return response.json();
}

// API Keys API
export interface ApiKey {
    id: string;
    owner: string;
    keyPreview: string;
    serverAddress: string;
    allowedIPAddresses: string;
    isActive: boolean;
    createdAt: string;
    lastUsedAt?: string;
}

export interface ApiKeyFull extends Omit<ApiKey, "keyPreview"> {
    key: string;
}

export async function getApiKeys(): Promise<ApiKey[]> {
    const response = await fetchWithAuth(`${API_BASE}/apikeys`);
    if (!response.ok) throw new Error("Failed to fetch API keys");
    return response.json();
}

export async function getApiKey(id: string): Promise<ApiKeyFull> {
    const response = await fetchWithAuth(`${API_BASE}/apikeys/${id}`);
    if (!response.ok) throw new Error("Failed to fetch API key");
    return response.json();
}

export async function createApiKey(data: {
    owner: string;
    serverAddress: string;
    allowedIPAddresses?: string;
}): Promise<ApiKeyFull> {
    const response = await fetchWithAuth(`${API_BASE}/apikeys`, {
        method: "POST",
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create API key");
    return response.json();
}

export async function updateApiKey(
    id: string,
    data: {
        owner?: string;
        serverAddress?: string;
        allowedIPAddresses?: string;
        isActive?: boolean;
    },
): Promise<ApiKey> {
    const response = await fetchWithAuth(`${API_BASE}/apikeys/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update API key");
    return response.json();
}

export async function deleteApiKey(id: string): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE}/apikeys/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete API key");
}

export async function regenerateApiKey(id: string): Promise<{ key: string }> {
    const response = await fetchWithAuth(
        `${API_BASE}/apikeys/${id}/regenerate`,
        {
            method: "POST",
        },
    );
    if (!response.ok) throw new Error("Failed to regenerate API key");
    return response.json();
}

// Geolocation service
export interface GeoData {
    status: string;
    country: string;
    countryCode: string;
    region: string;
    regionName: string;
    city: string;
    zip: string;
    lat: number;
    lon: number;
    timezone: string;
    isp: string;
    org: string;
    as: string;
    query: string;
}

const geoCache: Record<string, GeoData> = {};

export async function geolocateIP(ip: string): Promise<GeoData | null> {
    // Normalize IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
    const normalizedIP = ip.replace(/^::ffff:/, "");

    if (geoCache[normalizedIP]) return geoCache[normalizedIP];
    
    // Skip private IPs using normalized value
    if (normalizedIP.startsWith("127.") || normalizedIP.startsWith("192.168.") || normalizedIP === "localhost") return null;

    try {
        // Use custom local API to avoid rate limits
        const response = await fetch(`https://gpi.api.azke.tech/${normalizedIP}`, {
            headers: {
                "X-API-Key": import.meta.env.VITE_GEO_API_KEY || ""
            }
        });
        if (!response.ok) return null;
        const data = await response.json();
        
        if (data.success) {
            const mappedData: GeoData = {
                status: "success",
                country: data.country,
                countryCode: data.country_code,
                region: data.region_code,
                regionName: data.region,
                city: data.city,
                zip: data.postal || "",
                lat: data.latitude,
                lon: data.longitude,
                timezone: data.timezone?.id || "",
                isp: data.connection?.isp || "",
                org: data.connection?.org || "",
                as: data.connection?.asn ? `AS${data.connection.asn}` : "",
                query: data.ip
            };
            geoCache[normalizedIP] = mappedData;
            return mappedData;
        }
        return null;
    } catch (err) {
        console.error(`[Geo] Failed to locate ${normalizedIP}:`, err);
        return null;
    }
}
