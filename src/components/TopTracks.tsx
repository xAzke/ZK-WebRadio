import { Radio } from "lucide-react";
import type { Track } from "@/services/api";
import { cn } from "@/lib/utils";

interface TopTracksProps {
    tracks: Track[];
    isLoading: boolean;
}

export function TopTracks({ tracks, isLoading }: TopTracksProps) {
    return (
        <div className="rounded-2xl border border-white/5 bg-[#121216]/95 p-6 shadow-sm relative overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center gap-2">
                <Radio className="w-3 h-3 text-primary" />
                Broadcast Leaders
            </h3>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 w-full bg-white/5 animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : tracks.length > 0 ? (
                <div className="space-y-2">
                    {tracks.map((track, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group/item"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <span className="text-[10px] font-mono font-bold text-white/10 group-hover/item:text-primary transition-colors w-4">
                                    {(i + 1).toString().padStart(2, '0')}
                                </span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-xs text-white/80 truncate group-hover/item:text-white transition-colors">
                                        {track.title}
                                    </p>
                                    <p className="text-[10px] text-white/30 truncate uppercase font-medium tracking-tight">
                                        {track.artist}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                                <p className="text-sm font-mono font-bold text-primary">
                                    {track.play_count}
                                </p>
                                <p className="text-[8px] font-bold uppercase tracking-tighter text-white/20">
                                    PLYS
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-40 flex flex-col items-center justify-center opacity-20">
                    <Radio className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Signal Detected</p>
                </div>
            )}
        </div>
    );
}
