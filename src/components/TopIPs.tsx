import { MapPin } from "lucide-react";
import type { Stats } from "@/services/api";
import { cn } from "@/lib/utils";

interface TopIPsProps {
    ips: Stats["topIPs"];
    isLoading: boolean;
}

export function TopIPs({ ips, isLoading }: TopIPsProps) {
    return (
        <div className="rounded-2xl border border-white/5 bg-[#121216]/95 p-6 shadow-sm relative overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center gap-2">
                <MapPin className="w-3 h-3 text-primary" />
                Regional Traffic
            </h3>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 w-full bg-white/5 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : ips.length > 0 ? (
                <div className="space-y-2">
                    {ips.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group/item"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-primary/40 group-hover/item:bg-primary transition-colors" />
                                <span className="text-xs font-mono font-semibold text-white/80 group-hover/item:text-white transition-colors">
                                    {item.ip}
                                </span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4 font-mono">
                                <span className="text-sm font-bold text-primary">
                                    {item.requests}
                                </span>
                                <span className="text-[8px] font-bold text-white/20 uppercase ml-1">
                                    REQ
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-40 flex flex-col items-center justify-center opacity-20">
                    <MapPin className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Traffic Logged</p>
                </div>
            )}
        </div>
    );
}
