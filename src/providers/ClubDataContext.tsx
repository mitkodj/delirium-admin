import React, { createContext, useContext, useState } from 'react';
import { Floor } from '../types/FloorMap';
import { getLayout } from '../utils/service';

type ClubDataContextType = {
    floors: Floor[];
    setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
    layoutId: string | null;
    layoutLoading: boolean;
    loadLayout: (clubId: string) => Promise<void>;
};

const ClubDataContext = createContext<ClubDataContextType | null>(null);

export const ClubDataProvider = ({ children }: { children: React.ReactNode }) => {
    const [floors, setFloors] = useState<Floor[]>([]);
    const [layoutId, setLayoutId] = useState<string | null>(null);
    const [layoutLoading, setLayoutLoading] = useState(false);

    const loadLayout = async (clubId: string) => {
        if (!clubId || floors.length > 0) return;
        setLayoutLoading(true);
        try {
            const res = await getLayout(clubId);
            const fetched: Floor[] = res?.data?.schema;
            if (fetched?.length) setFloors(fetched);
            if (res?.data?.id) setLayoutId(res.data.id);
        } finally {
            setLayoutLoading(false);
        }
    };

    return (
        <ClubDataContext.Provider value={{ floors, setFloors, layoutId, layoutLoading, loadLayout }}>
            {children}
        </ClubDataContext.Provider>
    );
};

export function useClubData(): ClubDataContextType {
    const ctx = useContext(ClubDataContext);
    if (!ctx) throw new Error('useClubData must be used within ClubDataProvider');
    return ctx;
}
