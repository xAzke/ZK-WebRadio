import { useState, useEffect, useCallback, memo } from "react";
import {
    Activity,
    Search,
    Radio,
    HardDrive,
    Clock,
    RefreshCw,
    LogOut,
    Users,
    AlertTriangle,
    Wrench,
    LayoutDashboard,
    Key,
    Sliders,
    ChevronRight,
    ChevronsUpDown,
    BadgeCheck,
    Bell,
    CreditCard,
    Sparkles,
    Shield,
    Database,
    Binary,
    Globe,
} from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { TopTracks } from "@/components/TopTracks";
import { TopFailures } from "@/components/TopFailures";
import { ApiKeysTable } from "@/components/ApiKeysTable";
import { LoginForm } from "@/components/LoginForm";
import { TrafficView } from "@/components/TrafficView";
import { CacheBrowser } from "@/components/CacheBrowser";
import { Button } from "@/components/ui/button";
import { ToastProvider, useToast, ConfirmDialog } from "@/components/ui/toast";
import { AuthError } from "@/components/AuthError";
import { supabase } from "@/lib/supabase";
import { BlurFade } from "@/components/magicui/blur-fade";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    getStats,
    getTopTracks,
    getTopFailures,
    getApiKeys,
    createApiKey,
    deleteApiKey,
    regenerateApiKey,
    updateApiKey,
    resetFailures,
    fixUnknownTracks,
    getSettings,
    updateSettings,
    type Stats,
    type Track,
    type FailureTrack,
    type ApiKey,
    type RuntimeSettingsData,
} from "@/services/api";
import "./index.css";
import type { Session } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

// --- Memoized Sub-Components for Performance ---

const MemoizedStatsCard = memo(StatsCard);
const MemoizedTopTracks = memo(TopTracks);
const MemoizedTopFailures = memo(TopFailures);

const Sidebar = memo(({ 
    activeTab, 
    setActiveTab, 
    user, 
    handleLogout 
}: { 
    activeTab: string, 
    setActiveTab: (t: Tab) => void, 
    user: any, 
    handleLogout: () => void 
}) => {
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0];
    const userAvatar = user?.user_metadata?.avatar_url;

    return (
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-[#0a0a0c] z-50 flex flex-col h-screen overflow-hidden shrink-0">
            <div className="p-6 space-y-8 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                        <Radio className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tighter uppercase leading-none text-white/90">
                            Web<span className="text-primary">Radio</span>
                        </h1>
                        <p className="text-[8px] font-semibold text-white/20 uppercase tracking-widest mt-1">Admin v2.4</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar">
                <nav className="space-y-1">
                    {[
                        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                        { id: "traffic", label: "Network Traffic", icon: Globe },
                        { id: "apikeys", label: "API Control", icon: Key },
                        { id: "settings", label: "Settings", icon: Sliders },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all group",
                                activeTab === tab.id
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]"
                                    : "text-white/30 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon className={cn("w-4 h-4 transition-colors", activeTab === tab.id ? "text-primary" : "text-white/20 group-hover:text-white/50")} />
                            {tab.label}
                            {activeTab === tab.id && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-6 border-t border-white/5 bg-white/[0.01] flex-shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="w-full flex items-center gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all text-left group">
                            <div className="relative">
                                <Avatar className="h-9 w-9 rounded-xl border border-white/10">
                                    <AvatarImage src={userAvatar} alt={userName} />
                                    <AvatarFallback className="rounded-xl bg-white/5 text-[10px] font-bold">
                                        {userName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -right-0.5 -bottom-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0c]" />
                            </div>
                            <div className="grid flex-1 text-sm leading-tight min-w-0">
                                <span className="truncate font-semibold uppercase text-[10px] text-white/90">{userName}</span>
                                <span className="truncate text-[8px] font-medium text-white/30 uppercase tracking-tighter">Authorized Op</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 rounded-xl border-white/5 bg-[#0f0f12] text-white backdrop-blur-xl"
                        side="right"
                        align="end"
                        sideOffset={8}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={userAvatar} alt={userName} />
                                    <AvatarFallback className="rounded-lg bg-white/5 text-[10px] font-bold">
                                        {userName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-xs leading-tight">
                                    <span className="truncate font-semibold text-white/90 uppercase text-[10px]">{userName}</span>
                                    <span className="truncate text-[8px] text-white/30 uppercase font-mono tracking-tighter">
                                        ID: {user?.id.substring(0, 8)}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="text-[10px] font-semibold uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors">
                                <Sparkles className="size-3 text-primary" />
                                System Perks
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="text-[10px] font-semibold uppercase tracking-widest focus:bg-white/5 transition-colors">
                                <BadgeCheck className="size-3 text-white/40" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] font-semibold uppercase tracking-widest focus:bg-white/5 transition-colors">
                                <CreditCard className="size-3 text-white/40" />
                                Access Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] font-semibold uppercase tracking-widest focus:bg-white/5 transition-colors">
                                <Bell className="size-3 text-white/40" />
                                Alerts
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem 
                            onClick={handleLogout}
                            className="text-[10px] font-semibold uppercase tracking-widest focus:bg-red-500/10 focus:text-red-400 transition-colors text-red-400/80"
                        >
                            <LogOut className="size-3" />
                            Terminate Session
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
});

// --- Main App Logic ---

type Tab = "dashboard" | "traffic" | "apikeys" | "settings";

interface ConfirmState {
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
}

function AppContent() {
    const [session, setSession] = useState<Session | null>(null);
    const [isPending, setIsPending] = useState(true);
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>("dashboard");
    const [stats, setStats] = useState<Stats | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [failures, setFailures] = useState<FailureTrack[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [autoRefresh] = useState(false);
    const [cacheBrowserOpen, setCacheBrowserOpen] = useState(false);
    const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsData | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        open: false, title: "", description: "", confirmText: "Confirmar", variant: "default", onConfirm: () => {},
    });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsPending(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    const user = session?.user;
    const isAuthenticated = !!user;

    const closeConfirm = () => setConfirmState((prev) => ({ ...prev, open: false }));

    const fetchData = useCallback(
        async (background = false) => {
            if (!isAuthenticated) return;
            if (!background) setIsLoading(true);
            setIsRefreshing(true);
            try {
                const [statsData, tracksData, failuresData, keysData] = await Promise.all([
                    getStats(), getTopTracks(10), getTopFailures(10), getApiKeys(),
                ]);
                setStats(statsData);
                setTracks(tracksData);
                setFailures(failuresData);
                setApiKeys(keysData);
                setLastUpdate(new Date());
            } catch (error) {
                console.error("Error fetching data:", error);
                if (!background) {
                    addToast({ type: "error", title: "System Sync Failed", description: "Could not retrieve real-time data from the relay." });
                }
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [isAuthenticated, addToast],
    );

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
            getSettings().then(setRuntimeSettings).catch(console.error);
        }
    }, [isAuthenticated, fetchData]);

    useEffect(() => {
        if (isAuthenticated && autoRefresh) {
            const interval = setInterval(() => fetchData(true), 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, autoRefresh, fetchData]);

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        setStats(null);
        setTracks([]);
        setApiKeys([]);
    }, []);

    const handleCreateApiKey = async (data: { owner: string; serverAddress: string; allowedIPAddresses?: string; }) => {
        try {
            const newKey = await createApiKey(data);
            setApiKeys((prev) => [...prev, { ...newKey, keyPreview: newKey.key.substring(0, 8) + "..." }]);
            addToast({ type: "success", title: "API Key Generated", copyText: newKey.key });
        } catch {
            addToast({ type: "error", title: "Generation Failed" });
        }
    };

    const handleDeleteApiKey = async (id: string) => {
        const key = apiKeys.find((k) => k.id === id);
        setConfirmState({
            open: true, title: "Decommission API Key", description: `Permanently delete credentials for "${key?.owner}"?`,
            confirmText: "Delete", variant: "destructive",
            onConfirm: async () => {
                closeConfirm();
                try {
                    await deleteApiKey(id);
                    setApiKeys((prev) => prev.filter((k) => k.id !== id));
                    addToast({ type: "success", title: "Key Deleted" });
                } catch {
                    addToast({ type: "error", title: "Action Failed" });
                }
            },
        });
    };

    const handleRegenerateApiKey = async (id: string) => {
        const key = apiKeys.find((k) => k.id === id);
        setConfirmState({
            open: true, title: "Cycle API Credentials", description: `Invalidate current key and generate a new secret for "${key?.owner}"?`,
            confirmText: "Regenerate", variant: "default",
            onConfirm: async () => {
                closeConfirm();
                try {
                    const result = await regenerateApiKey(id);
                    setApiKeys((prev) => prev.map((k) => k.id === id ? { ...k, keyPreview: result.key.substring(0, 8) + "..." } : k,
                        ),
                    );
                    addToast({ type: "success", title: "Key Rotated", copyText: result.key });
                } catch {
                    addToast({ type: "error", title: "Rotation Failed" });
                }
            },
        });
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            await updateApiKey(id, { isActive });
            setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive } : k)));
        } catch {
            addToast({ type: "error", title: "Toggle Failed" });
        }
    };

    const handleUpdateApiKey = async (id: string, data: Partial<ApiKey>) => {
        try {
            const updated = await updateApiKey(id, data);
            setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, ...updated } : k)));
            addToast({ type: "success", title: "Key Updated" });
        } catch {
            addToast({ type: "error", title: "Update Failed" });
        }
    };

    const handleResetFailures = useCallback(() => {
        setConfirmState({
            open: true, title: "Clear Logs", description: "Reset all failure counters to zero?",
            confirmText: "Clear", variant: "destructive",
            onConfirm: async () => {
                closeConfirm();
                try {
                    await resetFailures();
                    await fetchData();
                    addToast({ type: "success", title: "Counters Purged" });
                } catch {
                    addToast({ type: "error", title: "Purge Failed" });
                }
            },
        });
    }, [fetchData]);

    const handleFixUnknown = useCallback(() => {
        setConfirmState({
            open: true, title: "Repair Metadata", description: "Synchronize with Deezer API to correct unknown tracks?",
            confirmText: "Execute", variant: "default",
            onConfirm: async () => {
                closeConfirm();
                try {
                    const result = await fixUnknownTracks();
                    await fetchData();
                    addToast({ type: "success", title: "Metadata Repaired", description: result.message });
                } catch {
                    addToast({ type: "error", title: "Repair Failed" });
                }
            },
        });
    }, [fetchData]);

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
                <div className="relative flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-t-2 border-primary rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.2)]" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/20 animate-pulse">Initializing System</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return <LoginForm />;

    return (
        <div className="h-screen w-screen bg-[#060608] text-white selection:bg-primary/30 overflow-hidden flex flex-col md:flex-row">
            <ConfirmDialog open={confirmState.open} title={confirmState.title} description={confirmState.description} confirmText={confirmState.confirmText} variant={confirmState.variant} onConfirm={confirmState.onConfirm} onCancel={closeConfirm} />
            
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} handleLogout={handleLogout} />

            <main className="flex-1 h-screen overflow-hidden flex flex-col relative">
                {/* Hardware-Accelerated Ambient Glows */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden translate-z-0">
                    <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_70%)] rounded-full" />
                    <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(37,99,235,0.04)_0%,transparent_70%)] rounded-full" />
                </div>
                
                <header className="flex-shrink-0 z-40 bg-[#060608]/95 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-white/20 uppercase tracking-widest mb-0.5">
                            <span>System</span> <ChevronRight className="w-3 h-3" /> <span className="text-white/40">{activeTab}</span>
                        </div>
                        <h2 className="text-xl font-bold uppercase tracking-tight">
                            {activeTab === 'dashboard' ? 'Operational Overview' : activeTab === 'traffic' ? 'Network Intelligence' : activeTab === 'apikeys' ? 'Credential Management' : 'System Configuration'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-semibold uppercase tracking-tighter text-white/40">Status: Nominal</span>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={isLoading || isRefreshing} className="w-10 h-10 rounded-xl bg-white/5 border-white/5 hover:bg-white/10">
                            <RefreshCw className={cn("w-4 h-4", (isLoading || isRefreshing) && "animate-spin")} />
                        </Button>
                    </div>
                </header>

                {/* Layer-Promoted Scrollable Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 translate-z-0 will-change-scroll">
                    <div className="p-6 max-w-[1600px] mx-auto">
                        {activeTab === "dashboard" ? (
                            <div className="space-y-6">
                                {/* Bento Grid Layout */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    {/* Stats Group */}
                                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        <BlurFade delay={0.05} className="h-full">
                                            <MemoizedStatsCard 
                                                title="Uptime" 
                                                value={stats?.uptime || "0s"} 
                                                subtitle="Current Session Active"
                                                icon={Clock} 
                                                iconColor="text-emerald-400" 
                                                className="h-full"
                                            />
                                        </BlurFade>
                                        <BlurFade delay={0.1} className="h-full">
                                            <MemoizedStatsCard 
                                                title="Searches" 
                                                value={stats?.requests.today.searches || 0} 
                                                subtitle={`Total: ${stats?.requests.total.searches || 0}`} 
                                                icon={Search} 
                                                iconColor="text-blue-400" 
                                                className="h-full"
                                            />
                                        </BlurFade>
                                        <BlurFade delay={0.15} className="h-full">
                                            <MemoizedStatsCard 
                                                title="Streams" 
                                                value={stats?.requests.today.streams || 0} 
                                                subtitle={`Total: ${stats?.requests.total.streams || 0}`} 
                                                icon={Activity} 
                                                iconColor="text-purple-400" 
                                                className="h-full"
                                            />
                                        </BlurFade>
                                    </div>

                                    {/* Cache Info */}
                                    <div className="md:col-span-4">
                                        <BlurFade delay={0.2} className="h-full">
                                            <MemoizedStatsCard 
                                                title="Cache Storage" 
                                                value={`${stats?.cache.files || 0} OBJ`} 
                                                subtitle={`${stats?.cache.sizeMB || 0} MB Utilized`} 
                                                icon={HardDrive} 
                                                iconColor="text-orange-400"
                                                secondaryAction={{ label: "Manage", onClick: () => setCacheBrowserOpen(true) }}
                                                className="h-full"
                                            />
                                        </BlurFade>
                                    </div>

                                    {/* Main Data Section */}
                                    <div className="md:col-span-8">
                                        <BlurFade delay={0.25}><MemoizedTopTracks tracks={tracks} isLoading={isLoading} /></BlurFade>
                                    </div>

                                    <div className="md:col-span-4 space-y-6 flex flex-col">
                                        {/* Top API Keys Card */}
                                        <BlurFade delay={0.3} className="flex-1">
                                            <div className="h-full relative overflow-hidden rounded-2xl border border-white/5 bg-[#121216]/95 p-6 flex flex-col">
                                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center gap-2">
                                                    <Users className="w-3 h-3 text-primary" /> Active Consumers
                                                </h3>
                                                <div className="space-y-2 flex-1 font-mono">
                                                    {stats?.topApiKeys?.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/20 group-hover:text-primary transition-colors">{(i+1)}</div>
                                                                <span className="text-xs font-semibold text-white/70">{item.name}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs font-bold text-primary">{item.requests}</span>
                                                                <span className="text-[8px] font-medium text-white/10 ml-1">REQ</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!stats?.topApiKeys || stats.topApiKeys.length === 0) && (
                                                    <div className="h-full flex flex-col items-center justify-center py-12 opacity-20">
                                                        <Users className="w-8 h-8 mb-2" />
                                                        <p className="text-[8px] font-bold uppercase tracking-widest">No Active Sessions</p>
                                                    </div>
                                                    )}
                                                </div>
                                            </div>
                                        </BlurFade>

                                        <BlurFade delay={0.35}>
                                            <MemoizedStatsCard 
                                                title="Error Log" 
                                                value={stats?.totalFailures || 0} 
                                                subtitle={`${stats?.failureRatio || 0}% failure rate`} 
                                                icon={AlertTriangle} 
                                                iconColor="text-red-400"
                                                action={(stats?.totalFailures || 0) > 0 ? { label: "Purge Logs", onClick: handleResetFailures } : undefined}
                                            />
                                        </BlurFade>
                                    </div>

                                    {/* Full Width Failures on Dashboard */}
                                    <div className="md:col-span-12">
                                        <BlurFade delay={0.4}><MemoizedTopFailures failures={failures} isLoading={isLoading} /></BlurFade>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === "traffic" ? (
                            <TrafficView ips={stats?.topIPs || []} isLoading={isLoading} />
                        ) : activeTab === "apikeys" ? (
                            <BlurFade delay={0.05} className="max-w-5xl mx-auto">
                                <ApiKeysTable 
                                    apiKeys={apiKeys} 
                                    isLoading={isLoading} 
                                    onCreate={handleCreateApiKey} 
                                    onDelete={handleDeleteApiKey} 
                                    onRegenerate={handleRegenerateApiKey} 
                                    onUpdate={handleUpdateApiKey}
                                    onToggleActive={handleToggleActive} 
                                />
                            </BlurFade>
                        ) : (
                            <div className="max-w-4xl mx-auto space-y-10">
                                <BlurFade delay={0.05}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                <Sliders className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Runtime Parameters</h3>
                                                <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest mt-1">Temporary memory-only state</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { key: "useApiKeyAuthentication" as const, label: "API Validation", desc: "Mandatory key verification", icon: Shield },
                                            { key: "useUserAgentAuthentication" as const, label: "Client Filter", desc: "Restrict to known agents", icon: Binary },
                                            { key: "logUserAgent" as const, label: "Audit Logging", desc: "Log system identifiers", icon: Database },
                                        ].map(({ key, label, desc, icon: Icon }) => (
                                            <div key={key} className="relative group p-6 rounded-[2rem] bg-[#121216]/95 border border-white/5 hover:border-primary/30 transition-all duration-300">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-500">
                                                        <Icon className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const newVal = !(runtimeSettings?.[key] ?? true);
                                                            try {
                                                                const result = await updateSettings({ [key]: newVal });
                                                                setRuntimeSettings(result);
                                                                addToast({ type: "success", title: "Parameter Updated" });
                                                            } catch {
                                                                addToast({ type: "error", title: "Update Failed" });
                                                            }
                                                        }}
                                                        className={cn(
                                                            "w-11 h-6 rounded-full transition-all relative border border-white/5",
                                                            (runtimeSettings?.[key] ?? true) ? "bg-primary border-primary/20" : "bg-black/60"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow-lg transition-all duration-300",
                                                            (runtimeSettings?.[key] ?? true) ? "left-6" : "left-1"
                                                        )} />
                                                    </button>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-white/80">{label}</span>
                                                    <p className="text-[9px] font-medium text-white/20 uppercase tracking-widest leading-relaxed">{desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </BlurFade>

                                <BlurFade delay={0.1}>
                                    <div className="relative group rounded-2xl border border-red-500/10 bg-[#0a0a0c] p-6 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.01] blur-3xl rounded-full" />
                                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-red-500/5 flex items-center justify-center border border-red-500/10">
                                                    <Wrench className="w-5 h-5 text-red-400/60" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold uppercase tracking-widest text-red-400/80">Critical Maintenance</h3>
                                                    <p className="text-[9px] font-medium text-white/20 uppercase tracking-tighter mt-0.5">Metadata synchronization sequence</p>
                                                </div>
                                            </div>
                                            
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={handleFixUnknown} 
                                                className="bg-red-500/5 border-red-500/10 hover:bg-red-500/10 text-red-400/70 text-[9px] font-bold uppercase tracking-widest h-9 px-6 rounded-xl transition-all"
                                            >
                                                Execute Repair
                                            </Button>
                                        </div>
                                    </div>
                                </BlurFade>
                            </div>
                        )}

                        {lastUpdate && (
                            <div className="mt-16 pb-8 flex flex-col items-center opacity-20">
                                <div className="h-px w-32 bg-gradient-to-r from-transparent via-white to-transparent mb-4" />
                                <p className="text-[8px] font-mono font-medium uppercase tracking-[0.5em]">Last Encryption Sync: {lastUpdate.toLocaleTimeString()}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <CacheBrowser open={cacheBrowserOpen} onClose={() => setCacheBrowserOpen(false)} />
        </div>
    );
}

function App() {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorType = params.get("error") || hashParams.get("error");
    if (errorType || window.location.pathname === "/auth-error") return <AuthError type="generic" />;
    return ( <ToastProvider> <AppContent /> </ToastProvider> );
}

export default App;
