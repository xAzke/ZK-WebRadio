import { useState } from "react";
import {
    Key,
    RefreshCw,
    Trash2,
    Copy,
    Check,
    Plus,
    X,
    Shield,
    Server,
    Globe,
    Clock,
    ToggleLeft,
    ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ApiKey } from "@/services/api";

interface ApiKeysTableProps {
    apiKeys: ApiKey[];
    isLoading?: boolean;
    onDelete: (id: string) => void;
    onRegenerate: (id: string) => void;
    onCreate: (data: {
        owner: string;
        serverAddress: string;
        allowedIPAddresses?: string;
    }) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
}

export function ApiKeysTable({
    apiKeys,
    isLoading,
    onDelete,
    onRegenerate,
    onCreate,
    onToggleActive,
}: ApiKeysTableProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newKey, setNewKey] = useState({
        owner: "",
        serverAddress: "",
        allowedIPAddresses: "",
    });
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKey.owner || !newKey.serverAddress) return;

        onCreate({
            owner: newKey.owner,
            serverAddress: newKey.serverAddress,
            allowedIPAddresses: newKey.allowedIPAddresses || undefined,
        });

        setNewKey({ owner: "", serverAddress: "", allowedIPAddresses: "" });
        setShowCreateForm(false);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        API Keys
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-48 bg-card border border-border rounded-xl animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                        <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            API Keys
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {apiKeys.length}{" "}
                            {apiKeys.length === 1
                                ? "key registrada"
                                : "keys registradas"}
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className={cn(
                        "gap-2 transition-all",
                        showCreateForm
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                    variant={showCreateForm ? "outline" : "default"}
                >
                    {showCreateForm ? (
                        <>
                            <X className="w-4 h-4" />
                            Cancelar
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            Nueva Key
                        </>
                    )}
                </Button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <form
                    onSubmit={handleCreate}
                    className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 space-y-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                            Crear nueva API Key
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Owner
                            </label>
                            <Input
                                placeholder="Nombre del servidor"
                                value={newKey.owner}
                                onChange={(e) =>
                                    setNewKey({
                                        ...newKey,
                                        owner: e.target.value,
                                    })
                                }
                                required
                                className="bg-background/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Server Address
                            </label>
                            <Input
                                placeholder="IP:Puerto"
                                value={newKey.serverAddress}
                                onChange={(e) =>
                                    setNewKey({
                                        ...newKey,
                                        serverAddress: e.target.value,
                                    })
                                }
                                required
                                className="bg-background/50"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            IPs Permitidas
                        </label>
                        <Input
                            placeholder="Separadas por coma (opcional)"
                            value={newKey.allowedIPAddresses}
                            onChange={(e) =>
                                setNewKey({
                                    ...newKey,
                                    allowedIPAddresses: e.target.value,
                                })
                            }
                            className="bg-background/50"
                        />
                    </div>
                    <Button type="submit" className="w-full gap-2">
                        <Plus className="w-4 h-4" />
                        Crear API Key
                    </Button>
                </form>
            )}

            {/* Keys Grid */}
            {apiKeys.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
                    <Key className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">
                        No hay API keys registradas
                    </p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                        Crea una nueva key para empezar
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {apiKeys.map((key) => (
                        <div
                            key={key.id}
                            className={cn(
                                "group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
                                key.isActive
                                    ? "border-border hover:border-primary/30"
                                    : "border-border/50 opacity-60",
                            )}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "p-2 rounded-lg",
                                            key.isActive
                                                ? "bg-green-500/10"
                                                : "bg-destructive/10",
                                        )}
                                    >
                                        <Key
                                            className={cn(
                                                "w-4 h-4",
                                                key.isActive
                                                    ? "text-green-500"
                                                    : "text-destructive",
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">
                                            {key.owner}
                                        </h4>
                                        <button
                                            onClick={() =>
                                                onToggleActive(
                                                    key.id,
                                                    !key.isActive,
                                                )
                                            }
                                            className={cn(
                                                "text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1 transition-colors",
                                                key.isActive
                                                    ? "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                                                    : "bg-destructive/15 text-destructive hover:bg-destructive/25",
                                            )}
                                        >
                                            {key.isActive ? (
                                                <ToggleRight className="w-3 h-3" />
                                            ) : (
                                                <ToggleLeft className="w-3 h-3" />
                                            )}
                                            {key.isActive
                                                ? "Activa"
                                                : "Inactiva"}
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => onRegenerate(key.id)}
                                        title="Regenerar key"
                                        className="hover:bg-primary/10 hover:text-primary"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => onDelete(key.id)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Key Preview */}
                            <div className="mb-3">
                                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                                    <code className="text-sm font-mono text-foreground flex-1 truncate">
                                        {key.keyPreview}
                                    </code>
                                    <button
                                        onClick={() =>
                                            handleCopy(key.keyPreview, key.id)
                                        }
                                        className="p-1.5 rounded-md hover:bg-secondary transition-colors shrink-0"
                                        title="Copiar"
                                    >
                                        {copiedId === key.id ? (
                                            <Check className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Server className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">
                                        {key.serverAddress}
                                    </span>
                                </div>
                                {key.allowedIPAddresses && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Globe className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">
                                            {key.allowedIPAddresses}
                                        </span>
                                    </div>
                                )}
                                {key.lastUsedAt && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                        <Clock className="w-3 h-3 shrink-0" />
                                        <span>
                                            Último uso:{" "}
                                            {new Date(
                                                key.lastUsedAt,
                                            ).toLocaleDateString("es-AR", {
                                                day: "numeric",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
