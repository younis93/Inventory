import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

const ImageWithFallback = ({ src, alt, className = '', imageClassName = '', fallback = null }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
        <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-700 ${className}`}>
            {loading && !error && (
                <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-600 z-10" />
            )}

            {!error ? (
                <img
                    src={src}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'} ${imageClassName}`}
                    loading="lazy"
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setError(true);
                        setLoading(false);
                    }}
                />
            ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                    {fallback || (
                        <div className="flex flex-col items-center gap-1">
                            <ImageOff className="w-1/3 h-1/3 opacity-50" />
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">No Image</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImageWithFallback;
