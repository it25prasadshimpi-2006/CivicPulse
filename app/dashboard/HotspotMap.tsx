"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

interface AIAnalysis { category?: string; issue?: string; severity?: string; duration?: string; }
interface Report { id: string; description: string; category: string; location: string; latitude?: number; longitude?: number; lat?: number; lng?: number; aiAnalysis?: AIAnalysis; complaintNumber?: string; }
interface HotspotIssue { id: string; issue: string; severity: string; duration: string; }
interface Hotspot { location: string; category: string; reportCount: number; priorityScore: number; priorityLevel: string; severity: number; citizenDemand: number; populationAffected: number; infrastructureGap: number; investmentGap: number; latitude?: number; longitude?: number; lat?: number; lng?: number; issues: HotspotIssue[]; }
interface HotspotMapProps { hotspots: Hotspot[]; reports: Report[]; onSelectHotspot: (hotspot: Hotspot) => void; }

let googleMapsLoader: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsLoader) return googleMapsLoader;
  googleMapsLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps could not be loaded"));
    document.head.appendChild(script);
  });
  return googleMapsLoader;
}

function parseLocationCoordinates(location?: string): [number, number] | null {
  if (!location || typeof location !== "string") return null;
  const match = location.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return [latitude, longitude];
}

function getReportCoordinates(report: Report): [number, number] | null {
  const latitude = report.latitude ?? report.lat;
  const longitude = report.longitude ?? report.lng;
  if (typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) return [latitude, longitude];
  return parseLocationCoordinates(report.location);
}

function getHotspotCoordinates(hotspot: Hotspot, reports: Report[] = []): [number, number] | null {
  const latitude = hotspot.latitude ?? hotspot.lat;
  const longitude = hotspot.longitude ?? hotspot.lng;
  if (typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) return [latitude, longitude];
  const directCoordinates = parseLocationCoordinates(hotspot.location);
  if (directCoordinates) return directCoordinates;
  const coordinates = reports.filter((report) => {
    const category = report.aiAnalysis?.category || report.category || "";
    return report.location?.trim().toLowerCase() === hotspot.location?.trim().toLowerCase() && category.trim().toLowerCase() === hotspot.category?.trim().toLowerCase();
  }).map(getReportCoordinates).filter((coordinate): coordinate is [number, number] => coordinate !== null);
  if (!coordinates.length) return null;
  return [coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) / coordinates.length, coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / coordinates.length];
}

function getColor(level?: string) {
  switch (level?.toLowerCase()) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
    default: return "#22c55e";
  }
}

function addPopupLine(container: HTMLElement, label: string, value: string, color?: string) {
  const line = document.createElement("p");
  line.style.margin = "0 0 6px";
  const strong = document.createElement("strong");
  strong.textContent = `${label}: `;
  line.append(strong, document.createTextNode(value));
  if (color) line.style.color = color;
  container.appendChild(line);
}

function createReportPopup(report: Report) {
  const container = document.createElement("div");
  container.style.cssText = "min-width:250px;max-width:320px;color:#111827;font-size:14px;";
  const title = document.createElement("h3");
  title.textContent = "Citizen Complaint";
  title.style.cssText = "font-weight:700;font-size:17px;margin:0 0 10px;";
  container.appendChild(title);
  if (report.complaintNumber) addPopupLine(container, "Complaint No", report.complaintNumber);
  addPopupLine(container, "Category", report.aiAnalysis?.category || report.category || "Unknown");
  if (report.aiAnalysis?.issue) addPopupLine(container, "Issue", report.aiAnalysis.issue);
  addPopupLine(container, "Description", report.description);
  const severity = report.aiAnalysis?.severity || "Low";
  addPopupLine(container, "Severity", severity, getColor(severity));
  if (report.aiAnalysis?.duration) addPopupLine(container, "Duration", report.aiAnalysis.duration);
  addPopupLine(container, "Location", report.location);
  return container;
}

function createHotspotPopup(hotspot: Hotspot, color: string, onSelectHotspot: (hotspot: Hotspot) => void) {
  const container = document.createElement("div");
  container.style.cssText = "min-width:230px;color:#111827;font-size:14px;";
  const title = document.createElement("h3");
  title.textContent = `Hotspot: ${hotspot.location}`;
  title.style.cssText = "font-weight:700;font-size:18px;margin:0 0 8px;";
  container.appendChild(title);
  addPopupLine(container, "Category", hotspot.category);
  addPopupLine(container, "Citizen Reports", String(hotspot.reportCount));
  addPopupLine(container, "Severity", String(hotspot.severity));
  addPopupLine(container, "Citizen Demand", String(hotspot.citizenDemand));
  addPopupLine(container, "Priority Score", String(hotspot.priorityScore));
  addPopupLine(container, "Priority Level", hotspot.priorityLevel, color);
  const button = document.createElement("button");
  button.textContent = "View Intelligence";
  button.style.cssText = `margin-top:8px;padding:8px 12px;border-radius:8px;background:${color};color:#fff;border:0;cursor:pointer;font-weight:700;width:100%;`;
  button.onclick = () => onSelectHotspot(hotspot);
  container.appendChild(button);
  return container;
}

export default function HotspotMap({ hotspots, reports, onSelectHotspot }: HotspotMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (!apiKey) { setMapError("Google Maps API key is not configured."); return; }
    if (!mapContainerRef.current || mapRef.current) return;
    let active = true;
    loadGoogleMaps(apiKey).then(() => {
      if (!active || !mapContainerRef.current) return;
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, { center: { lat: 20.5937, lng: 78.9629 }, zoom: 5, mapTypeId: "roadmap", streetViewControl: false, fullscreenControl: false });
      setMapReady(true);
    }).catch(() => { if (active) setMapError("Google Maps could not be loaded. Please retry later."); });
    return () => {
      active = false;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    const map = mapRef.current;
    const infoWindow = new window.google.maps.InfoWindow();
    const bounds = new window.google.maps.LatLngBounds();
    let hasReportCoordinates = false;
    const coordinateCounts = new Map<string, number>();
    (Array.isArray(reports) ? reports : []).forEach((report) => {
      const baseCoordinates = getReportCoordinates(report);
      if (!baseCoordinates) return;
      const key = `${baseCoordinates[0].toFixed(6)},${baseCoordinates[1].toFixed(6)}`;
      const duplicateIndex = coordinateCounts.get(key) || 0;
      coordinateCounts.set(key, duplicateIndex + 1);
      const offset = duplicateIndex > 0 ? 0.00025 * (Math.floor(duplicateIndex / 6) + 1) : 0;
      const angle = duplicateIndex * (Math.PI / 3);
      const position = { lat: baseCoordinates[0] + Math.sin(angle) * offset, lng: baseCoordinates[1] + Math.cos(angle) * offset };
      const severity = report.aiAnalysis?.severity || "Low";
      const marker = new window.google.maps.Marker({ map, position, title: `${report.complaintNumber || "Complaint"} • ${severity}`, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: getColor(severity), fillOpacity: 0.95, strokeColor: "#ffffff", strokeWeight: 2 } });
      marker.addListener("click", () => infoWindow.open({ map, anchor: marker, content: createReportPopup(report) }));
      markersRef.current.push(marker);
      bounds.extend(position);
      hasReportCoordinates = true;
    });
    (Array.isArray(hotspots) ? hotspots : []).forEach((hotspot) => {
      const coordinates = getHotspotCoordinates(hotspot, reports);
      if (!coordinates) return;
      const color = getColor(hotspot.priorityLevel);
      const position = { lat: coordinates[0], lng: coordinates[1] };
      const outer = new window.google.maps.Marker({ map, position, clickable: true, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 20, fillColor: color, fillOpacity: 0.18, strokeColor: color, strokeWeight: 3 } });
      const inner = new window.google.maps.Marker({ map, position, clickable: true, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: color, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 } });
      const openHotspot = () => { onSelectHotspot(hotspot); infoWindow.open({ map, anchor: inner, content: createHotspotPopup(hotspot, color, onSelectHotspot) }); };
      outer.addListener("click", openHotspot);
      inner.addListener("click", openHotspot);
      markersRef.current.push(outer, inner);
    });
    if (hasReportCoordinates) map.fitBounds(bounds, 50);
  }, [mapReady, reports, hotspots, onSelectHotspot]);

  return (
    <div className="mt-8 mb-8">
      <div className="mb-4"><p className="text-blue-400 text-sm font-semibold">CIVICPULSE INTELLIGENCE</p><h2 className="text-2xl font-bold text-white mt-1">Infrastructure Demand Map</h2><p className="text-gray-400 mt-1">Real-time citizen complaint locations and AI-detected infrastructure demand hotspots.</p></div>
      <div className="relative overflow-hidden rounded-2xl border border-gray-700" style={{ height: "500px", width: "100%" }}>
        {mapError ? <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-400">{mapError}</div> : <div ref={mapContainerRef} className="h-full w-full" aria-label="CivicPulse Google Map" />}
        {!mapReady && !mapError && <div className="absolute inset-0 flex items-center justify-center bg-[#07111f] text-sm text-gray-400">Loading Google Maps...</div>}
      </div>
      <div className="flex flex-wrap gap-5 mt-4 text-sm text-gray-300">{[["#ef4444", "Critical"], ["#f97316", "High"], ["#eab308", "Medium"], ["#22c55e", "Low"]].map(([color, label]) => <div key={label} className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: color }} />{label}</div>)}</div>
      <div className="flex flex-wrap gap-5 mt-3 text-xs text-gray-500"><span>● Individual complaint</span><span>◉ AI demand hotspot</span><span>{Array.isArray(reports) ? reports.length : 0} complaints</span><span>{Array.isArray(hotspots) ? hotspots.length : 0} hotspots</span></div>
      <p className="text-xs text-gray-500 mt-3">Complaint markers use stored latitude and longitude coordinates.</p>
    </div>
  );
}
