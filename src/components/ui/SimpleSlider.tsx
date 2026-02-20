import React, { useState } from 'react';

interface SimpleSliderProps {
    images: string[];
}

export const SimpleSlider: React.FC<SimpleSliderProps> = ({ images }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.offsetWidth;
        // Approximate index based on scroll position
        const index = Math.round(scrollLeft / (width * 0.9)); // Adjust for smaller item width
        setActiveIndex(Math.min(index, images.length - 1));
    };

    if (!images || images.length === 0) return null;

    return (
        <div className="relative w-full my-6 select-none">
            {/* Scroll Container with Peek Effect - Aligned with Text */}
            <div
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
                onScroll={handleScroll}
                style={{ scrollBehavior: 'smooth' }}
            >
                {images.map((src, index) => (
                    <div
                        key={index}
                        className={`flex-shrink-0 w-[90%] aspect-[4/3] snap-center ${index !== images.length - 1 ? 'mr-3' : 'mr-4'}`}
                    >
                        <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                            <img
                                src={src}
                                alt={`Slide ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Counter Badge */}
            <div className="absolute top-4 right-8 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-full z-10 pointer-events-none">
                {activeIndex + 1} / {images.length}
            </div>

            {/* Navigation Arrows for Desktop */}
            <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-2 right-2 justify-between pointer-events-none">
                {activeIndex > 0 && (
                    <button className="w-8 h-8 rounded-full bg-white/80 shadow-md flex items-center justify-center pointer-events-auto hover:bg-white text-slate-800">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                )}
                {activeIndex < images.length - 1 && (
                    <button className="w-8 h-8 rounded-full bg-white/80 shadow-md flex items-center justify-center pointer-events-auto hover:bg-white text-slate-800 ml-auto">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                )}
            </div>
        </div>
    );
};
