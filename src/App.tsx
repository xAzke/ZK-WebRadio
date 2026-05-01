import { useState, useEffect, useCallback } from "react";
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
    Settings,
    Wrench,
} from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { TopTracks } from "@/components/TopTracks";
import { TopFailures } from "@/components/TopFailures";
import { TopIPs } from "@/components/TopIPs";
import { ApiKeysTable } from "@/components/ApiKeysTable";
import { LoginForm } from "@/components/LoginForm";
import { CacheBrowser } from "@/components/CacheBrowser";
import { Button } from "@/components/ui/button";
import { ToastProvider, useToast, ConfirmDialog } from "@/components/ui/toast";
import { AuthError } from "@/components/AuthError";
import { supabase } from "@/lib/supabase";
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
import { Session, User } from "@supabase/supabase-js";

type Tab = "dashboard" | "apikeys" | "settings";

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
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [cacheBrowserOpen, setCacheBrowserOpen] = useState(false);
    const [runtimeSettings, setRuntimeSettings] =
        useState<RuntimeSettingsData | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        open: false,
        title: "",
        description: "",
        confirmText: "Confirmar",
        variant: "default",
        onConfirm: () => {},
    });

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsPending(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const user = session?.user;
    const isAuthenticated = !!user;

    const closeConfirm = () =>
        setConfirmState((prev) => ({ ...prev, open: false }));

    const fetchData = useCallback(
        async (background = false) => {
            if (!isAuthenticated) return;

            if (!background) {
                setIsLoading(true);
            }
            setIsRefreshing(true);
            try {
                const [statsData, tracksData, failuresData, keysData] =
                    await Promise.all([
                        getStats(),
                        getTopTracks(10),
                        getTopFailures(10),
                        getApiKeys(),
                    ]);

                setStats(statsData);
                setTracks(tracksData);
                setFailures(failuresData);
                setApiKeys(keysData);
                setLastUpdate(new Date());
            } catch (error) {
                console.error("Error fetching data:", error);
                if (!background) {
                    addToast({
                        type: "error",
                        title: "Error al cargar datos",
                        description:
                            "No se pudieron obtener las estadísticas del servidor",
                    });
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setStats(null);
        setTracks([]);
        setApiKeys([]);
    };

    const handleCreateApiKey = async (data: {
        owner: string;
        serverAddress: string;
        allowedIPAddresses?: string;
    }) => {
        try {
            const newKey = await createApiKey(data);
            setApiKeys((prev) => [
                ...prev,
                {
                    ...newKey,
                    keyPreview: newKey.key.substring(0, 8) + "...",
                },
            ]);
            addToast({
                type: "success",
                title: "✅ API Key Creada",
                description: `Key para "${data.owner}" creada exitosamente. ¡Guárdala, no se mostrará de nuevo!`,
                copyText: newKey.key,
            });
        } catch (error) {
            console.error("Error creating API key:", error);
            addToast({
                type: "error",
                title: "Error al crear API Key",
                description: "No se pudo crear la API key. Intenta de nuevo.",
            });
        }
    };

    const handleDeleteApiKey = async (id: string) => {
        const key = apiKeys.find((k) => k.id === id);
        setConfirmState({
            open: true,
            title: "🗑️ Eliminar API Key",
            description: `¿Estás seguro de eliminar la key de "${key?.owner}"? Esta acción no se puede deshacer y la key dejará de funcionar inmediatamente.`,
            confirmText: "Eliminar",
            variant: "destructive",
            onConfirm: async () => {
                closeConfirm();
                try {
                    await deleteApiKey(id);
                    setApiKeys((prev) => prev.filter((k) => k.id !== id));
                    addToast({
                        type: "success",
                        title: "API Key Eliminada",
                        description: `La key de "${key?.owner}" fue eliminada`,
                    });
                } catch (error) {
                    console.error("Error deleting API key:", error);
                    addToast({
                        type: "error",
                        title: "Error al eliminar",
                        description: "No se pudo eliminar la API key",
                    });
                }
            },
        });
    };

    const handleRegenerateApiKey = async (id: string) => {
        const key = apiKeys.find((k) => k.id === id);
        setConfirmState({
            open: true,
            title: "🔄 Regenerar API Key",
            description: `¿Regenerar la key de "${key?.owner}"? La key actual dejará de funcionar inmediatamente y se generará una nueva.`,
            confirmText: "Regenerar",
            variant: "default",
            onConfirm: async () => {
                closeConfirm();
                try {
                    const result = await regenerateApiKey(id);
                    setApiKeys((prev) =>
                        prev.map((k) =>
                            k.id === id
                                ? {
                                      ...k,
                                      keyPreview:
                                          result.key.substring(0, 8) + "...",
                                  }
                                : k,
                        ),
                    );
                    addToast({
                        type: "success",
                        title: "✅ API Key Regenerada",
                        description: `Nueva key para "${key?.owner}". ¡Guárdala!`,
                        copyText: result.key,
                    });
                } catch (error) {
                    console.error("Error regenerating API key:", error);
                    addToast({
                        type: "error",
                        title: "Error al regenerar",
                        description: "No se pudo regenerar la API key",
                    });
                }
            },
        });
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        const key = apiKeys.find((k) => k.id === id);
        try {
            await updateApiKey(id, { isActive });
            setApiKeys((prev) =>
                prev.map((k) => (k.id === id ? { ...k, isActive } : k)),
            );
            addToast({
                type: "success",
                title: isActive ? "Key Activada" : "Key Desactivada",
                description: `"${key?.owner}" ahora está ${isActive ? "activa" : "inactiva"}`,
            });
        } catch (error) {
            console.error("Error updating API key:", error);
            addToast({
                type: "error",
                title: "Error al actualizar",
                description: "No se pudo cambiar el estado de la key",
            });
        }
    };

    const handleResetFailures = () => {
        setConfirmState({
            open: true,
            title: "🗑️ Limpiar Errores",
            description:
                "¿Estás seguro de resetear todos los contadores de errores? Los contadores volverán a 0.",
            confirmText: "Limpiar",
            variant: "destructive",
            onConfirm: async () => {
                closeConfirm();
                try {
                    await resetFailures();
                    await fetchData();
                    addToast({
                        type: "success",
                        title: "Errores limpiados",
                        description:
                            "Todos los contadores de errores fueron reseteados",
                    });
                } catch (error) {
                    console.error("Error resetting failures:", error);
                    addToast({
                        type: "error",
                        title: "Error",
                        description: "No se pudieron limpiar los errores",
                    });
                }
            },
        });
    };

    const handleFixUnknown = () => {
        setConfirmState({
            open: true,
            title: "🔧 Corregir Metadatos",
            description:
                "¿Consultar la API de Deezer para corregir los tracks con título/artista 'Unknown'? Esto puede tardar unos segundos.",
            confirmText: "Corregir",
            variant: "default" as const,
            onConfirm: async () => {
                closeConfirm();
                try {
                    const result = await fixUnknownTracks();
                    await fetchData();
                    addToast({
                        type: "success",
                        title: "Metadatos corregidos",
                        description: result.message,
                    });
                } catch (error) {
                    console.error("Error fixing unknown tracks:", error);
                    addToast({
                        type: "error",
                        title: "Error",
                        description: "No se pudieron corregir los metadatos",
                    });
                }
            },
        });
    };

    // Show loading while checking session
    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">
                        Verificando sesión...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginForm />;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                description={confirmState.description}
                confirmText={confirmState.confirmText}
                variant={confirmState.variant}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
            />

            {/* Header */}
            <header className="border-b border-border bg-card sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
                    <div className="flex items-center justify-between flex-wrap md:flex-nowrap gap-3">
                        {/* Logo */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
                                <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="font-bold text-sm sm:text-lg text-foreground truncate">
                                    Webradio Dashboard
                                </h1>
                                <p className="text-xs text-muted-foreground truncate">
                                    {user?.user_metadata?.full_name ||
                                        user?.email ||
                                        "Usuario"}
                                </p>
                            </div>
                        </div>

                        {/* Tabs — full width row on mobile, inline on md+ */}
                        <nav className="flex gap-1 bg-secondary rounded-lg p-1 overflow-x-auto no-scrollbar order-3 md:order-none w-full md:w-auto">
                            <button
                                onClick={() => setActiveTab("dashboard")}
                                className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                                    activeTab === "dashboard"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                                }`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab("apikeys")}
                                className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                                    activeTab === "apikeys"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                                }`}
                            >
                                API Keys
                            </button>
                            <button
                                onClick={() => setActiveTab("settings")}
                                className={`flex-1 md:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                                    activeTab === "settings"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                                }`}
                            >
                                Configuración
                            </button>
                        </nav>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => fetchData()}
                                disabled={isLoading || isRefreshing}
                                title="Actualizar datos"
                                className="w-8 h-8 sm:w-9 sm:h-9"
                            >
                                <RefreshCw
                                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading || isRefreshing ? "animate-spin" : ""}`}
                                />
                            </Button>
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                title={
                                    autoRefresh
                                        ? "Desactivar auto-actualización"
                                        : "Activar auto-actualización (30s)"
                                }
                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 hidden sm:block ${
                                    autoRefresh
                                        ? "bg-emerald-400"
                                        : "bg-red-400"
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                        autoRefresh ? "translate-x-4" : ""
                                    }`}
                                />
                            </button>

                            {/* User avatar — hidden on mobile */}
                            {user?.user_metadata?.avatar_url && (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt={user.user_metadata.full_name || "Avatar"}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border"
                                />
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                title="Cerrar sesión"
                                className="w-8 h-8 sm:w-9 sm:h-9"
                            >
                                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {activeTab === "dashboard" ? (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <StatsCard
                                title="Uptime"
                                value={stats?.uptime || "-"}
                                icon={Clock}
                                iconColor="text-green-500"
                                className="lg:col-span-2"
                            />
                            <StatsCard
                                title="Búsquedas Hoy"
                                value={stats?.requests.today.searches || 0}
                                subtitle={`Total: ${stats?.requests.total.searches || 0}`}
                                icon={Search}
                                iconColor="text-blue-500"
                                className="lg:col-span-2"
                            />
                            <StatsCard
                                title="Streams Hoy"
                                value={stats?.requests.today.streams || 0}
                                subtitle={`Total: ${stats?.requests.total.streams || 0}`}
                                icon={Activity}
                                iconColor="text-purple-500"
                                className="lg:col-span-2"
                            />
                            <StatsCard
                                title="Cache"
                                value={`${stats?.cache.files || 0} archivos`}
                                subtitle={`${stats?.cache.sizeMB || 0} MB`}
                                icon={HardDrive}
                                iconColor="text-orange-500"
                                className="lg:col-span-3"
                                secondaryAction={{
                                    label: "Explorar",
                                    onClick: () => setCacheBrowserOpen(true),
                                }}
                            />
                            <StatsCard
                                title="Errores Totales"
                                value={stats?.totalFailures || 0}
                                subtitle={`${stats?.failureRatio || 0}% tasa de error`}
                                icon={AlertTriangle}
                                iconColor="text-red-500"
                                className="sm:col-span-2 lg:col-span-3"
                                action={
                                    (stats?.totalFailures || 0) > 0
                                        ? {
                                              label: "Limpiar",
                                              onClick: handleResetFailures,
                                          }
                                        : undefined
                                }
                            />
                        </div>

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            <TopTracks tracks={tracks} isLoading={isLoading} />
                            {/* Top API Keys */}
                            <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                                    <Users className="w-5 h-5 text-primary" />
                                    Top API Keys
                                </h3>
                                {stats?.topApiKeys &&
                                stats.topApiKeys.length > 0 ? (
                                    <div className="space-y-2">
                                        {stats.topApiKeys.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-muted-foreground w-4">
                                                        {i + 1}
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <span className="text-primary font-semibold">
                                                    {item.requests}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">
                                        Sin datos
                                    </p>
                                )}
                            </div>
                            <TopFailures
                                failures={failures}
                                isLoading={isLoading}
                            />
                            {/* Top IPs */}
                            <TopIPs
                                ips={stats?.topIPs || []}
                                isLoading={isLoading}
                            />
                        </div>
                    </>
                ) : activeTab === "apikeys" ? (
                    <ApiKeysTable
                        apiKeys={apiKeys}
                        isLoading={isLoading}
                        onCreate={handleCreateApiKey}
                        onDelete={handleDeleteApiKey}
                        onRegenerate={handleRegenerateApiKey}
                        onToggleActive={handleToggleActive}
                    />
                ) : (
                    /* Settings Tab */
                    <div className="space-y-6">
                        {/* Runtime Settings */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="w-5 h-5 text-muted-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">
                                    Configuración en Caliente
                                </h3>
                                <span className="text-xs text-muted-foreground ml-auto">
                                    Se reinicia al reiniciar el servicio
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    {
                                        key: "useApiKeyAuthentication" as const,
                                        label: "API Key Auth",
                                        desc: "Requiere API key en las peticiones",
                                    },
                                    {
                                        key: "useUserAgentAuthentication" as const,
                                        label: "User-Agent Auth",
                                        desc: "Valida el User-Agent de MTA:SA",
                                    },
                                    {
                                        key: "logUserAgent" as const,
                                        label: "Log User-Agent",
                                        desc: "Registra User-Agent en los logs",
                                    },
                                ].map(({ key, label, desc }) => (
                                    <div
                                        key={key}
                                        className="flex flex-col gap-2 px-4 py-3 rounded-lg bg-secondary/50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-foreground">
                                                {label}
                                            </span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={
                                                    runtimeSettings?.[key] ??
                                                    true
                                                }
                                                onClick={async () => {
                                                    const current =
                                                        runtimeSettings?.[
                                                            key
                                                        ] ?? true;
                                                    const newVal = !current;
                                                    try {
                                                        const result =
                                                            await updateSettings(
                                                                {
                                                                    [key]: newVal,
                                                                },
                                                            );
                                                        setRuntimeSettings(
                                                            result,
                                                        );
                                                        addToast({
                                                            type: "success",
                                                            title: `${label} ${newVal ? "activado" : "desactivado"}`,
                                                        });
                                                    } catch {
                                                        addToast({
                                                            type: "error",
                                                            title: "Error al actualizar configuración",
                                                        });
                                                    }
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    (runtimeSettings?.[key] ??
                                                    true)
                                                        ? "bg-emerald-400"
                                                        : "bg-red-400"
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                                        (runtimeSettings?.[
                                                            key
                                                        ] ?? true)
                                                            ? "translate-x-6"
                                                            : "translate-x-1"
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Maintenance */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Wrench className="w-5 h-5 text-muted-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">
                                    Mantenimiento
                                </h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/50">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            Corregir Metadatos
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Consulta la API de Deezer para
                                            corregir tracks con título/artista
                                            'Unknown'
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleFixUnknown}
                                    >
                                        🔧 Corregir
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {lastUpdate && (
                    <p className="text-[11px] sm:text-xs text-muted-foreground text-center mt-4 sm:mt-8 px-2">
                        Última actualización: {lastUpdate.toLocaleTimeString()}
                    </p>
                )}
            </main>

            {/* Background refresh indicator */}

            {/* Cache Browser Modal */}
            <CacheBrowser
                open={cacheBrowserOpen}
                onClose={() => setCacheBrowserOpen(false)}
            />
        </div>
    );
}

// Parse auth error from URL
function getAuthError(): {
    type: "unauthorized" | "state_mismatch" | "session_error" | "generic";
    message?: string;
} | null {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const path = window.location.pathname;

    const errorType = params.get("error") || hashParams.get("error");
    const errorDescription = params.get("error_description") || hashParams.get("error_description");

    if (path === "/auth-error" || errorType) {
        const type = errorType || "generic";

        // Map errors to our types
        const errorMap: Record<
            string,
            "unauthorized" | "state_mismatch" | "session_error" | "generic"
        > = {
            unauthorized: "unauthorized",
            state_mismatch: "state_mismatch",
            unable_to_create_session: "session_error",
            access_denied: "unauthorized",
            not_allowed: "unauthorized",
            generic: "generic",
        };

        return {
            type: errorMap[type] || "generic",
            message: errorDescription || undefined,
        };
    }

    return null;
}

function App() {
    const authError = getAuthError();

    // If there's an auth error, show the error page
    if (authError) {
        return <AuthError type={authError.type} message={authError.message} />;
    }

    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}

export default App;
