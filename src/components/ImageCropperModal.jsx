import React, { useState, useRef, useEffect } from 'react';
import { X, Crop, RotateCcw, Save, ZoomIn, ZoomOut, Check, Image as ImageIcon } from 'lucide-react';

const ImageCropperModal = ({ image, onCrop, onClose, aspect = 1 }) => {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    // Config
    const CROP_SIZE = 320; // 320px square
    const OUTPUT_SIZE = 512;

    const imageRef = useRef(null);
    const containerRef = useRef(null);

    // Reset state when image changes
    useEffect(() => {
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    }, [image]);

    const handleImageLoad = (e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setImageSize({ width: naturalWidth, height: naturalHeight });
        setZoom(1); // Default zoom to 100% as requested
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const getCroppedImg = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;

        // Set canvas size to the desired output
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE / aspect;

        // Fill background white
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Use clear for transparency

        // Save context state
        ctx.save();

        const outputScale = OUTPUT_SIZE / CROP_SIZE;

        // 1. Move to center of canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // 2. Apply position offset (drag) - must be scaled to output
        ctx.translate(position.x * outputScale, position.y * outputScale);

        // 3. Apply rotation
        ctx.rotate((rotation * Math.PI) / 180);

        // 4. Apply zoom and output scaling
        const effectiveZoom = zoom * outputScale;
        ctx.scale(effectiveZoom, effectiveZoom);

        // 5. Draw image centered
        const drawWidth = img.naturalWidth;
        const drawHeight = img.naturalHeight;

        // Ensure high quality for large images
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            img,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );

        ctx.restore();
        return canvas.toDataURL('image/png', 1.0);
    };

    const handleSave = () => {
        const croppedData = getCroppedImg();
        onCrop(croppedData);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-20">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <ImageIcon className="w-6 h-6 text-accent" /> Editor Studio
                        </h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Customize your brand identity</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Editor Canvas */}
                    <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center cursor-move select-none"
                        style={{
                            backgroundImage: `linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75% , #e5e7eb 75%)`,
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <div className="absolute inset-0 bg-black/40 pointer-events-none z-0"></div>

                        {/* The Crop Area Indicator */}
                        <div className="relative z-10 border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-xl overflow-visible"
                            style={{
                                width: CROP_SIZE,
                                height: CROP_SIZE / aspect,
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)'
                            }}
                        >
                            {/* Grid Lines */}
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                                <div className="border-r border-white/30 h-full col-start-2"></div>
                                <div className="border-r border-white/30 h-full col-start-3"></div>
                                <div className="border-b border-white/30 w-full row-start-2 col-span-3"></div>
                                <div className="border-b border-white/30 w-full row-start-3 col-span-3"></div>
                            </div>

                            {/* Corner Markers */}
                            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-sm shadow-sm"></div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-sm shadow-sm"></div>
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-sm shadow-sm"></div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-sm shadow-sm"></div>
                        </div>

                        {/* Image Layer */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                            <img
                                ref={imageRef}
                                src={image}
                                alt="To crop"
                                onLoad={handleImageLoad}
                                draggable={false}
                                className="max-none transition-transform duration-75 origin-center will-change-transform"
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Tools Panel */}
                    <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border-s border-slate-100 dark:border-slate-800 p-6 flex flex-col z-20 shadow-xl">
                        <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar">

                            {/* Zoom Control */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                                    <span>Zoom & Scale</span>
                                    <span className="font-mono text-accent">{Math.round(zoom * 100)}%</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-1 hover:text-accent transition-colors"><ZoomOut className="w-5 h-5 text-slate-400" /></button>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="3"
                                            step="0.01"
                                            value={zoom}
                                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                                            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
                                        />
                                        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1 hover:text-accent transition-colors"><ZoomIn className="w-5 h-5 text-slate-400" /></button>
                                    </div>
                                </div>
                            </div>

                            {/* Rotation Control */}
                            <div className="space-y-4">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Orientation</span>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setRotation(prev => prev - 90)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-accent hover:text-accent transition-all group"
                                    >
                                        <RotateCcw className="w-4 h-4 text-slate-500 group-hover:text-accent transition-colors" />
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-accent">-90°</span>
                                    </button>
                                    <button
                                        onClick={() => setRotation(prev => prev + 90)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-accent hover:text-accent transition-all group"
                                    >
                                        <RotateCcw className="w-4 h-4 text-slate-500 group-hover:text-accent transition-colors scale-x-[-1]" />
                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-accent">+90°</span>
                                    </button>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                    <span className="text-xs font-mono text-slate-500">Current Rotation: {rotation}°</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                            <button
                                onClick={handleSave}
                                className="w-full py-4 bg-accent text-white font-black rounded-2xl shadow-accent shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:brightness-110"
                            >
                                <Check className="w-5 h-5" />
                                Apply Changes
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-3 text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropperModal;
