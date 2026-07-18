"use client";

import { useEffect, useState } from "react";
import TownLocationMap, { MapViewToggle, SchoolsLayerToggle } from "@/components/TownLocationMap";
import EducationSchoolsSection from "@/components/EducationSchoolsSection";

const LOC_CACHE = "wn-explore:v3";
const EDU_CACHE = "wn-education:v2";

function NearbySkeleton() {
  return (
    <div className="town-nearby-grid town-nearby-loading">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="town-nearby-card town-nearby-card-skeleton">
          <div className="town-nearby-skel-icon" />
          <div className="town-nearby-skel-lines">
            <div className="town-nearby-skel-line" />
            <div className="town-nearby-skel-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TownNearbyPanel({ items }) {
  if (!items?.length) return null;

  return (
    <div className="town-nearby">
      <div className="town-nearby-title">What&apos;s Nearby</div>
      <div className="town-nearby-grid">
        {items.map((item) => (
          <div key={item.id} className="town-nearby-card">
            <div className="town-nearby-icon-wrap" aria-hidden="true">
              <span className="town-nearby-emoji">{item.emoji}</span>
            </div>
            <div className="town-nearby-body">
              <div className="town-nearby-label">{item.label}</div>
              <div className="town-nearby-name">{item.name}</div>
              <div className="town-nearby-time">{item.driveTime} drive</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Explore the Area + Education & Schools — global Scout Report block. */
export default function TownExploreEducation({ town, stateAbbr }) {
  const [locationData, setLocationData] = useState(null);
  const [educationData, setEducationData] = useState(null);
  const [locLoading, setLocLoading] = useState(true);
  const [eduLoading, setEduLoading] = useState(true);
  const [locError, setLocError] = useState("");
  const [mapMode, setMapMode] = useState("map");
  const [showSchools, setShowSchools] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLocLoading(true);
    setEduLoading(true);
    setLocError("");
    setLocationData(null);
    setEducationData(null);

    const locKey = `${LOC_CACHE}:${town.id || town.name}:${stateAbbr || ""}`;
    const eduKey = `${EDU_CACHE}:${town.id || town.name}:${stateAbbr || ""}`;

    try {
      const cachedLoc = sessionStorage.getItem(locKey);
      if (cachedLoc) {
        const parsed = JSON.parse(cachedLoc);
        if (parsed?.ok) {
          setLocationData(parsed);
          setLocLoading(false);
        }
      }
      const cachedEdu = sessionStorage.getItem(eduKey);
      if (cachedEdu) {
        const parsed = JSON.parse(cachedEdu);
        if (parsed?.ok) {
          setEducationData(parsed);
          setEduLoading(false);
        }
      }
    } catch {}

    const body = JSON.stringify({
      town: { id: town.id, name: town.name, sub: town.sub },
      stateAbbr,
    });

    (async () => {
      const [locRes, eduRes] = await Promise.allSettled([
        fetch("/api/location", { method: "POST", headers: { "Content-Type": "application/json" }, body }),
        fetch("/api/education", { method: "POST", headers: { "Content-Type": "application/json" }, body }),
      ]);

      if (cancelled) return;

      if (locRes.status === "fulfilled") {
        try {
          const json = await locRes.value.json();
          if (json.ok) {
            setLocationData(json);
            try {
              sessionStorage.setItem(locKey, JSON.stringify(json));
            } catch {}
          } else {
            setLocError(json.error || "Location unavailable");
          }
        } catch {
          setLocError("Location unavailable");
        }
        setLocLoading(false);
      } else {
        setLocError("Location unavailable");
        setLocLoading(false);
      }

      if (eduRes.status === "fulfilled") {
        try {
          const json = await eduRes.value.json();
          if (json.ok) {
            setEducationData(json);
            try {
              sessionStorage.setItem(eduKey, JSON.stringify(json));
            } catch {}
          }
        } catch {}
        setEduLoading(false);
      } else {
        setEduLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [town.id, town.name, town.sub, stateAbbr]);

  return (
    <>
      <section className="explore-area" aria-labelledby="explore-area-heading">
        <div className="explore-area-head">
          <div className="section-label" id="explore-area-heading">Explore the Area</div>
          {locLoading ? (
            <p className="explore-area-summary explore-area-summary-loading">Finding location context…</p>
          ) : locationData?.summary ? (
            <p className="explore-area-summary">{locationData.summary}</p>
          ) : locError ? (
            <p className="explore-area-summary explore-area-summary-loading">
              Map and nearby amenities will appear when location data is available.
            </p>
          ) : null}
        </div>

        <div className="town-map-shell">
          <div className="town-map-toolbar">
            <MapViewToggle mode={mapMode} onChange={setMapMode} disabled={locLoading || !locationData} />
            <SchoolsLayerToggle
              active={showSchools}
              onChange={setShowSchools}
              disabled={locLoading || !locationData || eduLoading}
            />
          </div>
          {locLoading ? (
            <div className="town-map-placeholder" aria-hidden="true" />
          ) : locationData ? (
            <TownLocationMap
              data={locationData}
              viewMode={mapMode}
              showSchools={showSchools}
              schoolMarkers={educationData?.mapMarkers}
            />
          ) : (
            <div className="town-map-placeholder town-map-unavailable" aria-hidden="true" />
          )}
        </div>

        {locLoading ? <NearbySkeleton /> : <TownNearbyPanel items={locationData?.nearby} />}
      </section>

      <EducationSchoolsSection data={educationData} loading={eduLoading} />
    </>
  );
}
