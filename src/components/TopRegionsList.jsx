import React from 'react';
import { MapPin, Trophy } from 'lucide-react';

const TopRegionsList = ({ regions, selectedRegion, onSelect }) => {
    // Sort regions by count descending and take top 5
    // regions is an array of { name: "Baghdad", count: 120 }
    const topRegions = [...regions]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const handleRegionClick = (regionName) => {
        onSelect(regionName);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" /> Top Regions
            </h3>

            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {topRegions.map((region, index) => {
                    const isSelected = selectedRegion === region.name || (Array.isArray(selectedRegion) && selectedRegion.includes(region.name));
                    return (
                        <div
                            key={region.name}
                            onClick={() => handleRegionClick(region.name)}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:translate-x-1 ${isSelected
                                ? 'bg-accent text-white shadow-accent'
                                : 'bg-slate-50 dark:bg-slate-700/30 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                            index === 1 ? 'bg-slate-200 text-slate-600' :
                                                index === 2 ? 'bg-orange-100 text-orange-600' :
                                                    ''
                                        }`}
                                    style={index > 2 ? {
                                        backgroundColor: `color-mix(in srgb, var(--accent-color), transparent 90%)`,
                                        color: `var(--accent-color)`
                                    } : {}}
                                >
                                    {index + 1}
                                </div>
                                <span className={`font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{region.name}</span>
                            </div>
                            <span className={`font-black transition-colors ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{region.count}</span>
                        </div>
                    );
                })}
                {topRegions.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-4">No data available</p>
                )}
            </div>
        </div>
    );
};

export default TopRegionsList;
