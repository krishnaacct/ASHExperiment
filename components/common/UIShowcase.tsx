import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { 
  Home, CheckCircle2, Users, AlertCircle, Plus, Layout, Activity, Clock, Loader2, RotateCw, 
  Search, Send, Trash2, Edit, Copy, RotateCcw, History, Settings, ChevronDown, 
  ChevronUp, Database, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, LogOut, Sun, Moon, Monitor
} from 'lucide-react';
import { getIndicatorStyle } from '../../utils/styleUtils';
import { WorkstationSkeleton } from './WorkstationSkeleton';
import { SurfaceLoader } from './SurfaceLoader';
import { ProgressBar } from './ProgressBar';
import { LiveTimer } from './LiveTimer';

// --- HELPER COMPONENTS ---

interface RoomCardShellProps {
    bgColor: string;
    borderColor: string;
    textColor: string;
    children: React.ReactNode;
    indicators?: any;
    isDashed?: boolean;
}

const RoomCardShell: React.FC<RoomCardShellProps> = ({
    bgColor, borderColor, textColor, children, indicators, isDashed
}) => (
    <div className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 min-h-[110px] w-full ${bgColor} ${borderColor} ${textColor} ${isDashed ? 'border-dashed' : ''}`}>
        {indicators?.topLeft && <span className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${getIndicatorStyle(indicators.topLeft)}`}>{indicators.topLeft}</span>}
        {indicators?.topRight && <span className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${getIndicatorStyle(indicators.topRight)}`}>{indicators.topRight}</span>}
        {indicators?.bottomLeft && <span className={`absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm font-mono ${getIndicatorStyle(indicators.bottomLeft)}`}>{indicators.bottomLeft}</span>}
        {indicators?.bottomRight && <span className={`absolute bottom-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${getIndicatorStyle(indicators.bottomRight)}`}>{indicators.bottomRight}</span>}
        {children}
    </div>
);

interface BedIconProps {
    label: string;
    color: string;
}

const BedIcon: React.FC<BedIconProps> = ({ label, color }) => (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${color}`}>
        {label}
    </div>
);

// --- MAIN COMPONENT ---

const UIShowcase: React.FC = () => {
    const [activeTab, setActiveTab] = useState('iconography');
    const [progress, setProgress] = useState(35);
    const [isBarAnimated, setIsBarAnimated] = useState(true);

    useEffect(() => {
        if (activeTab === 'feedback') {
            const interval = setInterval(() => {
                setProgress(prev => (prev >= 100 ? 0 : prev + 1));
            }, 100);
            return () => clearInterval(interval);
        }
    }, [activeTab]);
    
    const renderTabContent = () => {
        switch(activeTab) {
            case 'iconography':
                return (
                    <div className="space-y-12 pb-20">
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-[var(--foreground)]">Icon Precision (Standard Button: h-9 w-9)</h3>
                            <p className="text-sm text-[var(--foreground-muted)] max-w-2xl">
                                Standardizing all primary action icons to **24px** with a **2.5px stroke weight**. This provides maximum legibility in our workstation shell.
                            </p>

                            <div className="space-y-8 pt-4">
                                <Card title="Primary Workstation Standard (24px / 2.5px Stroke)">
                                    <div className="p-10 flex flex-wrap items-center gap-12 justify-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Button variant="primary" className="p-0 h-10 w-10 border-[var(--border)] shadow-md">
                                                <Plus size={24} strokeWidth={2.5} />
                                            </Button>
                                            <span className="text-xs font-black uppercase text-gray-500">Create</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-4">
                                            <Button variant="secondary" className="p-0 h-10 w-10 border-[var(--border)] shadow-md">
                                                <Edit size={24} strokeWidth={2.5} />
                                            </Button>
                                            <span className="text-xs font-black uppercase text-gray-500">Edit</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-4">
                                            <Button variant="danger" className="p-0 h-10 w-10 shadow-md">
                                                <Trash2 size={24} strokeWidth={2.5} />
                                            </Button>
                                            <span className="text-xs font-black uppercase text-red-500">Delete</span>
                                        </div>
                                         <div className="flex flex-col items-center gap-4">
                                            <Button variant="secondary" className="p-0 h-10 w-10 border-[var(--border)] shadow-md">
                                                <RefreshCw size={24} strokeWidth={2.5} />
                                            </Button>
                                            <span className="text-xs font-black uppercase text-gray-500">Sync</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card title="Navigation Controls (24px / 2.5px Weight)">
                                    <div className="p-8 flex flex-col items-center gap-8">
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Paginator & Tabs</p>
                                        <div className="flex gap-4 p-4 bg-[var(--card-inset-background)] rounded-2xl border border-[var(--border)] shadow-inner">
                                            <div className="flex flex-col items-center gap-2">
                                                <Button variant="secondary" className="h-10 w-10 p-0 shadow-md border-[var(--border)]">
                                                    <ChevronLeft size={24} strokeWidth={2.5} />
                                                </Button>
                                                <span className="text-[9px] font-black uppercase text-gray-500">Prev</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2">
                                                <Button variant="secondary" className="h-10 w-10 p-0 shadow-md border-[var(--border)]">
                                                    <ChevronRight size={24} strokeWidth={2.5} />
                                                </Button>
                                                <span className="text-[9px] font-black uppercase text-gray-500">Next</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </section>
                    </div>
                );
            case 'feedback':
                return (
                    <div className="space-y-12 pb-20">
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-[var(--foreground)] flex items-center">
                                <Layout className="w-5 h-5 mr-2 text-[var(--primary-color)]" />
                                1. Workstation Skeletons
                            </h3>
                            <p className="text-sm text-[var(--foreground-muted)] max-w-2xl">
                                Standardized shells used for the initial lazy-loading of modules.
                            </p>
                            <div className="space-y-8 pt-4">
                                <div>
                                    <Badge className="mb-4">Type: list-detail</Badge>
                                    <div className="scale-[0.9] origin-top-left overflow-hidden rounded-xl border border-[var(--border)]">
                                        <WorkstationSkeleton type="list-detail" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            case 'cards':
                return (
                    <div className="space-y-8">
                         <h3 className="text-xl font-bold text-[var(--foreground)]">Room Contextual Markers</h3>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <Card title="Indicators Only">
                                <RoomCardShell 
                                    bgColor="bg-green-100 dark:bg-green-900/20" 
                                    borderColor="border-green-300 dark:border-green-800" 
                                    textColor="text-green-800 dark:text-green-100"
                                    indicators={{ topLeft: 'R', topRight: 'B,S', bottomLeft: 'VP', bottomRight: 'P' }}
                                >
                                    <h4 className="text-lg font-black uppercase">Sample</h4>
                                </RoomCardShell>
                            </Card>
                         </div>
                    </div>
                );
            case 'controls':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card title="Buttons & Controls">
                            <div className="space-y-4 p-4">
                                <div className="flex flex-wrap gap-4">
                                    <Button variant="primary">Primary</Button>
                                    <Button variant="secondary">Secondary</Button>
                                    <Button variant="danger">Danger</Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                );
            case 'lists':
                 return (
                    <div className="space-y-8">
                        <Card title="Management Item">
                            <ul className="divide-y divide-[var(--border)]">
                                <li className="p-4 flex justify-between items-center">
                                    <div className="flex items-center">
                                        <Badge variant="primary">PersonType</Badge>
                                        <span className="ml-4 text-[var(--foreground)] font-black uppercase">Brother</span>
                                    </div>
                                    <Badge variant="success">Active</Badge>
                                </li>
                            </ul>
                        </Card>
                    </div>
                );
            default: return null;
        }
    };

    const tabList = ['feedback', 'iconography', 'cards', 'controls', 'lists'];

    return (
        <div>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">Universal UI Showcase</h1>
                    <p className="text-sm text-[var(--foreground-muted)] mt-1">Component Library & V5 Standards</p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-[var(--foreground-muted)]">
                    <Badge variant="success">Standards: V5.2</Badge>
                </div>
            </div>
            
            <div className="mb-8 inline-flex rounded-lg bg-[var(--tab-background)] p-1 space-x-1 shadow-inner">
                {tabList.sort().map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`capitalize py-2 px-6 rounded-md font-bold text-sm transition-all ${activeTab === tab ? 'bg-[var(--tab-active-background)] shadow-md text-[var(--tab-active-foreground)]' : 'text-[var(--tab-foreground)] hover:bg-[var(--tab-hover-background)]'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {renderTabContent()}
        </div>
    );
};

export default UIShowcase;