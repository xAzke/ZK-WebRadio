// --- Interfaces ---

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

export interface CacheFile {
    id: string;
    title: string;
    artist: string;
    cover: string;
    sizeMB: number;
    lastAccessed: string;
}

export interface RuntimeSettingsData {
    useApiKeyAuthentication: boolean | null;
    useUserAgentAuthentication: boolean | null;
    logUserAgent: boolean | null;
}

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

export interface DeezerAccount {
    id: string;
    arl: string;
    username: string;
    userId: string;
    avatarUrl: string;
    isPremium: boolean;
    isActive: boolean;
    createdAt: string;
    lastUsedAt?: string;
    requestCount: number;
}

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
    flag?: string;
}

// --- Mock Data Constants ---

export const MOCK_STATS: Stats = {
    uptime: "12d 04h 22m 15s",
    uptimeSeconds: 1052535,
    cache: {
        files: 1250,
        sizeBytes: 5242880000,
        sizeMB: 5000
    },
    requests: {
        today: { searches: 450, streams: 820 },
        total: { searches: 12500, streams: 45000 }
    },
    topApiKeys: [
        { name: "Production-Main", requests: 15200 },
        { name: "Dev-Testing", requests: 4500 },
        { name: "Mobile-App-Alpha", requests: 3200 },
        { name: "Web-Dashboard-Internal", requests: 1200 },
        { name: "Legacy-Support", requests: 850 }
    ],
    topIPs: [
        { name: "192.168.1.1", requests: 1200 },
        { name: "45.78.12.34", requests: 850 },
        { name: "128.0.0.1", requests: 500 },
        { name: "8.8.8.8", requests: 320 },
        { name: "1.1.1.1", requests: 210 }
    ],
    topUserAgents: [
        { name: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ZK-Client/2.4", requests: 8500 },
        { name: "PostmanRuntime/7.26.8", requests: 1200 },
        { name: "curl/7.68.0", requests: 450 }
    ],
    topTracks: [
        { name: "Never Gonna Give You Up - Rick Astley", requests: 1200 },
        { name: "Blinding Lights - The Weeknd", requests: 950 },
        { name: "Stay - The Kid LAROI & Justin Bieber", requests: 820 },
        { name: "Heat Waves - Glass Animals", requests: 740 },
        { name: "Save Your Tears - The Weeknd", requests: 690 }
    ],
    totalFailures: 42,
    failureRatio: 0.05,
    timestamp: new Date().toISOString()
};

export const MOCK_CACHE_FILES: CacheFile[] = [
    { id: "1", title: "Never Gonna Give You Up", artist: "Rick Astley", cover: "https://i.scdn.co/image/ab67616d0000b2735755e164993798e0c9fe7d6a", sizeMB: 3.5, lastAccessed: new Date().toISOString() },
    { id: "2", title: "Blinding Lights", artist: "The Weeknd", cover: "https://i.scdn.co/image/ab67616d0000b273c56491a133f67f6517a6c0b6", sizeMB: 4.2, lastAccessed: new Date().toISOString() },
    { id: "3", title: "Stay", artist: "The Kid LAROI", cover: "https://i.scdn.co/image/ab67616d0000b27341e31f0641102f141b2123f1", sizeMB: 2.8, lastAccessed: new Date().toISOString() },
    { id: "4", title: "Heat Waves", artist: "Glass Animals", cover: "https://i.scdn.co/image/ab67616d0000b2739401777a83701264c7f0744c", sizeMB: 3.9, lastAccessed: new Date().toISOString() },
    { id: "5", title: "Save Your Tears", artist: "The Weeknd", cover: "https://i.scdn.co/image/ab67616d0000b2738d933393459b794939281788", sizeMB: 4.0, lastAccessed: new Date().toISOString() }
];

export const MOCK_SETTINGS: RuntimeSettingsData = {
    useApiKeyAuthentication: true,
    useUserAgentAuthentication: false,
    logUserAgent: true
};

export const MOCK_TRACKS: Track[] = [
    { trackId: "1", title: "Never Gonna Give You Up", artist: "Rick Astley", albumCover: "https://i.scdn.co/image/ab67616d0000b2735755e164993798e0c9fe7d6a", playCount: 1200, failureCount: 5 },
    { trackId: "2", title: "Blinding Lights", artist: "The Weeknd", albumCover: "https://i.scdn.co/image/ab67616d0000b273c56491a133f67f6517a6c0b6", playCount: 950, failureCount: 2 },
    { trackId: "3", title: "Stay", artist: "The Kid LAROI", albumCover: "https://i.scdn.co/image/ab67616d0000b27341e31f0641102f141b2123f1", playCount: 820, failureCount: 12 },
    { trackId: "4", title: "Heat Waves", artist: "Glass Animals", albumCover: "https://i.scdn.co/image/ab67616d0000b2739401777a83701264c7f0744c", playCount: 740, failureCount: 3 },
    { trackId: "5", title: "Save Your Tears", artist: "The Weeknd", albumCover: "https://i.scdn.co/image/ab67616d0000b2738d933393459b794939281788", playCount: 690, failureCount: 1 }
];

export const MOCK_FAILURES: FailureTrack[] = [
    { trackId: "6", title: "Broken Connection", artist: "The Glitch", albumCover: "https://i.scdn.co/image/ab67616d0000b2739401777a83701264c7f0744c", playCount: 10, failureCount: 8, failureRatio: 0.8 },
    { trackId: "7", title: "Timeout Track", artist: "Latency", albumCover: "https://i.scdn.co/image/ab67616d0000b2738d933393459b794939281788", playCount: 15, failureCount: 9, failureRatio: 0.6 },
    { trackId: "8", title: "404 Rhythm", artist: "Missing", albumCover: "https://i.scdn.co/image/ab67616d0000b273c56491a133f67f6517a6c0b6", playCount: 20, failureCount: 10, failureRatio: 0.5 }
];

export const MOCK_API_KEYS: ApiKey[] = [
    { id: "1", owner: "Diego (Admin)", keyPreview: "zk_...a1b2", serverAddress: "https://radio.azke.tech", allowedIPAddresses: "*", isActive: true, createdAt: new Date(Date.now() - 1000000).toISOString(), lastUsedAt: new Date().toISOString() },
    { id: "2", owner: "Mobile Client", keyPreview: "zk_...c3d4", serverAddress: "https://api.radio.app", allowedIPAddresses: "45.78.12.34", isActive: true, createdAt: new Date(Date.now() - 5000000).toISOString(), lastUsedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "3", owner: "Testing Key", keyPreview: "zk_...e5f6", serverAddress: "http://localhost:3000", allowedIPAddresses: "127.0.0.1", isActive: false, createdAt: new Date(Date.now() - 10000000).toISOString() }
];

export const MOCK_DEEZER_ACCOUNTS: DeezerAccount[] = [
    { id: "1", arl: "arl_mock_1", username: "DiegoPremium", userId: "394920068", avatarUrl: "https://e-cdns-images.dzcdn.net/images/user/e3952f4185610815456f91ad1b26f555/120x120-000000-80-0-0.jpg", isPremium: true, isActive: true, createdAt: new Date(Date.now() - 1000000).toISOString(), lastUsedAt: new Date().toISOString(), requestCount: 145 },
    { id: "2", arl: "arl_mock_2", username: "GratuitoUser", userId: "924386210", avatarUrl: "", isPremium: false, isActive: false, createdAt: new Date(Date.now() - 5000000).toISOString(), lastUsedAt: new Date(Date.now() - 3600000).toISOString(), requestCount: 22 }
];

export const MOCK_GEO: Record<string, GeoData> = {
    "45.78.12.34": {
        status: "success",
        country: "United States",
        countryCode: "US",
        region: "NY",
        regionName: "New York",
        city: "New York",
        zip: "10001",
        lat: 40.7128,
        lon: -74.006,
        timezone: "America/New_York",
        isp: "DigitalOcean",
        org: "DigitalOcean",
        as: "AS14061 DigitalOcean, LLC",
        query: "45.78.12.34"
    },
    "128.0.0.1": {
        status: "success",
        country: "United Kingdom",
        countryCode: "GB",
        region: "ENG",
        regionName: "London",
        city: "London",
        zip: "EC1A 1BB",
        lat: 51.5074,
        lon: -0.1278,
        timezone: "Europe/London",
        isp: "British Telecom",
        org: "BT",
        as: "AS613 BT",
        query: "128.0.0.1"
    }
};
