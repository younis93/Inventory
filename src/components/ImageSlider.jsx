import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, X, Maximize2 } from 'lucide-react';

const ImageSlider = ({
    images = [],
    currentIndex = 0,
    onChange,
    onDelete,
    onDownload
}) => {
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const sliderRef = useRef(null);

    // Minimum swipe distance (in pixels)
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < images.length - 1) {
            onChange(currentIndex + 1);
        } else if (isRightSwipe && currentIndex > 0) {
            onChange(currentIndex - 1);
        }
    };

    const nextImage = () => {
        if (currentIndex < images.length - 1) {
            onChange(currentIndex + 1);
        } else {
            onChange(0); // Loop to start
        }
    };

    const prevImage = () => {
        if (currentIndex > 0) {
            onChange(currentIndex - 1);
        } else {
            onChange(images.length - 1); // Loop to end
        }
    };

    if (!images || images.length === 0) {
        return (
            <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 font-medium">No images available</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 w-full h-full">
            {/* Main Stage */}
            <div
                className="relative flex-1 group overflow-hidden bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Image Container with Animation */}
                <div
                    className="flex transition-transform duration-500 ease-out h-full"
                    style={{
                        transform: `translateX(-${currentIndex * 100}%)`,
                    }}
                >
                    {images.map((img, idx) => (
                        <div key={idx} className="min-w-full h-full flex-none flex items-center justify-center p-4">
                            <img
                                src={typeof img === 'string' ? img : img.url}
                                alt={`Product view ${idx + 1}`}
                                className="max-w-full max-h-full object-contain pointer-events-none select-none drop-shadow-md"
                            />
                        </div>
                    ))}
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                            className="absolute left-4 z-10 p-3 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg text-slate-800 dark:text-white hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute right-4 z-10 p-3 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg text-slate-800 dark:text-white hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}

                {/* Overlay Tokens */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onDownload && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDownload(); }}
                            className="p-2.5 bg-white/90 dark:bg-slate-800/90 rounded-xl shadow-md text-slate-600 dark:text-slate-300 hover:text-accent transition-colors backdrop-blur-sm"
                            title="Download Image"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Index Indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-bold text-white tracking-widest uppercase">
                    {currentIndex + 1} / {images.length}
                </div>
            </div>

            {/* Thumbnail Filmstrip */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-2 px-1 custom-scrollbar">
                {images.map((img, idx) => (
                    <div key={idx} className="relative shrink-0 group">
                        <button
                            onClick={() => onChange(idx)}
                            className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${currentIndex === idx
                                ? 'border-accent ring-2 ring-accent/20 dark:ring-accent/40 scale-105'
                                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <img
                                src={typeof img === 'string' ? img : img.url}
                                alt={`Thumbnail ${idx + 1} of ${images.length}`}
                                className="w-full h-full object-cover"
                            />
                        </button>

                        {/* Delete Thumb Action */}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
                                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 hover:scale-110 z-10"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImageSlider;
