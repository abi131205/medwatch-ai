import * as React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import { useGetDistrictsAnalytics } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DISTRICT_COORDS: Record<string, [number, number]> = {
  "Bengaluru": [12.9716, 77.5946],
  "Raichur": [16.2120, 77.3439],
  "Mysuru": [12.2958, 76.6394],
  "Hubli": [15.3647, 75.1240],
  "Mangaluru": [12.9141, 74.8560],
  "Bellary": [15.1394, 76.9214],
  "Davangere": [14.4644, 75.9218],
  "Kolar": [13.1360, 78.1294],
  "Bidar": [17.9104, 77.5199],
  "Vijayapura": [16.8302, 75.7100],
  "Belagavi": [15.8497, 74.4977],
  "Dharwad": [15.4589, 75.0078],
  "Tumkur": [13.3409, 77.1010],
  "Hassan": [13.0068, 76.0996],
  "Shimoga": [13.9299, 75.5681],
};

function getRiskColor(critical: number, high: number, medium: number) {
  if (critical > 0) return "#EF4444";
  if (high > 0) return "#F97316";
  if (medium > 0) return "#EAB308";
  return "#22C55E";
}

export default function MapView() {
  const { data: rawDistricts, isLoading } = useGetDistrictsAnalytics();
  const districtsMeta = rawDistricts as any;
  const districts: any[] = Array.isArray(rawDistricts)
    ? rawDistricts
    : districtsMeta?.districts || [];

  return (
    <div className="relative h-[calc(100vh-64px)] w-full -m-4 md:-m-6 rounded-lg overflow-hidden border border-card-border">
      <MapContainer
        center={[15.3173, 75.7139]}
        zoom={7}
        className="w-full h-full bg-[#0F1117]"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">Carto</a>'
        />
        {districts.map((d) => {
          const coords = DISTRICT_COORDS[d.district];
          if (!coords) return null;

          const total = d.total || 0;
          const radius = Math.min(Math.max(15, total * 2), 45);
          const color = getRiskColor(d.critical, d.high, d.medium);

          return (
            <CircleMarker
              key={d.district}
              center={coords}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.55,
                color: color,
                weight: 2,
              }}
            >
              <Tooltip
                permanent
                direction="center"
                className="circle-count-label"
                offset={[0, 0]}
              >
                <span style={{ color: "#fff", fontWeight: "bold", fontSize: "11px", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                  {total}
                </span>
              </Tooltip>

              <Popup className="dark-popup">
                <div className="p-2 min-w-[220px]">
                  <h3 className="font-bold text-lg mb-1">{d.district}</h3>
                  {d.location_type && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mb-2 inline-block ${
                      d.location_type === "urban" ? "bg-indigo-500/20 text-indigo-300" : "bg-green-500/20 text-green-300"
                    }`}>
                      {d.location_type}
                    </span>
                  )}
                  <div className="space-y-1 text-sm mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Signals:</span>
                      <span className="font-mono font-bold">{total}</span>
                    </div>
                    <div className="flex justify-between text-[#EF4444]">
                      <span>Critical:</span>
                      <span className="font-mono">{d.critical}</span>
                    </div>
                    <div className="flex justify-between text-[#F97316]">
                      <span>High:</span>
                      <span className="font-mono">{d.high}</span>
                    </div>
                    <div className="flex justify-between text-[#EAB308]">
                      <span>Medium:</span>
                      <span className="font-mono">{d.medium}</span>
                    </div>
                    <div className="flex justify-between text-[#22C55E]">
                      <span>Low:</span>
                      <span className="font-mono">{d.low}</span>
                    </div>
                    {d.top_drug && (
                      <div className="flex justify-between pt-1 border-t border-[#2A2D3E]">
                        <span className="text-muted-foreground">Top Drug:</span>
                        <span className="font-medium">{d.top_drug}</span>
                      </div>
                    )}
                    {d.top_category && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Top Category:</span>
                        <span className="font-medium capitalize">{d.top_category.replace("_", " ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Right Sidebar Overlay */}
      <Card className="absolute top-4 right-4 w-72 glass-card z-[1000] max-h-[calc(100vh-100px)] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle>Hotspot Districts</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {districts.slice(0, 8).map(d => (
                <div key={d.district} className="flex items-center justify-between p-2 rounded-md bg-card-border/30">
                  <div>
                    <div className="font-medium text-sm">{d.district}</div>
                    <div className="text-xs text-muted-foreground">{d.total} signals</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {d.location_type && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        d.location_type === "urban" ? "bg-primary/20 text-primary" : "bg-[#22C55E]/20 text-[#22C55E]"
                      }`}>
                        {d.location_type === "urban" ? "U" : "R"}
                      </span>
                    )}
                    {d.critical > 0 && (
                      <span className="px-2 py-1 rounded bg-destructive/20 text-destructive text-xs font-bold">
                        {d.critical} CRIT
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { background: #0F1117 !important; }
        .leaflet-popup-content-wrapper { background: #1A1D27; color: #F1F5F9; border: 1px solid #2A2D3E; border-radius: 0.5rem; }
        .leaflet-popup-tip { background: #1A1D27; border-top: 1px solid #2A2D3E; border-left: 1px solid #2A2D3E; }
        .leaflet-popup-content { margin: 0; }
        .dark-popup a.leaflet-popup-close-button { color: #94A3B8; }
        .circle-count-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .circle-count-label::before { display: none !important; }
        .leaflet-tooltip.circle-count-label { pointer-events: none; }
      ` }} />
    </div>
  );
}
