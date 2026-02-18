import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import { useInventory } from '../context/InventoryContext';
import iraqGeoRaw from '../data/geoBoundaries-IRQ-ADM1.geojson?raw';

import Skeleton from './common/Skeleton';

const normalizeRingOrientation = (feature) => {
    const geometry = feature?.geometry;
    if (!geometry) return feature;

    if (geometry.type === "Polygon") {
        return {
            ...feature,
            geometry: {
                ...geometry,
                coordinates: geometry.coordinates.map((ring, index) => (index === 0 ? [...ring].reverse() : ring)),
            },
        };
    }

    if (geometry.type === "MultiPolygon") {
        return {
            ...feature,
            geometry: {
                ...geometry,
                coordinates: geometry.coordinates.map((polygon) =>
                    polygon.map((ring, index) => (index === 0 ? [...ring].reverse() : ring))
                ),
            },
        };
    }

    return feature;
};

const IraqMap = ({ data, selectedGovernorates = [], onSelect }) => {
    const { theme, appearance } = useInventory();
    const accentColor = appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start;

    const geoData = useMemo(() => {
        const parsed = JSON.parse(iraqGeoRaw);
        return {
            ...parsed,
            features: (parsed.features || []).map(normalizeRingOrientation),
        };
    }, []);
    const projection = useMemo(() => {
        const width = 800;
        const height = 600;
        const proj = geoMercator().fitExtent([[35, 15], [765, 585]], geoData);
        proj.scale(proj.scale() * 1.05);
        const [[x0, y0], [x1, y1]] = geoPath(proj).bounds(geoData);
        const [tx, ty] = proj.translate();
        proj.translate([
            tx + (width / 2 - (x0 + x1) / 2),
            ty + (height / 2 - (y0 + y1) / 2),
        ]);
        return proj;
    }, [geoData]);

    // Compute numeric counts from `data` which may be an object mapping name->count
    const { maxValue, minPositive } = useMemo(() => {
        const values = Object.values(data || {}).filter(v => typeof v === 'number');
        const max = values.length > 0 ? Math.max(...values) : 0;
        const positives = values.filter(v => v > 0);
        const minPos = positives.length > 0 ? Math.min(...positives) : 1;
        return { maxValue: max, minPositive: minPos };
    }, [data]);

    // Color scale for positive counts (from low -> high). Zero counts will use a separate color.
    const colorScale = useMemo(() => scaleLinear()
        .domain([minPositive || 1, maxValue || (minPositive || 1)])
        .range([`${accentColor}40`, accentColor]), [minPositive, maxValue, accentColor]); // Using accent color variations

    const zeroColor = theme === 'dark' ? "#0f172a" : "#f1f5f9";

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden relative flex items-center justify-center border border-slate-100 dark:border-slate-800">
            {geoData ? (
                <ComposableMap
                    projection={projection}
                    className="w-full h-full"
                >
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
                                    if (isSelected) fillColor = "#94a3b8";
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
                                                hover: { fill: "#94a3b8", outline: "none", stroke: "#fff", strokeWidth: 2, cursor: "pointer", opacity: 0.8 },
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
                                                        fontSize: 10,
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
                                                        fontSize: 12,
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
                </ComposableMap>
            ) : (
                <div className="absolute inset-0 z-10 bg-white dark:bg-slate-900 overflow-hidden">
                    <Skeleton className="w-full h-full rounded-none" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white/50 dark:bg-slate-900/50 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Map...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IraqMap;
