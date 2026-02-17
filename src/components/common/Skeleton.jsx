import React from 'react';

const Skeleton = ({ className = '' }) => {
    return (
        <div className={`animate-pulse bg-slate-200 dark:bg-slate-700/50 rounded-lg ${className}`}></div>
    );
};

export default Skeleton;
