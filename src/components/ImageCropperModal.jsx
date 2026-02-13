import React, { useState, useRef, useEffect } from 'react';
import { X, Crop, RotateCcw, Save, ZoomIn, ZoomOut } from 'lucide-react';

const ImageCropperModal = ({ image, onCrop, onClose, aspect = 1 }) => {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imageRef = useRef(null);
    const canvasRef = useRef(null);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
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

        // Set canvas size to the desired output (e.g., 512x512)
        const size = 512;
        canvas.width = size;
        canvas.height = size / aspect;

        // Fill background white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Move to center of canvas for rotation and drawing
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        // Draw image adjusted for current pan position and zoom
        // We need to calculate how much of the original image corresponds to the crop area
        // For simplicity in this basic version, we just draw the image centered and shifted by position
        const drawWidth = img.naturalWidth;
        const drawHeight = img.naturalHeight;

        // Adjust for pan (dividing by zoom because we scaled the context)
        ctx.drawImage(
            img,
            -drawWidth / 2 + position.x / zoom,
            -drawHeight / 2 + position.y / zoom,
            drawWidth,
            drawHeight
        );

        ctx.restore();
        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const handleSave = () => {
        const croppedData = getCroppedImg();
        onCrop(croppedData);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Crop className="w-5 h-5 text-accent" /> Edit Image
                        </h3>
                        <p className="text-xs text-slate-500">Drag to position, use zoom to scale</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* The Crop Area Indicator */}
                    <div className="absolute z-10 w-64 h-64 border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none rounded-lg"
                        style={{ aspectRatio: aspect }}
                    >
                        <div className="absolute inset-0 border border-white/20 grid grid-cols-3 grid-rows-3 pointer-events-none">
                            {[...Array(4)].map((_, i) => <div key={i} className="border-t border-white/20" />)}
                        </div>
                    </div>

                    <img
                        ref={imageRef}
                        src={image}
                        alt="To crop"
                        draggable={false}
                        className="max-none transition-transform duration-75 origin-center select-none"
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                        }}
                    />
                </div>

                <div className="p-6 bg-white dark:bg-slate-800 space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <ZoomOut className="w-4 h-4 text-slate-400" />
                            <input
                                type="range"
                                min="0.1"
                                max="3"
                                step="0.01"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
                            />
                            <ZoomIn className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-mono text-slate-500 min-w-8">{Math.round(zoom * 100)}%</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm font-medium">
                            <button
                                onClick={() => setRotation(prev => prev - 90)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200"
                            >
                                <RotateCcw className="w-4 h-4" /> Rotate -90°
                            </button>
                            <button
                                onClick={() => setRotation(prev => prev + 90)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 transform rotate-180"
                            >
                                <RotateCcw className="w-4 h-4" /> Rotate +90°
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end">
                        <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-2.5 bg-accent text-white font-black rounded-xl shadow-accent active:scale-95 flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropperModal;
