import { useState } from "react";
import {
    User,
    RefreshCw,
    Trash2,
    Plus,
    X,
    Clock,
    Zap,
    CreditCard,
    AlertCircle,
    UserCheck,
    Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DeezerAccount } from "@/services/api";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";

interface DeezerAccountsTableProps {
    accounts: DeezerAccount[];
    isLoading?: boolean;
    onDelete: (id: string) => void;
    onCreate: (data: { arl: string }) => Promise<void>;
    onToggleActive: (id: string, isActive: boolean) => void;
    onRefresh: (id: string) => void;
}

export function DeezerAccountsTable({
    accounts,
    isLoading,
    onDelete,
    onCreate,
    onToggleActive,
    onRefresh,
}: DeezerAccountsTableProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newArl, setNewArl] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newArl.trim()) return;

        setIsCreating(true);
        setErrorMsg(null);
        try {
            await onCreate({ arl: newArl.trim() });
            setNewArl("");
            setShowAddForm(false);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to validate and register account. Please check the ARL.");
        } finally {
            setIsCreating(false);
        }
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
                        <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Deezer Accounts</h3>
                        <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mt-1">
                            {accounts.length} REGISTERED DOWNLOAD ACCOUNTS
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setShowAddForm(!showAddForm);
                        setErrorMsg(null);
                    }}
                    variant={showAddForm ? "outline" : "default"}
                    className={cn(
                        "h-11 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 transition-all",
                        showAddForm 
                            ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" 
                            : "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98]"
                    )}
                >
                    {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddForm ? "Abort Operation" : "Add Deezer Account"}
                </Button>
            </div>

            {/* Account Registration Form */}
            {showAddForm && (
                <div className="relative group p-8 rounded-3xl border border-primary/20 bg-primary/[0.02] overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
                    <form onSubmit={handleCreate} className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider text-white/80">Connect Deezer Session</span>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">ARL Token / Cookie Value</label>
                            <Input
                                placeholder="Paste the 192-character 'arl' cookie value here..."
                                value={newArl}
                                onChange={(e) => setNewArl(e.target.value)}
                                required
                                className="h-12 bg-white/[0.03] border-white/5 rounded-xl focus:border-primary/50 transition-all text-xs font-mono text-white/90"
                            />
                            <p className="text-[9px] text-white/30 mt-1 uppercase tracking-wider">
                                Tip: Extract the <code className="text-primary font-bold">arl</code> cookie from your browser dev tools under cookies for www.deezer.com.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            disabled={isCreating}
                            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-[0.2em] text-[10px]"
                        >
                            {isCreating ? "Validating Session..." : "Verify & Add Account"}
                        </Button>
                    </form>
                </div>
            )}

            {/* Accounts Grid */}
            {accounts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/5 bg-white/[0.01] p-20 text-center">
                    <User className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">No Deezer accounts registered.</p>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider max-w-sm mx-auto">
                        Add at least one active account to enable download and high-quality streaming support.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {accounts.map((account) => {
                        return (
                            <div
                                key={account.id}
                                className={cn(
                                    "relative rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden group/card bg-[#0d0d11]",
                                    account.isActive 
                                        ? "border-white/5 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.05)]" 
                                        : "border-red-500/10 bg-red-950/[0.02]"
                                )}
                            >
                                {/* Header / User Profile */}
                                <div className="p-6 space-y-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 rounded-2xl border border-white/10 shrink-0">
                                                <AvatarImage src={account.avatarUrl} alt={account.username} />
                                                <AvatarFallback className="rounded-2xl bg-white/5 text-xs font-bold text-white/70">
                                                    {account.username.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-white truncate uppercase tracking-wide">
                                                    {account.username}
                                                </h4>
                                                <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest block mt-0.5">
                                                    ID: {account.userId}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onRefresh(account.id)}
                                                title="Refresh Account Metadata"
                                                className="p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 active:scale-95 transition-all"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5 text-white/60" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(account.id)}
                                                title="Delete Account"
                                                className="p-2 rounded-lg bg-red-500/10 border border-red-500/10 hover:bg-red-500/20 hover:border-red-500/20 active:scale-95 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Account Parameters */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Premium Badge */}
                                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                            <div className="flex items-center gap-1.5 text-white/30">
                                                <CreditCard className="w-3 h-3 text-primary/40" />
                                                <span className="text-[8px] font-bold uppercase tracking-widest">Subscription</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    account.isPremium ? "bg-emerald-500" : "bg-yellow-500"
                                                )} />
                                                <span className="text-xs font-bold text-white/80 uppercase tracking-wide">
                                                    {account.isPremium ? "PREMIUM / HiFi" : "FREE ACCOUNT"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                            <div className="flex items-center gap-1.5 text-white/30">
                                                <UserCheck className="w-3 h-3 text-primary/40" />
                                                <span className="text-[8px] font-bold uppercase tracking-widest">Authentication</span>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-bold uppercase tracking-wide block",
                                                account.isActive ? "text-emerald-400" : "text-red-400"
                                            )}>
                                                {account.isActive ? "ACTIVE SESSION" : "EXPIRED / INVALID"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Total Downloads</span>
                                            <div className="flex items-center gap-2">
                                                <Music className="w-3 h-3 text-white/30" />
                                                <span className="text-xs font-mono font-bold text-white/70">
                                                    {account.requestCount} REQUESTS
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Registered Date</span>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-white/30" />
                                                <span className="text-xs font-mono font-bold text-white/70">
                                                    {new Date(account.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer: Access Logs */}
                                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-2.5">
                                        <Clock className="w-3.5 h-3.5 text-white/30" />
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Last Access</span>
                                            <span className="text-[10px] font-mono font-bold text-white/50">
                                                {account.lastUsedAt 
                                                    ? new Date(account.lastUsedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) 
                                                    : "NO ACTIVITY"}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => onToggleActive(account.id, !account.isActive)}
                                        className={cn(
                                            "h-8 px-4 rounded-xl border text-[9px] font-bold uppercase tracking-[0.2em] transition-all",
                                            account.isActive 
                                                ? "bg-transparent border-white/10 text-white/45 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400" 
                                                : "bg-emerald-500 text-white border-emerald-500 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                        )}
                                    >
                                        {account.isActive ? "Decommission" : "Re-Authorize"}
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
