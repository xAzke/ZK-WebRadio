import { AlertTriangle } from "lucide-react";
import type { FailureTrack } from "@/services/api";

interface TopFailuresProps {
    failures: FailureTrack[];
    isLoading: boolean;
}

export function TopFailures({ failures, isLoading }: TopFailuresProps) {
    return (
        <div className="rounded-2xl border border-white/5 bg-[#121216]/95 p-6 shadow-sm relative overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                Critical Anomalies
            </h3>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 w-full bg-white/5 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : failures.length > 0 ? (
                <div className="space-y-2">
                    {failures.map((track, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-red-500/5 hover:border-red-500/20 transition-all group/item"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-red-500/5 flex items-center justify-center border border-red-500/10 group-hover/item:bg-red-500/10 transition-colors">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-xs text-white/80 truncate group-hover/item:text-white transition-colors">
                                        {track.title}
                                    </p>
                                    <p className="text-[10px] text-white/30 truncate uppercase font-medium tracking-tight">
                                        {track.artist}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4 font-mono">
                                <p className="text-sm font-bold text-red-400">
                                    {track.failureCount}
                                </p>
                                <p className="text-[8px] font-bold uppercase tracking-tighter text-white/20">
                                    FAILS
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-40 flex flex-col items-center justify-center opacity-20">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">System Stable</p>
                </div>
            )}
        </div>
    );
}
