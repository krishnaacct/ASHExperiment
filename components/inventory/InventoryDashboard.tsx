import React, { useState, useEffect } from 'react';
import { Package, Ruler } from 'lucide-react';
import InventoryItemManager from './InventoryItemManager';
import RoomStandardsManager from './RoomStandardsManager';
import { useAuth } from '../../hooks/useAuth';

type Tab = 'items' | 'standards';

const InventoryDashboard: React.FC = () => {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab | null>(null);

    const canViewItems = hasPermission('inventory_items_view');
    const canViewStandards = hasPermission('room_standards_view');

    useEffect(() => {
        if (canViewItems) {
            setActiveTab('items');
        } else if (canViewStandards) {
            setActiveTab('standards');
        } else {
            setActiveTab(null);
        }
    }, [canViewItems, canViewStandards]);

    if (!activeTab) {
        return <div className="p-8 text-center text-[var(--foreground-muted)]">You do not have permission to view inventory configurations.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Inventory Configuration</h1>
                <div className="inline-flex rounded-lg bg-[var(--tab-background)] p-1 space-x-1 overflow-x-auto">
                    {canViewItems && (
                        <button 
                            onClick={() => setActiveTab('items')} 
                            className={`${activeTab === 'items' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}
                        >
                            <Package className="w-4 h-4 mr-2" /> Items Master
                        </button>
                    )}
                    {canViewStandards && (
                        <button 
                            onClick={() => setActiveTab('standards')} 
                            className={`${activeTab === 'standards' ? 'bg-[var(--tab-active-background)] shadow text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'} py-2 px-4 rounded-md font-medium text-sm transition-all flex items-center`}
                        >
                            <Ruler className="w-4 h-4 mr-2" /> Room Standards
                        </button>
                    )}
                </div>
            </div>

            {/* KEEP-ALIVE TAB RENDERING */}
            <div className={activeTab === 'items' ? 'block' : 'hidden'}>
                {canViewItems && <InventoryItemManager />}
            </div>
            <div className={activeTab === 'standards' ? 'block' : 'hidden'}>
                {canViewStandards && <RoomStandardsManager />}
            </div>
        </div>
    );
};

export default InventoryDashboard;