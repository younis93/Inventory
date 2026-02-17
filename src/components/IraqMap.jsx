import React, { useMemo, useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { geoCentroid } from 'd3-geo';
import { useInventory } from '../context/InventoryContext';

import Skeleton from './common/Skeleton';


const GEO_URL = "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/rel/releaseData/gbOpen/IRQ/ADM1/geoBoundaries-IRQ-ADM1.geojson";

const IraqMap = ({ data, selectedGovernorates = [], onSelect }) => {
    const { theme, brand } = useInventory();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [geoData, setGeoData] = useState(null);

    useEffect(() => {
        fetch(GEO_URL)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch map data');
                return res.json();
            })
            .then(data => {
                setGeoData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Map Load Error:", err);
                setError(true);
                setLoading(false);
            });
    }, []);

    // Compute numeric counts from `data` which may be an object mapping name->count
    const { maxValue, minPositive } = useMemo(() => {
        const values = Object.values(data || {}).filter(v => typeof v === 'number');
        const max = values.length > 0 ? Math.max(...values) : 0;
        const positives = values.filter(v => v > 0);
        const minPos = positives.length > 0 ? Math.min(...positives) : 1;
        return { maxValue: max, minPositive: minPos };
    }, [data]);

    // Color scale for positive counts (from low -> high). Zero counts will use a separate color.
    const colorScale = scaleLinear()
        .domain([minPositive || 1, maxValue || (minPositive || 1)])
        .range([`${brand.color}40`, brand.color]); // Using brand color variations

    const zeroColor = theme === 'dark' ? "#0f172a" : "#f1f5f9";

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden relative flex items-center justify-center border border-slate-100 dark:border-slate-800">
            {loading && !error && (
                <div className="absolute inset-0 z-10 bg-white dark:bg-slate-900 overflow-hidden">
                    <Skeleton className="w-full h-full rounded-none" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white/50 dark:bg-slate-900/50 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Map...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900 z-10 p-4 text-center">
                    <p className="font-bold">Map data unavailable</p>
                    <p className="text-xs mt-2">Check internet connection or data source.</p>
                </div>
            )}

            {!loading && !error && geoData && (
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 3500, center: [44, 33] }} // Adjusted zoom/center
                    className="w-full h-full"
                >
                    <ZoomableGroup zoom={1} maxZoom={3}>
                        <Geographies geography={geoData}>
                            {({ geographies }) =>
                                <>
                                    {geographies.map((geo) => {
                                        // Robust Property Access: Check 'name', 'shapeName', or 'ADM1_EN' (common in geoBoundaries)
                                        const p = geo.properties || {};
                                        const governName = p.name || p.shapeName || p.ADM1_EN || "Unknown";

                                        const normalize = (str) => typeof str === 'string' ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
                                        const n1 = normalize(governName);

                                        // Try to find a match in our data keys
                                        const matchingKey = Object.keys(data || {}).find(k => {
                                            const n2 = normalize(k);
                                            return n1 && n2 && (n1.includes(n2) || n2.includes(n1));
                                        });

                                        const effectiveName = matchingKey || governName;
                                        const value = (matchingKey && data[matchingKey]) || 0;
                                        const isSelected = selectedGovernorates.includes(effectiveName);

                                        // Choose fill: selected > positive gradient > zero color
                                        let fillColor = zeroColor;
                                        if (isSelected) fillColor = "#F59E0B";
                                        else if (value > 0) fillColor = colorScale(value);

                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                fill={fillColor}
                                                stroke={isSelected ? "#ffffff" : (theme === 'dark' ? "#334155" : "#cbd5e1")}
                                                strokeWidth={isSelected ? 2 : 0.5}
                                                onClick={() => {
                                                    if (onSelect) onSelect(effectiveName);
                                                }}
                                                style={{
                                                    default: { outline: "none", transition: "all 250ms" },
                                                    hover: { fill: "#F59E0B", outline: "none", stroke: "#fff", strokeWidth: 2, cursor: "pointer", opacity: 0.8 },
                                                    pressed: { outline: "none" },
                                                }}
                                                title={`${effectiveName}: ${value} Orders`}
                                            />
                                        );
                                    })}
                                    {/* Render Labels on top */}
                                    {geographies.map((geo) => {
                                        const centroid = geoCentroid(geo);
                                        // Check centroid validity
                                        if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return null;

                                        const p = geo.properties || {};
                                        const governName = p.name || p.shapeName || p.ADM1_EN || "Unknown";

                                        const normalize = (str) => typeof str === 'string' ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
                                        const n1 = normalize(governName);

                                        const matchingKey = Object.keys(data || {}).find(k => {
                                            const n2 = normalize(k);
                                            return n1 && n2 && (n1.includes(n2) || n2.includes(n1));
                                        });
                                        const effectiveName = matchingKey || governName;
                                        const value = (matchingKey && data[matchingKey]) || 0;

                                        return (
                                            <Marker key={`${geo.rsmKey}-label`} coordinates={centroid}>
                                                <g className="pointer-events-none" style={{ transform: 'translateY(-6px)' }}>
                                                    <text
                                                        y="-6"
                                                        textAnchor="middle"
                                                        style={{
                                                            fontSize: 8,
                                                            fill: theme === 'dark' ? "#fff" : "#1e293b",
                                                            fontWeight: "bold",
                                                            pointerEvents: 'none',
                                                            textShadow: "0px 0px 2px rgba(255,255,255,0.8)"
                                                        }}
                                                    >
                                                        {effectiveName}
                                                    </text>
                                                    <text
                                                        y="8"
                                                        textAnchor="middle"
                                                        style={{
                                                            fontSize: 10,
                                                            fill: theme === 'dark' ? "#e6f0ff" : "#0f172a",
                                                            fontWeight: "800",
                                                            pointerEvents: 'none',
                                                            textShadow: "0px 0px 2px rgba(255,255,255,0.8)"
                                                        }}
                                                    >
                                                        {value > 0 ? value : ''}
                                                    </text>
                                                </g>
                                            </Marker>
                                        );
                                    })}
                                </>
                            }
                        </Geographies>
                    </ZoomableGroup>
                </ComposableMap>
            )}

            {/* Legend / Overlay */}
            <div className="absolute bottom-4 end-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 z-20 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: brand.color }}></span> High Order Volume
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: theme === 'dark' ? "#1E293B" : "#E0E7FF" }}></span> Low Order Volume
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-[#F59E0B] rounded-sm"></span> Selected
                </div>
            </div>
        </div>
    );
};

export default IraqMap;
