"use client";

import { useState, useEffect, useMemo } from "react";
import { Map, MapControls, MapMarker, MarkerContent, MarkerTooltip, MapHeatmapLayer } from "@/components/ui/map";
import { OverviewCard } from "@/components/analytics/overview-card";
import { BreakdownCard } from "@/components/analytics/breakdown-card";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Globe, Navigation, Loader2, Flame } from "lucide-react";
import { geolocateIP, type Stats, type GeoData } from "@/services/api";
import { cn } from "@/lib/utils";

interface TrafficViewProps {
  ips: Stats["topIPs"];
  isLoading: boolean;
}

interface LocatedIP extends GeoData {
  requests: number;
}

export function TrafficView({ ips, isLoading }: TrafficViewProps) {
  const [locations, setLocations] = useState<LocatedIP[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Derive total traffic for analytics from real API data
  const totalTraffic = ips.reduce((sum, item) => sum + item.requests, 0);

  useEffect(() => {
    const locateAll = async () => {
      if (ips.length === 0) return;
      setIsLocating(true);
      
      const results: LocatedIP[] = [];
      for (const item of ips) {
        try {
          const geo = await geolocateIP(item.name);
          if (geo) {
            results.push({ ...geo, requests: item.requests });
          }
        } catch (e) {
          console.error("Locate error", e);
        }
      }
      setLocations(results);
      setIsLocating(false);
    };

    locateAll();
  }, [ips]);

  // Derived analytics from real geolocation data
  const countryBreakdown = locations.reduce((acc, loc) => {
    const existing = acc.find(r => r.label === loc.country);
    if (existing) {
      existing.value += loc.requests;
    } else {
      acc.push({ label: loc.country, value: loc.requests, icon: loc.flag });
    }
    return acc;
  }, [] as { label: string; value: number; icon?: string }[]).sort((a, b) => b.value - a.value);

  const cityBreakdown = locations.reduce((acc, loc) => {
    const existing = acc.find(r => r.label === loc.city);
    if (existing) {
      existing.value += loc.requests;
    } else {
      acc.push({ label: loc.city, value: loc.requests });
    }
    return acc;
  }, [] as { label: string; value: number }[]).sort((a, b) => b.value - a.value);

  // Convert locations to GeoJSON for Heatmap visualization
  const heatmapData = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => ({
    type: "FeatureCollection",
    features: locations.map(loc => ({
      type: "Feature",
      properties: { requests: loc.requests },
      geometry: { type: "Point", coordinates: [loc.lon, loc.lat] }
    }))
  }), [locations]);

  return (
    <div className="space-y-6">
      {/* Map Section */}
      <BlurFade delay={0.05}>
        <div className="relative h-[600px] w-full rounded-[2.5rem] border border-white/5 overflow-hidden bg-[#0a0a0c] shadow-2xl">
          <Map 
            center={[0, 20]} 
            zoom={1.5} 
            className="h-full w-full"
            attributionControl={false}
          >
            <MapControls position="bottom-right" showZoom showFullscreen />
            
            {/* Heatmap Layer for density visualization */}
            <MapHeatmapLayer 
              data={heatmapData} 
              weightProperty="requests" 
              maxWeight={100}
              radius={45}
              intensity={2}
            />

            {/* Markers for Real Dynamic Locations */}
            {locations.map((loc, i) => (
              <MapMarker key={i} longitude={loc.lon} latitude={loc.lat}>
                <MarkerContent>
                  <div 
                    className="relative flex items-center justify-center group cursor-pointer"
                    style={{ 
                      width: 20 + Math.min(loc.requests / 5, 30), 
                      height: 20 + Math.min(loc.requests / 5, 30) 
                    }}
                  >
                    {/* Animated Pulse Aura */}
                    <div 
                      className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping group-hover:bg-orange-500/40 transition-colors" 
                      style={{ animationDuration: `${Math.max(1, 3 - loc.requests / 50)}s` }}
                    />
                    
                    {/* Flame Icon with Dynamic Scale and Glow */}
                    <div className="relative transition-transform duration-300 group-hover:scale-125">
                      <Flame 
                        className={cn(
                          "transition-all duration-500",
                          loc.requests > 80 ? "text-orange-500" : "text-orange-400/80"
                        )}
                        style={{ 
                          width: 16 + Math.min(loc.requests / 10, 20), 
                          height: 16 + Math.min(loc.requests / 10, 20),
                          filter: `drop-shadow(0 0 ${Math.min(loc.requests / 4, 15)}px rgba(249, 115, 22, 0.8))`
                        }}
                        fill={loc.requests > 50 ? "currentColor" : "none"}
                        strokeWidth={2.5}
                      />
                      
                      {/* Counter Badge */}
                      <div className="absolute -top-1 -right-1 bg-black/80 border border-orange-500/50 rounded-full px-1 min-w-[14px] flex items-center justify-center shadow-lg">
                        <span className="text-[7px] font-bold text-orange-400 font-mono">{loc.requests}</span>
                      </div>
                    </div>
                  </div>
                </MarkerContent>
                <MarkerTooltip>
                  <div className="px-2 py-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white">{loc.city}, {loc.countryCode}</p>
                    <p className="text-[8px] font-medium text-primary uppercase mt-0.5">{loc.requests} Session Requests</p>
                    <p className="text-[7px] font-mono text-white/30 mt-1">{loc.query}</p>
                  </div>
                </MarkerTooltip>
              </MapMarker>
            ))}
          </Map>

          {/* Floating Analytics Card - Connected to live data */}
          <OverviewCard totalRequests={totalTraffic} />

          {/* Locating Overlay */}
          {(isLocating || isLoading) && (
            <div className="absolute top-6 right-6 z-10 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 flex items-center gap-3 animate-fade-in">
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Resolving Signal Origins...</span>
            </div>
          )}
        </div>
      </BlurFade>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BlurFade delay={0.1}>
          <BreakdownCard title="Top Countries" rows={countryBreakdown.slice(0, 6)} />
        </BlurFade>
        
        <BlurFade delay={0.15}>
          <div className="rounded-[2rem] border border-white/5 bg-[#121216]/95 p-6 flex flex-col h-full">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center gap-2">
              <Navigation className="w-3 h-3 text-primary" />
              Live Ingress Stream
            </h3>
            <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar max-h-[300px]">
              {isLoading || isLocating ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-white/5 animate-pulse rounded-xl" />
                ))
              ) : ips.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    <span className="text-[10px] font-mono font-bold text-white/70">{item.name.replace(/^::ffff:/, "")}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-primary">{item.requests}</span>
                    <span className="text-[8px] font-bold text-white/10 uppercase">Req</span>
                  </div>
                </div>
              ))}
              {!isLoading && !isLocating && ips.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                  <Globe className="w-8 h-8 mb-2" />
                  <p className="text-[8px] font-bold uppercase tracking-widest">No active traffic</p>
                </div>
              )}
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <BreakdownCard title="Top Cities" rows={cityBreakdown.slice(0, 6)} />
        </BlurFade>
      </div>
    </div>
  );
}
