import React, { createContext, useContext, useState } from 'react';

type SidebarContextType = {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    return (
        <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar: () => setSidebarOpen(v => !v) }}>
            {children}
        </SidebarContext.Provider>
    );
};

export function useSidebar(): SidebarContextType {
    const ctx = useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
    return ctx;
}
