import React, { useState, useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';

const ImageWithFallback = ({
    src,
    alt,
    className = 'bg-slate-100 dark:bg-slate-700',
    imageClassName = '',
    imageStyle = undefined,
    fallback = null,
    lazy = false
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isVisible, setIsVisible] = useState(!lazy);
    const imgRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!lazy) {
            setIsVisible(true);
            return;
        }

        if (!src || isVisible) return;

        if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '120px 0px', threshold: 0.01 }
        );

        const currentContainer = containerRef.current;
        if (currentContainer) {
            observer.observe(currentContainer);
        } else {
            setIsVisible(true);
        }

        return () => observer.disconnect();
    }, [isVisible, lazy, src]);

    // Reset and check cache on mount or src change
    useEffect(() => {
        if (lazy && src && !isVisible) return;

        if (!src) {
            setLoading(false);
            setError(false);
            return;
        }

        setError(false);
        // If the browser already has the image (cached), sync loading state immediately
        if (imgRef.current?.complete) {
            setLoading(false);
        } else {
            setLoading(true);
        }
    }, [src]);

    const handleLoad = () => {
        setLoading(false);
    };

    const handleError = () => {
        setError(true);
        setLoading(false);
    };

    const shouldDeferImageLoad = lazy && src && !isVisible;

    return (
        <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
            {/* 1. Invalid/Empty Source State */}
            {!src && (
                <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                    {fallback || (
                        <div className="flex flex-col items-center gap-1">
                            <ImageOff className="w-1/3 h-1/3 opacity-50" />
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">No Image</span>
                        </div>
                    )}
                </div>
            )}

            {/* 2. Valid Source State */}
            {shouldDeferImageLoad && (
                <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-600 z-10" />
            )}

            {src && !shouldDeferImageLoad && (
                <>
                    {/* Animated Pulse Overlay */}
                    {loading && !error && (
                        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-600 z-10" />
                    )}

                    {!error ? (
                        <img
                            ref={imgRef}
                            src={src}
                            alt={alt}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'} ${imageClassName}`}
                            style={imageStyle}
                            onLoad={handleLoad}
                            onError={handleError}
                            loading={lazy ? 'lazy' : undefined}
                            decoding="async"
                        />
                    ) : (
                        /* Error Fallback */
                        <div className="flex items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                            {fallback || (
                                <div className="flex flex-col items-center gap-1">
                                    <ImageOff className="w-1/3 h-1/3 opacity-50" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-50 text-center px-2">Image Error</span>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ImageWithFallback;
