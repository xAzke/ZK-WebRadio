import { ShieldX, RefreshCw, AlertCircle, Terminal, Binary, ArrowLeft } from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { cn } from "@/lib/utils";

interface AuthErrorProps {
    type: "unauthorized" | "state_mismatch" | "session_error" | "generic";
    message?: string;
}

const errorConfig = {
    unauthorized: {
        code: "AUTH_DENIED_403",
        title: "Access Denied",
        description: "Your identification failed verification. Insufficient permissions detected for this node.",
        icon: ShieldX,
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/20"
    },
    state_mismatch: {
        code: "LINK_EXP_408",
        title: "Link Expired",
        description: "The authentication link has been invalidated. Connection timeout or sequence interruption.",
        icon: RefreshCw,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20"
    },
    session_error: {
        code: "SESS_FAULT_500",
        title: "Session Fault",
        description: "Critical failure during session construction. Relay handshake could not be completed.",
        icon: AlertCircle,
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/20"
    },
    generic: {
        code: "UNKN_ERR_000",
        title: "System Anomaly",
        description: "An unexpected exception occurred during the authentication link sequence.",
        icon: Terminal,
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20"
    },
};

export function AuthError({ type, message }: AuthErrorProps) {
    const config = errorConfig[type] || errorConfig.generic;
    const Icon = config.icon;

    const handleRetry = () => {
        window.location.href = "/";
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#060608] overflow-hidden relative font-sans">
            {/* High-Fidelity Technical Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div 
                    className="absolute inset-0 opacity-[0.03]" 
                    style={{ backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
                />
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(239,68,68,0.03)_0%,transparent_70%)] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(245,158,11,0.03)_0%,transparent_70%)] rounded-full" />
            </div>

            <BlurFade delay={0.1}>
                <div className="w-full max-w-[440px] relative z-10 group">
                    {/* Professional Frame Accents */}
                    <div className="absolute -top-4 -left-4 w-10 h-10 border-t-2 border-l-2 border-white/5 rounded-tl-2xl" />
                    <div className="absolute -bottom-4 -right-4 w-10 h-10 border-b-2 border-r-2 border-white/5 rounded-br-2xl" />

                    <div className="bg-[#0a0a0c] border border-white/5 rounded-3xl p-10 shadow-2xl relative overflow-hidden text-white">
                        {/* Fault Code Badge */}
                        <div className="absolute top-0 right-0 px-4 py-1.5 bg-red-500/10 border-b border-l border-red-500/20 rounded-bl-xl">
                            <span className="text-[8px] font-mono font-bold text-red-400 tracking-widest">{config.code}</span>
                        </div>

                        <div className="flex flex-col items-center mb-10">
                            <div className="relative mb-8">
                                <div className={cn(
                                    "w-20 h-20 rounded-3xl flex items-center justify-center border transition-all duration-700 shadow-inner",
                                    config.bg, config.border
                                )}>
                                    <Icon className={cn("w-10 h-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]", config.color)} />
                                </div>
                            </div>

                            <div className="text-center space-y-3">
                                <h1 className="text-3xl font-bold tracking-tighter uppercase text-white/90">
                                    Terminal<span className="text-red-400/60">.Fault</span>
                                </h1>
                                <div className="flex items-center justify-center gap-2 px-3 py-1 bg-red-500/5 rounded-full border border-red-500/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400/60">
                                        Security Violation Detected
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="text-center px-4">
                                <h3 className="text-sm font-bold text-white/90 uppercase tracking-widest mb-2">{config.title}</h3>
                                <p className="text-[10px] font-medium text-white/40 leading-relaxed uppercase tracking-wide">
                                    {message || config.description}
                                </p>
                            </div>

                            {type === "unauthorized" && (
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <p className="text-[9px] font-mono text-white/20 uppercase tracking-tight leading-normal text-center">
                                        Handshake rejected. Access logs indicate unauthorized Discord metadata. Contact node supervisor for uplink authorization.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleRetry}
                                    className="group/btn w-full h-14 relative flex items-center justify-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] text-white font-bold rounded-2xl transition-all duration-500 border border-white/5 hover:border-primary/30 overflow-hidden shadow-lg"
                                >
                                    <ArrowLeft className="w-4 h-4 text-white/40 group-hover/btn:text-primary transition-all group-hover/btn:-translate-x-1" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Return to Interface</span>
                                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(59,130,246,0.05)_50%,transparent_100%)] -translate-y-full group-hover/btn:animate-[scanline_2s_linear_infinite]" />
                                </button>

                                {type === "state_mismatch" && (
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="w-full h-10 text-[9px] font-bold uppercase tracking-[0.3em] text-white/20 hover:text-white/40 transition-colors"
                                    >
                                        Initiate Re-handshake
                                    </button>
                                )}
                            </div>

                            {/* Status Footer */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between text-[7px] font-bold text-white/10 uppercase tracking-[0.4em]">
                                    <div className="flex items-center gap-2">
                                        <Binary className="w-2.5 h-2.5" />
                                        <span>Fault logged to node</span>
                                    </div>
                                    <span>Ref: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                                </div>
                                <div className="h-0.5 w-full bg-red-500/10 rounded-full overflow-hidden">
                                    <div className="h-full w-full bg-red-500/20" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </BlurFade>

            {/* Post-Process Grain */}
            <div
                className="absolute inset-0 z-[1] opacity-[0.1] pointer-events-none mix-blend-soft-light"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}
