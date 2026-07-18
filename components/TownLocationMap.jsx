"use client";

import { useEffect, useRef } from "react";

const MAP_STYLES = `
  .town-map-wrap .leaflet-container {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    background: #e8e4df;
  }
  .town-map-wrap .leaflet-control-zoom a {
    border-radius: 8px !important;
    color: #2C2C2C !important;
    border-color: rgba(0,0,0,0.08) !important;
    width: 32px !important;
    height: 32px !important;
    line-height: 32px !important;
  }
  .town-map-wrap .leaflet-bar {
    border-radius: 10px !important;
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.08) !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.07) !important;
  }
  .town-map-wrap .leaflet-control-attribution {
    font-size: 9px;
    background: rgba(249,247,244,0.88) !important;
    color: #A8A8A8;
    padding: 2px 8px;
  }
  .town-map-pin-wrap {
    position: relative;
    width: 36px;
    height: 36px;
    margin-left: -18px;
    margin-top: -18px;
  }
  .town-map-pin-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(30,77,69,0.14);
    animation: town-pin-pulse 2.4s ease-out infinite;
  }
  .town-map-pin-core {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: #1E4D45;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 12px rgba(0,0,0,0.28);
  }
  @keyframes town-pin-pulse {
    0% { transform: scale(0.55); opacity: 0.7; }
    70% { transform: scale(1.15); opacity: 0; }
    100% { transform: scale(1.15); opacity: 0; }
  }
  .town-map-city-dot {
    width: 8px;
    height: 8px;
    background: #5C6B5A;
    border: 1.5px solid #fff;
    border-radius: 50%;
    opacity: 0.9;
  }
  .town-map-city-label {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5C5C5C;
    white-space: nowrap;
    background: rgba(249,247,244,0.94);
    padding: 3px 7px;
    border-radius: 5px;
    border: 1px solid rgba(0,0,0,0.06);
    margin-top: 5px;
    margin-left: -22px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }
  .town-map-mode-btn {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 9px 13px;
    border: 1px solid rgba(0,0,0,0.08);
    background: rgba(255,255,255,0.96);
    color: #5C5C5C;
    cursor: pointer;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.07);
    transition: background 0.2s, color 0.2s;
  }
  .town-map-mode-btn[data-on="1"] {
    background: #2C2C2C;
    color: #fff;
    border-color: #2C2C2C;
  }
  .town-map-mode-btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .town-map-school-dot {
    width: 10px;
    height: 10px;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 1px 6px rgba(0,0,0,0.22);
  }
  .town-map-school-dot[data-type="public"] { background: #5C6B5A; }
  .town-map-school-dot[data-type="private"] { background: #C17F3A; }
  .town-map-school-dot[data-type="college"] { background: #6B8F71; }
  .town-map-school-dot[data-type="university"] { background: #1E4D45; }
`;

const TILES = {
  map: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 18,
  },
};

const GEO_STYLES = {
  highway: { color: "#8B7355", weight: 2.5, opacity: 0.45, dashArray: null },
  water: { color: "#6B9EB8", weight: 2, opacity: 0.55, fillColor: "#A8C5D4", fillOpacity: 0.15 },
  park: { color: "#5C6B5A", weight: 1.5, opacity: 0.5, fillColor: "#5C6B5A", fillOpacity: 0.08, dashArray: "4 6" },
};

export function hasValidCoords(coords) {
  return coords && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lon));
}

function clearLeafletContainer(container) {
  if (!container) return;
  delete container._leaflet_id;
  container.replaceChildren();
}

function isLiveMap(map) {
  if (!map) return false;
  try {
    const container = map.getContainer?.();
    return Boolean(container?.isConnected);
  } catch {
    return false;
  }
}

function destroyMap(mapRef, layersRef) {
  const map = mapRef.current;
  if (!map) return;
  try {
    map.remove();
  } catch {}
  mapRef.current = null;
  layersRef.current = { tile: null, boundary: null, geo: [], markers: [], schools: null };
}

export default function TownLocationMap({
  data,
  mapKey,
  viewMode = "map",
  showSchools = false,
  schoolMarkers = [],
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ tile: null, boundary: null, geo: [], markers: [], schools: null });
  const initGenRef = useRef(0);

  useEffect(() => {
    const map = mapRef.current;
    const L = map?._leaflet;
    if (!isLiveMap(map) || !L) return;

    if (layersRef.current.tile) {
      map.removeLayer(layersRef.current.tile);
    }
    const cfg = TILES[viewMode] || TILES.map;
    layersRef.current.tile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
  }, [viewMode, mapKey]);

  useEffect(() => {
    const map = mapRef.current;
    const L = map?._leaflet;
    if (!isLiveMap(map) || !L) return;

    if (layersRef.current.schools) {
      map.removeLayer(layersRef.current.schools);
      layersRef.current.schools = null;
    }

    if (!showSchools || !schoolMarkers?.length) return;

    const group = L.layerGroup();
    for (const school of schoolMarkers) {
      if (!Number.isFinite(Number(school.lat)) || !Number.isFinite(Number(school.lon))) continue;
      const icon = L.divIcon({
        className: "",
        html: `<div class="town-map-school-dot" data-type="${school.type}"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      const marker = L.marker([school.lat, school.lon], { icon, zIndexOffset: 400 });
      if (school.name) marker.bindTooltip(school.name, { direction: "top", offset: [0, -6] });
      marker.addTo(group);
    }
    group.addTo(map);
    layersRef.current.schools = group;
  }, [showSchools, schoolMarkers, mapKey]);

  useEffect(() => {
    if (!hasValidCoords(data?.coords) || !mapKey) return;

    if (!containerRef.current) return;

    const gen = ++initGenRef.current;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || gen !== initGenRef.current || !containerRef.current) return;

      destroyMap(mapRef, layersRef);
      clearLeafletContainer(containerRef.current);

      if (cancelled || gen !== initGenRef.current || !containerRef.current?.isConnected) return;

      const lat = Number(data.coords.lat);
      const lon = Number(data.coords.lon);

      const map = L.map(containerRef.current, {
        center: [lat, lon],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      map._leaflet = L;
      mapRef.current = map;

      const cfg = TILES.map;
      layersRef.current.tile = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
      }).addTo(map);

      for (const line of data.geoLayers?.lines || []) {
        const style = GEO_STYLES[line.type] || GEO_STYLES.park;
        try {
          const layer = L.polyline(line.coords, style).addTo(map);
          layersRef.current.geo.push(layer);
        } catch {}
      }

      if (data.boundary) {
        try {
          layersRef.current.boundary = L.geoJSON(data.boundary, {
            style: {
              color: "#1E4D45",
              weight: 2,
              opacity: 0.75,
              fillColor: "#1E4D45",
              fillOpacity: 0.07,
            },
          }).addTo(map);
        } catch {}
      }

      const townIcon = L.divIcon({
        className: "",
        html: '<div class="town-map-pin-wrap"><div class="town-map-pin-ring"></div><div class="town-map-pin-core"></div></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker([lat, lon], { icon: townIcon, zIndexOffset: 1000 }).addTo(map);

      const bounds = L.latLngBounds([[lat, lon]]);

      for (const city of data.nearbyCities || []) {
        if (!Number.isFinite(Number(city.lat)) || !Number.isFinite(Number(city.lon))) continue;
        bounds.extend([city.lat, city.lon]);
        const cityIcon = L.divIcon({
          className: "",
          html: `<div class="town-map-city-dot"></div><div class="town-map-city-label">${city.name}</div>`,
          iconSize: [64, 28],
          iconAnchor: [4, 4],
        });
        const m = L.marker([city.lat, city.lon], { icon: cityIcon, zIndexOffset: 500 }).addTo(map);
        layersRef.current.markers.push(m);
      }

      if (bounds.isValid() && (data.nearbyCities?.length || 0) > 0) {
        map.fitBounds(bounds.pad(0.4), { maxZoom: 10 });
      } else if (data.bbox?.length === 4) {
        const [south, north, west, east] = data.bbox;
        map.fitBounds([[south, west], [north, east]], { maxZoom: 12, padding: [24, 24] });
      } else {
        map.setView([lat, lon], 11);
      }

      requestAnimationFrame(() => {
        if (gen !== initGenRef.current || !isLiveMap(mapRef.current)) return;
        mapRef.current.invalidateSize();
      });
    })();

    return () => {
      cancelled = true;
      destroyMap(mapRef, layersRef);
      clearLeafletContainer(containerRef.current);
    };
  }, [mapKey, data]);

  if (!hasValidCoords(data?.coords)) {
    return (
      <>
        <style>{MAP_STYLES}</style>
        <div className="town-map-wrap">
          <div className="town-map-canvas town-map-placeholder town-map-unavailable" aria-hidden="true" />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{MAP_STYLES}</style>
      <div className="town-map-wrap">
        <div
          key={mapKey}
          ref={containerRef}
          className="town-map-canvas"
          aria-label="Interactive town map"
        />
      </div>
    </>
  );
}

export function SchoolsLayerToggle({ active, onChange, disabled = false }) {
  return (
    <button
      type="button"
      className="town-map-mode-btn town-map-schools-btn"
      data-on={active ? "1" : "0"}
      onClick={() => onChange(!active)}
      disabled={disabled}
      aria-pressed={active}
    >
      🏫 Schools
    </button>
  );
}

export function MapViewToggle({ mode, onChange, disabled = false }) {
  return (
    <div className="town-map-toggle" role="group" aria-label="Map view">
      <button
        type="button"
        className="town-map-mode-btn"
        data-on={mode === "map" ? "1" : "0"}
        onClick={() => onChange("map")}
        disabled={disabled}
      >
        Map
      </button>
      <button
        type="button"
        className="town-map-mode-btn"
        data-on={mode === "satellite" ? "1" : "0"}
        onClick={() => onChange("satellite")}
        disabled={disabled}
      >
        Satellite
      </button>
    </div>
  );
}
