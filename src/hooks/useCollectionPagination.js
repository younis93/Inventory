import { useCallback, useEffect, useRef, useState } from 'react';
import { dataClient } from '../data/dataClient';

const INITIAL_PAGE_SIZE = 50;

export const useCollectionPagination = ({
    collectionName,
    enabled = true,
    sortField = 'updatedAt',
    sortOrder = 'desc',
    pageSize = INITIAL_PAGE_SIZE,
    refreshKey
}) => {
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingInitial, setLoadingInitial] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [error, setError] = useState(null);

    const requestTokenRef = useRef(0);

    const reset = useCallback(async () => {
        if (!enabled || !collectionName) return;

        const requestToken = ++requestTokenRef.current;
        setLoadingInitial(true);
        setLoadingMore(false);
        setInitialized(false);
        setError(null);

        try {
            const result = await dataClient.listPage(collectionName, {
                sortField,
                sortOrder,
                limitCount: pageSize,
                cursor: null
            });

            if (requestToken !== requestTokenRef.current) return;
            setItems(result.data || []);
            setCursor(result.cursor ?? null);
            setHasMore(Boolean(result.hasMore));
        } catch (fetchError) {
            if (requestToken !== requestTokenRef.current) return;
            setItems([]);
            setCursor(null);
            setHasMore(false);
            setError(fetchError);
        } finally {
            if (requestToken === requestTokenRef.current) {
                setLoadingInitial(false);
                setInitialized(true);
            }
        }
    }, [collectionName, enabled, pageSize, sortField, sortOrder]);

    const loadMore = useCallback(async () => {
        if (!enabled || !collectionName || !initialized || loadingInitial || loadingMore || !hasMore) return;

        const requestToken = requestTokenRef.current;
        setLoadingMore(true);
        setError(null);

        try {
            const result = await dataClient.listPage(collectionName, {
                sortField,
                sortOrder,
                limitCount: pageSize,
                cursor
            });

            if (requestToken !== requestTokenRef.current) return;
            const nextItems = Array.isArray(result.data) ? result.data : [];
            setItems((prev) => {
                if (nextItems.length === 0) return prev;
                const merged = [...prev];
                const seen = new Set(prev.map((item) => item?._id));
                nextItems.forEach((entry) => {
                    if (!entry?._id || seen.has(entry._id)) return;
                    seen.add(entry._id);
                    merged.push(entry);
                });
                return merged;
            });
            setCursor(result.cursor ?? cursor ?? null);
            setHasMore(Boolean(result.hasMore));
        } catch (fetchError) {
            if (requestToken !== requestTokenRef.current) return;
            setError(fetchError);
        } finally {
            setLoadingMore(false);
        }
    }, [
        collectionName,
        cursor,
        enabled,
        hasMore,
        initialized,
        loadingInitial,
        loadingMore,
        pageSize,
        sortField,
        sortOrder
    ]);

    useEffect(() => {
        if (!enabled || !collectionName) {
            setItems([]);
            setCursor(null);
            setHasMore(false);
            setLoadingInitial(false);
            setLoadingMore(false);
            setInitialized(false);
            setError(null);
            return;
        }

        void reset();
    }, [collectionName, enabled, refreshKey, reset]);

    return {
        items,
        hasMore,
        loadingInitial,
        loadingMore,
        initialized,
        error,
        loadMore,
        reset
    };
};
