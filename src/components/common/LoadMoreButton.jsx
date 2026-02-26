import React from 'react';

const LoadMoreButton = ({
    hasMore,
    loading,
    onLoadMore,
    label = 'Load more',
    className = ''
}) => {
    if (!hasMore) return null;

    return (
        <div className={`mt-4 flex justify-center ${className}`.trim()}>
            <button
                type="button"
                onClick={onLoadMore}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
                {loading ? 'Loading...' : label}
            </button>
        </div>
    );
};

export default LoadMoreButton;

