import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { geoCentroid } from 'd3-geo';
import { useInventory } from '../context/InventoryContext';

const GEO_URL = "https://raw.githubusercontent.com/deldar-h/iraq-governorates-geojson/master/Iraq_Governorates.json";

const IraqMap = ({ data, selectedGovernorates = [], onSelect }) => {
    const { theme } = useInventory();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Safety timeout for loading state
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) setLoading(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading]);

    const maxValue = useMemo(() => {
        const values = Object.values(data);
        return values.length > 0 ? Math.max(...values.map(v => v.count || 0)) : 0;
    }, [data]);

    const colorScale = scaleLinear()
        .domain([0, maxValue || 1])
        .range([theme === 'dark' ? "#1E293B" : "#F1F5F9", "#4338ca"]); // Adjust range for dark mode

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden relative flex items-center justify-center border border-slate-100 dark:border-slate-800">
            {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900 z-10">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold uppercase tracking-widest">Loading Map Data...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900 z-10 p-4 text-center">
                    <p className="font-bold">Map data unavailable</p>
                    <p className="text-xs mt-2">Check internet connection or data source.</p>
                </div>
            )}

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 3500, center: [44, 33] }} // Adjusted zoom/center
                className="w-full h-full"
            >
                <ZoomableGroup zoom={1} maxZoom={3}>
                    <Geographies
                        geography={GEO_URL}
                        onGeographyLoad={() => { setLoading(false); setError(false); }}
                        onGeographyError={(err) => { console.error("Map Load Error:", err); setLoading(false); setError(true); }}
                    >
                        {({ geographies }) =>
                            <>
                                {geographies.map((geo) => {
                                    // Enhanced Matching Logic
                                    const governName = geo.properties.name || "";
                                    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

                                    const matchingKey = Object.keys(data).find(k => {
                                        const n1 = normalize(governName);
                                        const n2 = normalize(k);
                                        return n1.includes(n2) || n2.includes(n1);
                                    });

                                    const effectiveName = matchingKey || governName;
                                    const value = matchingKey ? data[matchingKey] : 0;
                                    const isSelected = selectedGovernorates.includes(effectiveName);

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill={isSelected ? "#F59E0B" : (value > 0 ? colorScale(value) : (theme === 'dark' ? "#1E293B" : "#F1F5F9"))}
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
                                    const governName = geo.properties.name || "";
                                    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                                    const matchingKey = Object.keys(data).find(k => {
                                        const n1 = normalize(governName);
                                        const n2 = normalize(k);
                                        return n1.includes(n2) || n2.includes(n1);
                                    });
                                    const effectiveName = matchingKey || governName;
                                    const value = matchingKey ? data[matchingKey] : 0;

                                    // Only show label if value > 0 or it's a major region to reduce clutter
                                    // Or show all. The prompt says "Display Governorate Name + Orders Count"
                                    return (
                                        <Marker key={`${geo.rsmKey}-label`} coordinates={centroid}>
                                            <g className="pointer-events-none">
                                                <text
                                                    y="-5"
                                                    textAnchor="middle"
                                                    style={{ fontSize: 6, fill: theme === 'dark' ? "#fff" : "#1e293b", fontWeight: "bold", textShadow: theme === 'dark' ? "0px 0px 3px rgba(0,0,0,0.8)" : "0px 0px 2px #fff" }}
                                                >
                                                    {effectiveName}
                                                </text>
                                                <text
                                                    y="4"
                                                    textAnchor="middle"
                                                    style={{ fontSize: 5, fill: theme === 'dark' ? "#94a3b8" : "#475569", fontWeight: "normal", textShadow: theme === 'dark' ? "0px 0px 2px rgba(0,0,0,0.8)" : "0px 0px 2px #fff" }}
                                                >
                                                    {value}
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

            {/* Legend / Overlay */}
            <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 z-20 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 bg-[#4338ca] rounded-sm"></span> High Order Volume
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
