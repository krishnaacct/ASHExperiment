
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useData } from '../../hooks/useData';
import { useRooms } from '../../hooks/useRooms';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { Check, Search, AlertTriangle, XCircle, ChevronDown, Plus, Calendar, CheckCircle, Lock, Loader, ArrowRight, Play, RotateCcw, AlertOctagon, HelpCircle, Hash, Power, X, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { InventoryAuditEvent, InventoryAuditRecord } from '../../types';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { ConfirmModal } from '../ui/ConfirmModal';
import { toast } from '../ui/Toast';
import { Checkbox } from '../ui/Checkbox';

// --- Circular Progress Component ---
const CircularActionBtn: React.FC<{ 
    percent: number; 
    status: 'OPEN' | 'CLOSED'; 
    onClick: () => void; 
    isLoading?: boolean;
}> = ({ percent, status, onClick, isLoading }) => {
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    const isClosed = status === 'CLOSED';
    const isComplete = percent === 100;
    
    // Color Logic
    let strokeColor = 'stroke-emerald-500';
    let bgColor = 'bg-emerald-50 dark:bg-emerald-900/20';
    let iconColor = 'text-emerald-600 dark:text-emerald-400';
    let borderColor = 'border-emerald-200 dark:border-emerald-800';
    let Icon = Check;

    if (isClosed) {
        strokeColor = 'stroke-blue-400 dark:stroke-blue-500';
        bgColor = 'bg-blue-50 dark:bg-blue-900/20'; 
        iconColor = 'text-blue-600 dark:text-blue-400';
        borderColor = 'border-blue-200 dark:border-blue-800';
        Icon = RotateCcw;
    } else if (!isComplete) {
        strokeColor = 'stroke-orange-500'; 
        bgColor = 'bg-orange-50 dark:bg-orange-900/20';
        iconColor = 'text-orange-600 dark:text-orange-400'; 
        borderColor = 'border-orange-200 dark:border-orange-800';
        Icon = Power;
    }

    return (
        <button 
            onClick={onClick}
            disabled={isLoading}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg group border-2 ${bgColor} ${borderColor}`}
            title={isClosed ? "Reopen Audit" : (isComplete ? "Complete Audit" : "Force Close Audit")}
        >
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 60 60">
                <circle 
                    cx="30" cy="30" r={radius} 
                    fill="transparent" 
                    className="stroke-gray-300/50 dark:stroke-slate-700" 
                    strokeWidth="4" 
                />
                {!isClosed && (
                    <circle 
                        cx="30" cy="30" r={radius} 
                        fill="transparent" 
                        className={`${strokeColor} transition-all duration-1000 ease-out`} 
                        strokeWidth="4" 
                        strokeDashoffset={strokeDashoffset} 
                        strokeDasharray={circumference} 
                        strokeLinecap="round"
                    />
                )}
            </svg>

            <div className={`z-10 flex flex-col items-center justify-center ${iconColor}`}>
                {isLoading ? (
                    <Loader className="w-6 h-6 animate-spin" />
                ) : (
                    <Icon className={`w-6 h-6 stroke-[3px]`} />
                )}
                {!isClosed && !isLoading && (
                    <span className="text-[10px] font-black mt-0.5 leading-none">{percent}%</span>
                )}
            </div>
        </button>
    );
};

const InventoryAudit: React.FC = () => {
    const { fetchAuditEvents, createAuditEvent, fetchEventWorklist, saveAuditRecord, closeAuditEvent, reopenAuditEvent, deleteAuditEvent, items, fetchItems } = useInventory();
    const { mastersData, fetchMasterData } = useData();
    const { data: roomData, fetchDashboardData, loading: roomLoading } = useRooms();

    const [activeEvent, setActiveEvent] = useState<InventoryAuditEvent | null>(null);
    const [events, setEvents] = useState<InventoryAuditEvent[]>([]);
    
    const [worklist, setWorklist] = useState<InventoryAuditRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Action Modal States
    const [actionModal, setActionModal] = useState<{ isOpen: boolean; type: 'CLOSE' | 'FORCE_CLOSE' | 'REOPEN' | 'DELETE' | null }>({ isOpen: false, type: null });
    const [isActionProcessing, setIsActionProcessing] = useState(false);
    const [forceDeleteData, setForceDeleteData] = useState(false);

    const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
    const [recentlyVerified, setRecentlyVerified] = useState<Set<string>>(new Set());
    const [exitingItems, setExitingItems] = useState<Set<string>>(new Set());

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEventMenuOpen, setIsEventMenuOpen] = useState(false);
    const eventMenuRef = useRef<HTMLDivElement>(null);

    const [newEventConfig, setNewEventConfig] = useState<{
        name: string;
        buildingId: string;
        wingId: string;
        basis: string;
        category: string;
        itemId: string;
        roomIds: string[];
    }>({ 
        name: '', 
        buildingId: '', 
        wingId: '',
        basis: '',
        category: '', 
        itemId: '',
        roomIds: [] 
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [viewFilter, setViewFilter] = useState<'ALL' | 'PENDING' | 'ISSUES'>('PENDING');

    useEffect(() => {
        loadEvents();
        fetchItems(); 
        fetchMasterData(); 
        
        const handleClickOutside = (event: MouseEvent) => {
            if (eventMenuRef.current && !eventMenuRef.current.contains(event.target as Node)) {
                setIsEventMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (newEventConfig.buildingId) {
            fetchDashboardData(newEventConfig.buildingId);
        }
    }, [newEventConfig.buildingId, fetchDashboardData]);

    const loadEvents = async () => {
        setIsLoading(true);
        const data = await fetchAuditEvents();
        setEvents(data);
        setIsLoading(false);
    };

    const handleStartAudit = async (event: InventoryAuditEvent) => {
        setActiveEvent(event);
        if (event.status === 'CLOSED') {
            setViewFilter('ISSUES');
        } else {
            setViewFilter('PENDING');
        }

        setIsLoading(true);
        setIsEventMenuOpen(false);
        try {
            const list = await fetchEventWorklist(event.eventId);
            setWorklist(list);
            setRecentlyVerified(new Set());
            setExitingItems(new Set());
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        if (!newEventConfig.buildingId || !newEventConfig.name) return;
        setIsLoading(true);
        try {
            const created = await createAuditEvent(newEventConfig);
            setEvents(prev => [created, ...prev]);
            setIsCreateOpen(false);
            await handleStartAudit(created);
        } catch (e) {
             console.error("Creation failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCircularAction = () => {
        if (!activeEvent) return;
        if (activeEvent.status === 'CLOSED') {
            setActionModal({ isOpen: true, type: 'REOPEN' });
        } else {
            if (progressStats.percent === 100) {
                 setActionModal({ isOpen: true, type: 'CLOSE' });
            } else {
                 setActionModal({ isOpen: true, type: 'FORCE_CLOSE' });
            }
        }
    };

    const handleConfirmAction = async () => {
        if (!activeEvent || !actionModal.type) return;
        setIsActionProcessing(true);
        try {
            if (actionModal.type === 'CLOSE' || actionModal.type === 'FORCE_CLOSE') {
                await closeAuditEvent(activeEvent.eventId);
                toast("Audit marked as completed.", "success");
                setActiveEvent(prev => prev ? { ...prev, status: 'CLOSED' } : null);
            } else if (actionModal.type === 'REOPEN') {
                await reopenAuditEvent(activeEvent.eventId);
                toast("Audit reopened for editing.", "success");
                setActiveEvent(prev => prev ? { ...prev, status: 'OPEN' } : null);
            } else if (actionModal.type === 'DELETE') {
                await deleteAuditEvent(activeEvent.eventId, forceDeleteData);
                setActiveEvent(null);
                setWorklist([]);
                setRecentlyVerified(new Set());
                setExitingItems(new Set());
            }
            
            const data = await fetchAuditEvents();
            setEvents(data);
            setActionModal({ isOpen: false, type: null });
        } catch (e) {
            console.error("Action failed", e);
            toast(e instanceof Error ? e.message : "Action failed", "error");
        } finally {
            setIsActionProcessing(false);
        }
    };

    const wingOptions = useMemo(() => mastersData.filter(m => m.masterName === 'Wings' && m.isActive).map(m => ({ value: m.value, label: m.label })), [mastersData]);
    const basisOptions = useMemo(() => mastersData.filter(m => m.masterName === 'InventoryBasis' && m.isActive).map(m => ({ value: m.value, label: m.label })), [mastersData]);
    const categoryOptions = useMemo(() => mastersData.filter(m => m.masterName === 'InventoryCategories' && m.isActive).map(m => ({ value: m.value, label: m.label })), [mastersData]);
    const statusMasters = useMemo(() => mastersData.filter(m => m.masterName === 'InventoryItemStatus' && m.isActive), [mastersData]);
    
    const getMasterIdByValue = (value: string) => statusMasters.find(m => m.value === value)?.masterId;
    const isStatusPositive = (statusValue: string) => {
        if (statusValue === 'PENDING') return true; 
        const masterId = getMasterIdByValue(statusValue);
        return masterId === 'stat-01'; 
    };

    const updateLocalState = (uniqueKey: string, updates: Partial<InventoryAuditRecord>) => {
        setWorklist(prev => prev.map(item => {
            // UPDATED: uniqueKey now includes basis to handle multiple records for the same item in the same room
            const itemKey = item.recordId || `${item.roomId}-${item.itemId}-${item.basis}`;
            if (itemKey !== uniqueKey) return item;
            return { ...item, ...updates };
        }));
    };

    const handleVerifyRecord = async (item: InventoryAuditRecord) => {
        if (activeEvent?.status === 'CLOSED') return;
        const uniqueKey = item.recordId || `${item.roomId}-${item.itemId}-${item.basis}`;

        if (item.isVerified) {
            setRecentlyVerified(prev => { const next = new Set(prev); next.delete(uniqueKey); return next; });
            setExitingItems(prev => { const next = new Set(prev); next.delete(uniqueKey); return next; });
            setProcessingItems(prev => new Set(prev).add(uniqueKey));
            try {
                const resetItem = { ...item, isVerified: false, status: 'PENDING' as const };
                setWorklist(prev => prev.map(i => (i.recordId || `${i.roomId}-${i.itemId}-${i.basis}`) === uniqueKey ? resetItem : i));
                await saveAuditRecord(resetItem); 
            } catch (e) { console.error(e); toast("Failed to revert record.", "error"); } 
            finally { setProcessingItems(prev => { const next = new Set(prev); next.delete(uniqueKey); return next; }); }
        } else {
            if (item.status === 'PENDING') { toast("Please select a status.", "error"); return; }
            const isGood = isStatusPositive(item.status);
            if (!isGood && !item.notes) { toast("Please provide a reason.", "error"); return; }
            if (viewFilter === 'PENDING') setRecentlyVerified(prev => new Set(prev).add(uniqueKey));
            setProcessingItems(prev => new Set(prev).add(uniqueKey));
            try {
                const newItem = { ...item, isVerified: true };
                setWorklist(prev => prev.map(i => (i.recordId || `${i.roomId}-${i.itemId}-${i.basis}`) === uniqueKey ? newItem : i));
                await saveAuditRecord(newItem);
                if (viewFilter === 'PENDING') {
                    setTimeout(() => {
                        setExitingItems(prev => new Set(prev).add(uniqueKey));
                        setTimeout(() => {
                            setRecentlyVerified(prev => { const next = new Set(prev); next.delete(uniqueKey); return next; });
                            setExitingItems(prev => { const next = new Set(prev); next.delete(uniqueKey); return next; });
                        }, 500); 
                    }, 1000); 
                }
            } catch (e) { console.error(e); toast("Failed to save.", "error"); } 
            finally { setProcessingItems(prev => { const next = new Set(prev); next.delete(uniqueKey); return next; }); }
        }
    };

    const getStatusStyle = (statusValue: string) => {
        if (statusValue === 'PENDING') return { icon: HelpCircle, color: 'bg-blue-500 text-white', hover: 'hover:text-blue-600', badge: 'bg-[var(--badge-primary-background)] text-[var(--badge-primary-foreground)] rounded-full px-2', cardBorder: 'border-[var(--border)]', cardBg: 'bg-[var(--card-background)]' };
        const masterId = getMasterIdByValue(statusValue);
        if (masterId === 'stat-01') return { icon: CheckCircle, color: 'bg-emerald-500 text-white', hover: 'hover:text-emerald-600', badge: 'bg-white text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800 rounded-full px-2 shadow-sm', cardBorder: 'border-emerald-300 dark:border-emerald-800', cardBg: 'bg-emerald-50 dark:bg-emerald-900/15' };
        if (masterId === 'stat-02') return { icon: AlertTriangle, color: 'bg-yellow-500 text-white', hover: 'hover:text-yellow-600', badge: 'bg-white text-yellow-700 border border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800 rounded-full px-2 shadow-sm', cardBorder: 'border-yellow-400 dark:border-yellow-800', cardBg: 'bg-yellow-50 dark:bg-emerald-900/15' };
        if (masterId === 'stat-03') return { icon: XCircle, color: 'bg-red-500 text-white', hover: 'hover:text-red-600', badge: 'bg-white text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800 rounded-full px-2 shadow-sm', cardBorder: 'border-red-300 dark:border-red-800', cardBg: 'bg-red-50 dark:bg-red-900/15' };
        if (masterId === 'stat-04') return { icon: AlertOctagon, color: 'bg-orange-500 text-white', hover: 'hover:text-orange-600', badge: 'bg-white text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800 rounded-full px-2 shadow-sm', cardBorder: 'border-orange-300 dark:border-orange-800', cardBg: 'bg-orange-50 dark:bg-emerald-900/15' };
        return { icon: HelpCircle, color: 'bg-gray-500 text-white', hover: 'hover:text-gray-600', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-full px-2', cardBorder: 'border-[var(--border)]', cardBg: 'bg-[var(--card-background)]' };
    };

    const getStatusInfo = (statusValue: string) => {
        if (statusValue === 'PENDING') return { badge: 'TODO', tooltip: 'Not checked' };
        const master = statusMasters.find(m => m.value === statusValue);
        return { badge: master ? master.value : statusValue, tooltip: master ? master.label : statusValue };
    };

    const itemOptions = useMemo(() => {
        let filteredItems = items.filter(i => String(i.isActive).toLowerCase() === 'true');
        if (newEventConfig.category) filteredItems = filteredItems.filter(i => i.category === newEventConfig.category);
        return filteredItems.map(i => ({ value: i.itemId, label: i.itemName })).sort((a,b) => a.label.localeCompare(b.label));
    }, [items, newEventConfig.category]);

    const roomOptions = useMemo(() => {
        if (!roomData?.rooms) return [];
        return roomData.rooms.sort((a,b) => a.roomLabel.localeCompare(b.roomLabel, undefined, {numeric: true})).map(r => ({ value: r.roomId, label: r.roomLabel }));
    }, [roomData]);

    const enrichedWorklist = useMemo(() => {
        return worklist.map(record => {
            if (record.category) return record; 
            const masterItem = items.find(i => i.itemId === record.itemId);
            return { ...record, category: masterItem?.category || 'Other' };
        });
    }, [worklist, items]);

    const filteredItems = useMemo(() => {
        let filtered = enrichedWorklist;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(i => {
                const itemMatch = (i.itemName || '').toLowerCase().indexOf(lower) !== -1;
                const roomMatch = (i.roomLabel || '').toLowerCase().indexOf(lower) !== -1;
                const basisMatch = (i.basis || '').toLowerCase().replace(/_/g, ' ').indexOf(lower) !== -1;
                const categoryMatch = (i.category || '').toLowerCase().indexOf(lower) !== -1;
                return itemMatch || roomMatch || basisMatch || categoryMatch;
            });
        }
        if (viewFilter === 'PENDING') filtered = filtered.filter(i => { const uKey = i.recordId || `${i.roomId}-${i.itemId}-${i.basis}`; return !i.isVerified || recentlyVerified.has(uKey); });
        if (viewFilter === 'ISSUES') filtered = filtered.filter(i => !isStatusPositive(i.status));
        return [...filtered].sort((a, b) => {
            const getFloorVal = (f: string) => {
                const s = String(f || '').trim().toUpperCase();
                if (s === 'B' || s.startsWith('BASE')) return -2;
                if (s === 'G' || s.startsWith('GRO')) return -1;
                if (s === 'T' || s.startsWith('TER')) return 9999;
                const n = parseInt(s);
                return isNaN(n) ? 100 : n; 
            };
            const fA = getFloorVal(a.floorLabel); const fB = getFloorVal(b.floorLabel);
            if (fA !== fB) return fA - fB;
            const flatDiff = String((a as any).flatLabel || '').localeCompare(String((b as any).flatLabel || ''), undefined, { numeric: true });
            if (flatDiff !== 0) return flatDiff;
            const roomDiff = String(a.roomLabel || '').localeCompare(String(b.roomLabel || ''), undefined, { numeric: true });
            if (roomDiff !== 0) return roomDiff;
            const catDiff = String(a.category || '').localeCompare(String(b.category || ''));
            if (catDiff !== 0) return catDiff;
            const itemDiff = String(a.itemName || '').localeCompare(String(b.itemName || ''));
            if (itemDiff !== 0) return itemDiff;
            return String(a.basis || '').localeCompare(String(b.basis || ''));
        });
    }, [enrichedWorklist, searchTerm, viewFilter, recentlyVerified]);
    
    const progressStats = useMemo(() => {
        const total = worklist.length;
        const verified = worklist.filter(i => i.isVerified).length;
        return { total, verified, percent: total > 0 ? Math.round((verified/total)*100) : 0 };
    }, [worklist]);

    const formatDateString = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'short' });
        const year = String(date.getFullYear()).slice(-2);
        const time = date.toLocaleString('default', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${day}-${month}-${year} ${time}`;
    };

    if (isLoading && events.length === 0 && !activeEvent) {
        return <WorkstationSkeleton type="grid" />;
    }

    return (
        <div className="space-y-4 pb-20 relative min-h-[80vh]">
            <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 sticky -top-4 sm:-top-6 z-30 bg-[var(--card-background)] border-b border-[var(--border)] shadow-sm px-4 sm:px-6 py-4">
                <div>
                    <div className="flex justify-between items-start mb-4 gap-4">
                        <div className="relative" ref={eventMenuRef}>
                            <button 
                                onClick={() => setIsEventMenuOpen(!isEventMenuOpen)}
                                className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)] hover:text-[var(--primary-color)] transition-colors text-left"
                            >
                                <span className="truncate max-w-[200px] sm:max-w-[300px]">
                                    {activeEvent ? activeEvent.name : "Select Audit Event"}
                                </span>
                                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isEventMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {activeEvent ? (
                                activeEvent.status === 'CLOSED' ? (
                                    <div className="flex items-center mt-1 text-xs font-medium text-slate-500">
                                        <Lock size={12} className="mr-1"/> Closed
                                    </div>
                                ) : (
                                    <div className="flex items-center mt-1 gap-2 flex-wrap">
                                        <div className="flex items-center text-xs font-medium text-emerald-600 animate-pulse">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5"></div> Live Audit • {formatDateString(activeEvent.createdAt)}
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-black px-1.5 py-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
                                            {progressStats.verified} / {progressStats.total}
                                        </Badge>
                                    </div>
                                )
                            ) : null}

                            {isEventMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-72 bg-[var(--popover-background)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2 border-b border-[var(--border)] bg-[var(--card-inset-background)]">
                                        <span className="text-[10px] font-black uppercase text-[var(--foreground-muted)] tracking-wider">Switch Event</span>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {events.map(ev => (
                                            <button
                                                key={ev.eventId}
                                                onClick={() => handleStartAudit(ev)}
                                                className={`w-full text-left p-3 text-sm hover:bg-[var(--list-item-hover-background)] transition-colors flex justify-between items-center ${ev.eventId === activeEvent?.eventId ? 'bg-[var(--accent-background)]' : ''}`}
                                            >
                                                <span className={`font-medium ${ev.eventId === activeEvent?.eventId ? 'text-[var(--primary-color)]' : 'text-[var(--foreground)]'}`}>
                                                    {ev.name}
                                                </span>
                                                {ev.status === 'CLOSED' && <Lock size={12} className="text-gray-400" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t border-[var(--border)]">
                                            <button 
                                            onClick={() => { setIsEventMenuOpen(false); setIsCreateOpen(true); }}
                                            className="w-full py-2 text-center text-xs font-bold text-[var(--primary-color)] hover:bg-[var(--accent-background)] rounded-lg transition-colors"
                                            >
                                                + Create New Audit
                                            </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            {activeEvent ? (
                                <>
                                    <Button 
                                        variant="danger" 
                                        size="sm" 
                                        className="h-10 w-10 p-0 shadow-md"
                                        onClick={() => { setForceDeleteData(false); setActionModal({ isOpen: true, type: 'DELETE' }); }}
                                        title="Delete Audit Event"
                                    >
                                        <Trash2 size={20} />
                                    </Button>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-2xl font-black text-[var(--primary-color)] leading-none">{progressStats.percent}%</p>
                                        <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider font-bold mt-1">
                                            Completed
                                        </p>
                                    </div>
                                    <CircularActionBtn 
                                        percent={progressStats.percent} 
                                        status={activeEvent.status}
                                        onClick={handleCircularAction}
                                        isLoading={isActionProcessing}
                                    />
                                </>
                            ) : (
                                <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">
                                    <Plus className="w-5 h-5 mr-2"/> New Audit
                                </Button>
                            )}
                        </div>
                    </div>

                    {activeEvent && (
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search room, item, category, basis..."
                                    className="w-full pl-9 py-2 text-sm bg-[var(--card-background)] border border-[var(--border)] text-[var(--foreground)] rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-shadow placeholder-[var(--placeholder-foreground)]"
                                />
                            </div>
                            <div className="flex bg-[var(--card-background)] rounded-lg p-1 border border-[var(--border)] shrink-0 gap-1">
                                    <button onClick={() => setViewFilter('ALL')} className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase transition-all ${viewFilter === 'ALL' ? 'bg-[var(--primary-color)] text-white shadow-sm' : 'text-[var(--foreground-muted)] hover:bg-[var(--list-item-hover-background)]'}`}>All</button>
                                    <button onClick={() => setViewFilter('PENDING')} className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase transition-all ${viewFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--foreground-muted)] hover:bg-[var(--list-item-hover-background)]'}`}>Todo</button>
                                    <button onClick={() => setViewFilter('ISSUES')} className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase transition-all ${viewFilter === 'ISSUES' ? 'bg-red-50 text-red-700' : 'text-[var(--foreground-muted)] hover:bg-[var(--list-item-hover-background)]'}`}>Issues</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isLoading && <SurfaceLoader label="Loading Worklist..." />}
            
            {!activeEvent ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6 pb-20">
                    {events.length === 0 && !isLoading && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--card-inset-background)]">
                            <div className="p-4 bg-[var(--card-background)] rounded-full shadow-sm mb-4">
                                 <AlertOctagon className="w-8 h-8 text-[var(--foreground-muted)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--foreground)]">No Audit Events Found</h3>
                            <p className="text-sm text-[var(--foreground-muted)] mt-1 mb-6">Start a new inventory audit campaign to begin tracking assets.</p>
                            <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">
                                <Plus className="w-5 h-5 mr-2"/> Create First Audit
                            </Button>
                        </div>
                    )}
                    
                    {events.map(event => {
                        const isOpen = event.status === 'OPEN';
                        let scopeSummary = 'Facility Wide';
                        try {
                            const c = JSON.parse(event.scopeConfig);
                            const bld = mastersData.find(m => m.masterName === 'Buildings' && m.value === c.buildingId)?.label;
                            const cat = c.category;
                            if (bld) scopeSummary = bld;
                            if (cat) scopeSummary += ` • ${cat}`;
                        } catch (e) {}

                        return (
                            <div key={event.eventId} onClick={() => handleStartAudit(event)} className="group cursor-pointer h-full">
                                <div className={`
                                    relative h-full p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between
                                    ${isOpen 
                                        ? 'bg-[var(--card-background)] border-emerald-200 dark:border-emerald-800 shadow-sm hover:shadow-xl hover:border-emerald-400 hover:-translate-y-1' 
                                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 opacity-80 hover:opacity-100'
                                    }
                                `}>
                                    {isOpen && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-2xl"></div>}
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`p-2 rounded-lg ${isOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                {isOpen ? <Play className="w-5 h-5 fill-current" /> : <Lock className="w-5 h-5" />}
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${isOpen ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                {event.status}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-[var(--foreground)] mb-1 line-clamp-2 leading-tight">
                                            {event.name}
                                        </h3>
                                        <p className="text-xs font-medium text-[var(--foreground-muted)] mb-6 flex items-center">
                                            {scopeSummary}
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center mt-auto">
                                        <div className="flex items-center text-xs text-[var(--foreground-muted)] font-mono">
                                            <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                                            {new Date(event.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </div>
                                        <span className={`text-xs font-bold flex items-center transition-transform group-hover:translate-x-1 ${isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                            {isOpen ? 'Resume Audit' : 'View Results'} 
                                            <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={2.5} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200 mt-6 pb-20">
                    {filteredItems.map(item => {
                        const uniqueKey = item.recordId || `${item.roomId}-${item.itemId}-${item.basis}`;
                        const isProcessing = processingItems.has(uniqueKey);
                        const isError = item.actualQty !== item.expectedQty;
                        const isExiting = exitingItems.has(uniqueKey);
                        const isMissingRemark = !isStatusPositive(item.status) && item.status !== 'PENDING' && !item.notes;
                        
                        const style = getStatusStyle(item.status);
                        const isGood = isStatusPositive(item.status);
                        const borderColor = item.isVerified ? style.cardBorder : 'border-[var(--border)]';
                        const bgColor = item.isVerified ? style.cardBg : 'bg-[var(--card-background)]';
                        const statusInfo = getStatusInfo(item.status);

                        return (
                            <div 
                                key={uniqueKey} 
                                className={`transition-all duration-500 ease-out overflow-hidden ${
                                    isExiting 
                                    ? 'opacity-0 scale-95 blur-md grayscale -translate-y-4 max-h-0 py-0 min-h-0 mx-0 my-0 border-0 pointer-events-none' 
                                    : 'max-h-[500px] opacity-100 scale-100 blur-0 p-3 border-2'
                                } rounded-xl ${bgColor} ${borderColor} shadow-sm`}
                            >
                                <div className="grid grid-cols-[30%_25%_45%] gap-2 mb-2">
                                    <div className="flex flex-col justify-between h-full gap-1">
                                        <div className="font-bold text-[var(--foreground)] text-sm truncate" title={item.itemName}>{item.itemName}</div>
                                        <div className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-tight truncate">
                                            {item.category} • {item.basis?.replace(/_/g, ' ')}
                                        </div>
                                        <Badge variant="primary" className="text-[10px] px-2 py-0.5 rounded-full w-fit max-w-full truncate text-center">
                                            {item.roomLabel}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col items-center justify-between h-full gap-1">
                                        <input 
                                            type="number"
                                            min="0"
                                            className={`w-full h-12 text-center rounded-lg font-bold text-lg outline-none transition-all px-0 disabled:bg-[var(--input-disabled-background)] disabled:border-[var(--input-disabled-border)] disabled:text-[var(--input-disabled-foreground)] disabled:cursor-not-allowed ${isError ? 'border-2 border-red-500 text-red-600 dark:text-red-400' : 'bg-[var(--card-background)] text-[var(--foreground)] border border-[var(--input)] focus:ring-2 focus:ring-[var(--primary-color)]'}`}
                                            value={item.actualQty}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                let newStatus = item.status;
                                                if (!isNaN(val) && val !== item.expectedQty) {
                                                    const failureStatus = statusMasters.find(m => m.masterId === 'stat-02');
                                                    newStatus = (failureStatus ? failureStatus.value : 'NOT_OK') as any;
                                                }
                                                else if (!isNaN(val) && val === item.expectedQty) {
                                                    const okStatus = statusMasters.find(m => m.masterId === 'stat-01');
                                                    newStatus = (okStatus ? okStatus.value : 'OK') as any;
                                                }
                                                updateLocalState(uniqueKey, { actualQty: isNaN(val) ? 0 : val, status: newStatus as any });
                                            }}
                                            disabled={item.isVerified || activeEvent.status === 'CLOSED'}
                                        />
                                        <Badge variant="primary" className="text-[10px] px-1 py-0.5 rounded-full w-full text-center truncate">Exp Qty: {item.expectedQty}</Badge>
                                    </div>
                                    <div className="flex flex-col justify-between h-full gap-1">
                                        <div className="flex bg-[var(--card-background)] border border-[var(--input)] rounded-lg p-0.5 justify-between gap-0.5 w-[95%] h-12 items-center px-1">
                                            {statusMasters.map((master) => {
                                                const sStyle = getStatusStyle(master.value);
                                                const Icon = sStyle.icon;
                                                const isSelected = item.status === master.value;
                                                return (
                                                    <button 
                                                        key={master.value}
                                                        onClick={() => updateLocalState(uniqueKey, { status: master.value as any, actualQty: master.masterId === 'stat-01' ? item.expectedQty : item.actualQty })} 
                                                        disabled={item.isVerified || activeEvent.status === 'CLOSED'}
                                                        className={`flex-1 flex justify-center items-center h-full rounded-md transition-all ${
                                                            isSelected 
                                                            ? sStyle.color + ' shadow-sm' 
                                                            : `text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300`
                                                        }`}
                                                        title={master.label}
                                                    >
                                                        <Icon size={18}/>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                            <div className="flex justify-center w-full">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase truncate max-w-full ${style.badge}`}>
                                                {statusInfo.badge}
                                            </span>
                                            </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-1">
                                    <div className="flex-grow">
                                        <div className="relative">
                                            <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--foreground-muted)] opacity-50" />
                                            <input 
                                                type="text" 
                                                placeholder={!isGood && item.status !== 'PENDING' ? "Reason required..." : "Add remarks..."}
                                                className={`w-full pl-7 pr-3 py-2 text-sm rounded-lg outline-none transition-all disabled:bg-[var(--input-disabled-background)] disabled:border-[var(--input-disabled-border)] disabled:text-[var(--input-disabled-foreground)] disabled:cursor-not-allowed ${
                                                    isMissingRemark
                                                        ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-900 dark:text-red-100 placeholder-red-400' 
                                                        : 'bg-[var(--card-background)] text-[var(--foreground)] border border-[var(--input)] focus:ring-2 focus:ring-[var(--primary-color)]'
                                                }`}
                                                value={item.notes || ''}
                                                onChange={(e) => updateLocalState(uniqueKey, { notes: e.target.value })}
                                                disabled={item.isVerified || activeEvent.status === 'CLOSED'}
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleVerifyRecord(item)}
                                        className={`relative h-10 min-w-[60px] w-[20%] rounded-lg border-[1.5px] flex items-center justify-center transition-all shadow-sm font-bold text-sm ${
                                            item.isVerified 
                                                ? 'bg-transparent border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                                : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700 active:scale-95'
                                        } ${activeEvent.status === 'CLOSED' || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={activeEvent.status === 'CLOSED' || isProcessing}
                                        title={item.isVerified ? "Revert / Edit" : "Verify & Save"}
                                    >
                                        {isProcessing ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader className="w-5 h-5 animate-spin text-current" strokeWidth={2.5} />
                                            </div>
                                        ) : (
                                            <span className={`flex items-center justify-center transition-opacity duration-200 ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
                                                {item.isVerified ? <RotateCcw className="w-5 h-5 stroke-[1.5px]" /> : <Check className="w-6 h-6 stroke-[1.5px]" />}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                     {filteredItems.length === 0 && <p className="text-center text-gray-500 py-10">No items match your filter.</p>}
                </div>
            )}
            
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Start New Audit">
                <div className="space-y-4">
                    <Input 
                        label="Audit Name" 
                        value={newEventConfig.name} 
                        onChange={e => setNewEventConfig({...newEventConfig, name: e.target.value})} 
                        placeholder="e.g. Building A - Electrical - Q3" 
                        required 
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="Building *" 
                            value={newEventConfig.buildingId} 
                            onChange={v => setNewEventConfig({...newEventConfig, buildingId: v})} 
                            options={mastersData.filter(m => m.masterName === 'Buildings').map(m => ({ value: m.value, label: m.label }))}
                            required
                        />
                        <Select 
                            label="Wing (Optional)" 
                            value={newEventConfig.wingId} 
                            onChange={v => setNewEventConfig({...newEventConfig, wingId: v})} 
                            options={[{ value: '', label: 'All Wings' }, ...wingOptions]}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                            <Select 
                            label="Basis (Optional)" 
                            value={newEventConfig.basis} 
                            onChange={v => setNewEventConfig({...newEventConfig, basis: v})} 
                            options={[{ value: '', label: 'All Types' }, ...basisOptions]}
                        />
                        <Select 
                            label="Category (Optional)" 
                            value={newEventConfig.category} 
                            onChange={v => setNewEventConfig({...newEventConfig, category: v, itemId: ''})} 
                            options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                            <Select 
                            label="Specific Item (Optional)" 
                            value={newEventConfig.itemId} 
                            onChange={v => setNewEventConfig({...newEventConfig, itemId: v})} 
                            options={[{ value: '', label: 'All Items' }, ...itemOptions]}
                            placeholder={newEventConfig.category ? `Filter ${newEventConfig.category} items...` : "Select item..."}
                        />
                            <MultiSelectCombobox 
                            label="Rooms (Optional)" 
                            selectedValues={newEventConfig.roomIds}
                            onChange={ids => setNewEventConfig({...newEventConfig, roomIds: ids})}
                            options={roomOptions}
                            placeholder="All Rooms"
                            disabled={!newEventConfig.buildingId}
                            loading={roomLoading}
                        />
                    </div>
                    <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                        <Button onClick={handleCreateEvent} isLoading={isLoading}>Create & Start</Button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={actionModal.isOpen && actionModal.type !== 'DELETE'}
                onClose={() => setActionModal({ isOpen: false, type: null })}
                onConfirm={handleConfirmAction}
                title={actionModal.type === 'REOPEN' ? 'Reopen Audit' : (actionModal.type === 'FORCE_CLOSE' ? 'Force Close Audit' : 'Complete Audit')}
                message={
                    actionModal.type === 'REOPEN' 
                    ? "Are you sure you want to reopen this audit for editing? It will be marked as 'OPEN' again."
                    : (actionModal.type === 'FORCE_CLOSE' 
                        ? `There are ${progressStats.total - progressStats.verified} items still pending or unverified. Do you really want to force-close this audit?`
                        : "All items verified. Close and finalize this audit event?")
                }
                confirmText={actionModal.type === 'REOPEN' ? "Reopen" : (actionModal.type === 'FORCE_CLOSE' ? "Force Close" : "Complete")}
                isLoading={isActionProcessing}
            />

            {/* DELETE MODAL */}
            {actionModal.isOpen && actionModal.type === 'DELETE' && (
                <Modal isOpen={true} onClose={() => setActionModal({ isOpen: false, type: null })} title="Delete Audit Event">
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 flex gap-4">
                             <AlertOctagon className="w-8 h-8 text-red-600 shrink-0" />
                             <div>
                                 <p className="font-bold text-red-700 dark:text-red-300">Danger: Destructive Action</p>
                                 <p className="text-sm text-red-600 dark:text-red-400">Are you sure you want to delete the event <strong>{activeEvent?.name}</strong>?</p>
                             </div>
                        </div>

                        <Checkbox 
                            id="force-delete-records"
                            label={<span className="text-sm font-bold text-[var(--foreground)]">Also delete all recorded audit data for this event</span>}
                            checked={forceDeleteData}
                            onChange={(e) => setForceDeleteData(e.target.checked)}
                        />

                        {!forceDeleteData && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Note: Deletion will be blocked if audit data exists unless the above box is checked.
                            </p>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t">
                             <Button variant="secondary" onClick={() => setActionModal({ isOpen: false, type: null })}>Cancel</Button>
                             <Button variant="danger" onClick={handleConfirmAction} isLoading={isActionProcessing}>Delete Event</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default InventoryAudit;
