import React from 'react';
import Skeleton from './Skeleton';

const SkeletonList = ({ count = 5, height = "h-12", className = "space-y-3" }) => {
    return (
        <div className={className}>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className={`w-full ${height}`} />
            ))}
        </div>
    );
};

export default SkeletonList;
