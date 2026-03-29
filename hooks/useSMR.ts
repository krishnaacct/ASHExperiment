import { useEffect } from 'react';
import { useData } from './useData';

export const useSMR = () => {
    const { superMasterRecord, loading, fetchSuperMasterRecord } = useData();

    useEffect(() => {
        // This effect will trigger the fetch, but the idempotent logic
        // in DataContext will prevent re-fetching if data is already present.
        fetchSuperMasterRecord();
    }, [fetchSuperMasterRecord]);

    return { superMasterRecord, loading };
};
