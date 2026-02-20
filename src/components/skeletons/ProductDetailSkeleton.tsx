import React from 'react';
import { HeroSkeleton } from './HeroSkeleton';

export const ProductDetailSkeleton: React.FC = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 font-display animate-pulse">
            {/* Top Bar Placeholder */}
            <div className="h-14 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 px-4 flex items-center justify-between">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                <div className="w-24 h-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="w-full aspect-[16/10] sm:aspect-[21/9] bg-gray-300 dark:bg-gray-800"></div>

            {/* Title & Price Info */}
            <div className="px-4 py-6 bg-white dark:bg-background-dark space-y-4">
                <div className="flex gap-2">
                    <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded text-xs"></div>
                    <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded text-xs"></div>
                </div>
                <div className="w-3/4 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-1/3 h-8 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-background-dark mt-2">
                <div className="flex-1 py-4 flex justify-center"><div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div></div>
                <div className="flex-1 py-4 flex justify-center"><div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div></div>
                <div className="flex-1 py-4 flex justify-center"><div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div></div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 bg-white dark:bg-background-dark mt-2">
                <div className="w-1/4 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                </div>
            </div>
        </div>
    );
};
