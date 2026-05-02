import { useState } from "react";
import {
    Key,
    RefreshCw,
    Trash2,
    Plus,
    X,
    Server,
    Globe,
    Clock,
    Zap,
    Cpu,
    Fingerprint,
    Edit2,
    Save,
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
    onUpdate: (id: string, data: Partial<ApiKey>) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
}

export function ApiKeysTable({
    apiKeys,
    isLoading,
    onDelete,
    onRegenerate,
    onCreate,
    onUpdate,
    onToggleActive,
}: ApiKeysTableProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<ApiKey>>({});
    
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

    const startEditing = (key: ApiKey) => {
        setEditingId(key.id);
        setEditForm({
            owner: key.owner,
            serverAddress: key.serverAddress,
            allowedIPAddresses: key.allowedIPAddresses,
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = (id: string) => {
        onUpdate(id, editForm);
        setEditingId(null);
        setEditForm({});
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-20 bg-white/5 animate-pulse rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-64 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Key className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Credential Management</h3>
                        <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mt-1">
                            {apiKeys.length} ACTIVE RELAY ACCESS KEYS
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    variant={showCreateForm ? "outline" : "default"}
                    className={cn(
                        "h-11 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 transition-all",
                        showCreateForm 
                            ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" 
                            : "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98]"
                    )}
                >
                    {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showCreateForm ? "Abort Operation" : "Generate New Key"}
                </Button>
            </div>

            {/* Creation Interface */}
            {showCreateForm && (
                <div className="relative group p-8 rounded-3xl border border-primary/20 bg-primary/[0.02] overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
                    <form onSubmit={handleCreate} className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider text-white/80">New Authorization Parameters</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Key Holder / Owner</label>
                                <Input
                                    placeholder="e.g., Los Santos Relay 01"
                                    value={newKey.owner}
                                    onChange={(e) => setNewKey({ ...newKey, owner: e.target.value })}
                                    required
                                    className="h-12 bg-white/[0.03] border-white/5 rounded-xl focus:border-primary/50 transition-all text-xs text-white/90"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Server Endpoint</label>
                                <Input
                                    placeholder="IP:PORT"
                                    value={newKey.serverAddress}
                                    onChange={(e) => setNewKey({ ...newKey, serverAddress: e.target.value })}
                                    required
                                    className="h-12 bg-white/[0.03] border-white/5 rounded-xl focus:border-primary/50 transition-all text-xs font-mono text-white/90"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Restrict IPv4 Addresses (Optional)</label>
                            <Input
                                placeholder="Comma separated list"
                                value={newKey.allowedIPAddresses}
                                onChange={(e) => setNewKey({ ...newKey, allowedIPAddresses: e.target.value })}
                                className="h-12 bg-white/[0.03] border-white/5 rounded-xl focus:border-primary/50 transition-all text-xs font-mono text-white/90"
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-[0.2em] text-[10px]">
                            Commit Generation Sequence
                        </Button>
                    </form>
                </div>
            )}

            {/* Keys Grid */}
            {apiKeys.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/5 bg-white/[0.01] p-20 text-center">
                    <Key className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">No active relay authorizations found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {apiKeys.map((key) => {
                        const isEditing = editingId === key.id;
                        
                        return (
                            <div
                                key={key.id}
                                className={cn(
                                    "group relative rounded-3xl border transition-all duration-300",
                                    key.isActive 
                                        ? "bg-[#0a0a0c] border-white/5 hover:border-primary/30" 
                                        : "bg-black/40 border-white/5 opacity-60 grayscale",
                                    isEditing && "border-primary/50 ring-1 ring-primary/20 bg-[#0c0c10]"
                                )}
                            >
                                {/* Card Header: Tech Branding */}
                                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 shrink-0",
                                            key.isActive 
                                                ? "bg-primary/10 border-primary/20 text-primary" 
                                                : "bg-white/5 border-white/10 text-white/30"
                                        )}>
                                            <Fingerprint className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {isEditing ? (
                                                <Input 
                                                    value={editForm.owner}
                                                    onChange={(e) => setEditForm({...editForm, owner: e.target.value})}
                                                    className="h-8 bg-white/10 border-white/20 text-xs font-bold uppercase tracking-tight text-white mb-1"
                                                    autoFocus
                                                />
                                            ) : (
                                                <h4 className="text-sm font-bold text-white/90 uppercase tracking-tight truncate">{key.owner}</h4>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", key.isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500")} />
                                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.1em]">
                                                    {key.isActive ? "Link Established" : "Signal Terminated"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 ml-4">
                                        {isEditing ? (
                                            <>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => saveEdit(key.id)}
                                                    className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                                >
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={cancelEditing}
                                                    className="h-8 w-8 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => startEditing(key)} 
                                                    className="h-8 w-8 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
                                                    title="Edit configuration"
                                                >
                                                    <Edit2 className="w-4 h-4 opacity-50 group-hover:opacity-100 text-white" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => onRegenerate(key.id)} 
                                                    className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                                    title="Regenerate key"
                                                >
                                                    <RefreshCw className="w-4 h-4 text-white/60 hover:text-primary" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => onDelete(key.id)} 
                                                    className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4 text-white/60 hover:text-red-400" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body: Technical Info */}
                                <div className="p-6 space-y-6">
                                    {/* Key Terminal Display */}
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.25em]">Encryption Secret</span>
                                            <button
                                                onClick={() => handleCopy(key.keyPreview, key.id)}
                                                className="text-[9px] font-bold text-primary/80 hover:text-primary hover:bg-primary/10 px-2 py-0.5 rounded transition-all uppercase tracking-widest border border-primary/20"
                                            >
                                                {copiedId === key.id ? "COPIED" : "COPY KEY"}
                                            </button>
                                        </div>
                                        <div className="relative group/key">
                                            <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-hover/key:opacity-100 transition-opacity" />
                                            <div className="relative flex items-center gap-3 p-3.5 rounded-xl bg-black/50 border border-white/10 group-hover/key:border-primary/30 transition-all overflow-hidden">
                                                <Cpu className="w-4 h-4 text-primary shrink-0 opacity-60" />
                                                <code className="text-xs font-mono text-white/80 flex-1 truncate tracking-tight font-bold">
                                                    {key.keyPreview}
                                                </code>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 transition-all duration-300">
                                            <div className="flex items-center gap-2 text-white/30">
                                                <Server className="w-3 h-3 text-primary/40" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Relay Endpoint</span>
                                            </div>
                                            {isEditing ? (
                                                <Input 
                                                    value={editForm.serverAddress}
                                                    onChange={(e) => setEditForm({...editForm, serverAddress: e.target.value})}
                                                    className="h-8 bg-white/10 border-white/20 text-xs font-mono text-white"
                                                    placeholder="IP:PORT"
                                                />
                                            ) : (
                                                <p className="text-xs font-mono font-bold text-white/70 truncate tracking-tight">{key.serverAddress || "NOT CONFIGURED"}</p>
                                            )}
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 transition-all duration-300">
                                            <div className="flex items-center gap-2 text-white/30">
                                                <Globe className="w-3 h-3 text-primary/40" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Authorized IPv4</span>
                                            </div>
                                            {isEditing ? (
                                                <Input 
                                                    value={editForm.allowedIPAddresses}
                                                    onChange={(e) => setEditForm({...editForm, allowedIPAddresses: e.target.value})}
                                                    className="h-8 bg-white/10 border-white/20 text-xs font-mono text-white"
                                                    placeholder="e.g. 1.2.3.4, 5.6.7.8"
                                                />
                                            ) : (
                                                <p className="text-xs font-mono font-bold text-white/70 truncate tracking-tight">
                                                    {key.allowedIPAddresses || "UNRESTRICTED"}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer: Access Logs */}
                                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-2.5">
                                        <Clock className="w-3.5 h-3.5 text-white/30" />
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Last Access Event</span>
                                            <span className="text-[10px] font-mono font-bold text-white/50">
                                                {key.lastUsedAt 
                                                    ? new Date(key.lastUsedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) 
                                                    : "NO ACTIVITY"}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => onToggleActive(key.id, !key.isActive)}
                                        className={cn(
                                            "h-8 px-4 rounded-xl border text-[9px] font-bold uppercase tracking-[0.2em] transition-all",
                                            key.isActive 
                                                ? "bg-transparent border-white/10 text-white/40 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400" 
                                                : "bg-emerald-500 text-white border-emerald-500 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                        )}
                                    >
                                        {key.isActive ? "Decommission" : "Re-Authorize"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
