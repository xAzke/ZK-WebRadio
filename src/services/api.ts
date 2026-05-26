import { supabase } from "@/lib/supabase";
import * as mock from "./mockData";

// Re-export types from mockData to maintain API compatibility
export type { 
    Stats, 
    CacheFile, 
    RuntimeSettingsData, 
    Track, 
    FailureTrack, 
    ApiKey, 
    ApiKeyFull, 
    DeezerAccount,
    GeoData 
} from "./mockData";

const API_BASE = import.meta.env.VITE_API_URL || "/admin";
export const USE_MOCK = false; // Toggle this for design/testing

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
export async function getStats(): Promise<mock.Stats> {
    if (USE_MOCK) return mock.MOCK_STATS;
    const response = await fetchWithAuth(`${API_BASE}/stats`);
    if (!response.ok) throw new Error("Failed to fetch stats");
    return response.json();
}

export async function resetFailures(): Promise<void> {
    if (USE_MOCK) return;
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
    if (USE_MOCK) return { message: "Mock fix successful", fixed_count: 5, total: 10 };
    const response = await fetchWithAuth(`${API_BASE}/tracks/fix-unknown`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to fix unknown tracks");
    return response.json();
}

// Cache API
export async function getCacheFiles(search?: string): Promise<mock.CacheFile[]> {
    if (USE_MOCK) {
        if (!search) return mock.MOCK_CACHE_FILES;
        return mock.MOCK_CACHE_FILES.filter(f => 
            f.title.toLowerCase().includes(search.toLowerCase()) || 
            f.artist.toLowerCase().includes(search.toLowerCase())
        );
    }
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await fetchWithAuth(`${API_BASE}/cache/files${params}`);
    if (!response.ok) throw new Error("Failed to fetch cache files");
    const data = await response.json();
    return data.files;
}

export async function getCachePlayUrl(trackId: string): Promise<string> {
    if (USE_MOCK) return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    const response = await fetchWithAuth(`${API_BASE}/cache/play/${trackId}`);
    if (!response.ok) throw new Error("Failed to fetch audio");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

// Runtime Settings API
export async function getSettings(): Promise<mock.RuntimeSettingsData> {
    if (USE_MOCK) return mock.MOCK_SETTINGS;
    const response = await fetchWithAuth(`${API_BASE}/settings`);
    if (!response.ok) throw new Error("Failed to fetch settings");
    return response.json();
}

export async function updateSettings(
    settings: Partial<mock.RuntimeSettingsData>,
): Promise<mock.RuntimeSettingsData> {
    if (USE_MOCK) return { ...mock.MOCK_SETTINGS, ...settings };
    const response = await fetchWithAuth(`${API_BASE}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error("Failed to update settings");
    return response.json();
}

// Top Tracks API
export async function getTopTracks(limit = 10): Promise<mock.Track[]> {
    if (USE_MOCK) return mock.MOCK_TRACKS.slice(0, limit);
    const response = await fetchWithAuth(
        `${API_BASE}/tracks/top?limit=${limit}`,
    );
    if (!response.ok) throw new Error("Failed to fetch top tracks");
    return response.json();
}

export async function getTopFailures(limit = 10): Promise<mock.FailureTrack[]> {
    if (USE_MOCK) return mock.MOCK_FAILURES.slice(0, limit);
    const response = await fetchWithAuth(
        `${API_BASE}/tracks/top-failures?limit=${limit}`,
    );
    if (!response.ok) throw new Error("Failed to fetch top failures");
    return response.json();
}

// API Keys API
export async function getApiKeys(): Promise<mock.ApiKey[]> {
    if (USE_MOCK) return mock.MOCK_API_KEYS;
    const response = await fetchWithAuth(`${API_BASE}/apikeys`);
    if (!response.ok) throw new Error("Failed to fetch API keys");
    return response.json();
}

export async function getApiKey(id: string): Promise<mock.ApiKeyFull> {
    if (USE_MOCK) {
        const key = mock.MOCK_API_KEYS.find(k => k.id === id);
        if (!key) throw new Error("Not found");
        return { ...key, key: "zk_mock_full_key_12345678" };
    }
    const response = await fetchWithAuth(`${API_BASE}/apikeys/${id}`);
    if (!response.ok) throw new Error("Failed to fetch API key");
    return response.json();
}

export async function createApiKey(data: {
    owner: string;
    serverAddress: string;
    allowedIPAddresses?: string;
}): Promise<mock.ApiKeyFull> {
    if (USE_MOCK) {
        return {
            id: Math.random().toString(36).substr(2, 9),
            owner: data.owner,
            serverAddress: data.serverAddress,
            allowedIPAddresses: data.allowedIPAddresses || "*",
            isActive: true,
            createdAt: new Date().toISOString(),
            key: "zk_" + Math.random().toString(36).substr(2, 16)
        };
    }
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
): Promise<mock.ApiKey> {
    if (USE_MOCK) {
        const key = mock.MOCK_API_KEYS.find(k => k.id === id);
        if (!key) throw new Error("Not found");
        return { ...key, ...data };
    }
    const response = await fetchWithAuth(`${API_BASE}/apikeys/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update API key");
    return response.json();
}

export async function deleteApiKey(id: string): Promise<void> {
    if (USE_MOCK) return;
    const response = await fetchWithAuth(`${API_BASE}/apikeys/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete API key");
}

export async function regenerateApiKey(id: string): Promise<{ key: string }> {
    if (USE_MOCK) return { key: "zk_" + Math.random().toString(36).substr(2, 16) };
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
const geoCache: Record<string, mock.GeoData> = {};

export async function geolocateIP(ip: string): Promise<mock.GeoData | null> {
    // Normalize IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
    const normalizedIP = ip.replace(/^::ffff:/, "");

    if (USE_MOCK && mock.MOCK_GEO[normalizedIP]) return mock.MOCK_GEO[normalizedIP];
    if (geoCache[normalizedIP]) return geoCache[normalizedIP];
    
    // Skip private IPs using normalized value
    if (normalizedIP.startsWith("127.") || normalizedIP.startsWith("192.168.") || normalizedIP === "localhost") return null;

    try {
        // Use custom local API to avoid rate limits (Corrected endpoint)
        const response = await fetch(`https://gip.api.azke.tech/v1/lookup/${normalizedIP}`, {
            headers: {
                "X-API-Key": import.meta.env.VITE_GEO_API_KEY || ""
            }
        });
        if (!response.ok) return null;
        const data = await response.json();
        
        if (data.success) {
            const mappedData: mock.GeoData = {
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
                query: data.ip,
                flag: data.flag?.img
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

// Deezer Accounts API
export async function getDeezerAccounts(): Promise<mock.DeezerAccount[]> {
    if (USE_MOCK) return mock.MOCK_DEEZER_ACCOUNTS;
    const response = await fetchWithAuth(`${API_BASE}/deezer-accounts`);
    if (!response.ok) throw new Error("Failed to fetch Deezer accounts");
    return response.json();
}

export async function createDeezerAccount(data: { arl: string }): Promise<mock.DeezerAccount> {
    if (USE_MOCK) {
        const mockAccount: mock.DeezerAccount = {
            id: Math.random().toString(36).substr(2, 9),
            arl: data.arl,
            username: "MockUser" + Math.floor(Math.random() * 100),
            userId: Math.floor(Math.random() * 10000000).toString(),
            avatarUrl: "",
            isPremium: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            requestCount: 0
        };
        mock.MOCK_DEEZER_ACCOUNTS.push(mockAccount);
        return mockAccount;
    }
    const response = await fetchWithAuth(`${API_BASE}/deezer-accounts`, {
        method: "POST",
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create Deezer account");
    }
    return response.json();
}

export async function updateDeezerAccount(
    id: string,
    data: {
        isActive?: boolean;
    },
): Promise<void> {
    if (USE_MOCK) {
        const account = mock.MOCK_DEEZER_ACCOUNTS.find(a => a.id === id);
        if (account) {
            if (data.isActive !== undefined) account.isActive = data.isActive;
        }
        return;
    }
    const response = await fetchWithAuth(`${API_BASE}/deezer-accounts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update Deezer account");
}

export async function deleteDeezerAccount(id: string): Promise<void> {
    if (USE_MOCK) {
        const idx = mock.MOCK_DEEZER_ACCOUNTS.findIndex(a => a.id === id);
        if (idx !== -1) mock.MOCK_DEEZER_ACCOUNTS.splice(idx, 1);
        return;
    }
    const response = await fetchWithAuth(`${API_BASE}/deezer-accounts/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete Deezer account");
}

export async function refreshDeezerAccount(id: string): Promise<{ success: boolean; account?: mock.DeezerAccount; message?: string }> {
    if (USE_MOCK) {
        const account = mock.MOCK_DEEZER_ACCOUNTS.find(a => a.id === id);
        if (account) {
            account.isActive = true;
            account.lastUsedAt = new Date().toISOString();
        }
        return { success: true, account };
    }
    const response = await fetchWithAuth(`${API_BASE}/deezer-accounts/${id}/refresh`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to refresh Deezer account");
    return response.json();
}
