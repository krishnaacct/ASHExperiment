
import React, { useState, useEffect } from 'react';
import { useDataSources } from '../../hooks/useDataSources';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { Database, Plus, RefreshCw, Settings, AlertTriangle, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { Checkbox } from '../ui/Checkbox';
import { toast } from '../ui/Toast';
import { ConfirmModal } from '../ui/ConfirmModal';

interface SchemaRow {
    excelHeader: string;
    systemKey: string;
    dataType: string;
    isVisible: boolean;
}

const DataSourceManager: React.FC = () => {
    const { sources, loading, isSaving, isSyncing, fetchDataSources, saveSource, deleteSource, syncSource, getSourceSchema, saveSchema } = useDataSources();
    const { hasPermission } = useAuth();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    
    // Schema Editor State
    const [isSchemaOpen, setIsSchemaOpen] = useState(false);
    const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
    const [schemaRows, setSchemaRows] = useState<SchemaRow[]>([]);
    const [isLoadingSchema, setIsLoadingSchema] = useState(false);
    
    // Delete State
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [sourceToDelete, setSourceToDelete] = useState<any>(null);

    useEffect(() => {
        fetchDataSources();
    }, [fetchDataSources]);

    const handleAddNew = () => {
        setEditingSource(null);
        setFormData({ sourceType: 'EXTERNAL', connectionConfig: '{}' });
        setIsFormOpen(true);
    };

    const handleEdit = (source: any) => {
        setEditingSource(source);
        setFormData(source);
        setIsFormOpen(true);
    };
    
    const handleDeleteRequest = (source: any) => {
        setSourceToDelete(source);
        setDeleteConfirmOpen(true);
    };
    
    const handleConfirmDelete = async () => {
        if (!sourceToDelete) return;
        
        const success = await deleteSource(sourceToDelete.sourceId);
        if (success) {
            setDeleteConfirmOpen(false);
            setSourceToDelete(null);
        }
    };

    const handleSaveSource = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Simple JSON validation
        let configStr = formData.connectionConfig;
        if (formData.fileId) {
             configStr = JSON.stringify({ fileId: formData.fileId });
        }
        
        await saveSource({
            ...formData,
            connectionConfig: configStr
        });
        setIsFormOpen(false);
    };
    
    const openSchemaEditor = async (sourceId: string) => {
        setActiveSourceId(sourceId);
        setIsSchemaOpen(true);
        setIsLoadingSchema(true);
        const schema = await getSourceSchema(sourceId);
        setSchemaRows(schema.map((s: any) => ({
            excelHeader: s.excelHeader,
            systemKey: s.systemKey,
            dataType: s.dataType || 'text',
            isVisible: s.isVisible !== undefined ? s.isVisible : true
        })));
        setIsLoadingSchema(false);
    };

    const handleSync = async (sourceId: string) => {
        const result = await syncSource(sourceId);
        // Auto-open schema editor every time sync is successful
        if (result && result.success) {
            openSchemaEditor(sourceId);
        }
    };

    const handleSaveSchema = async () => {
        if (!activeSourceId) return;

        // Validation: Check for duplicates or blanks in VISIBLE rows only
        const activeRows = schemaRows.filter(r => r.isVisible);
        const keys = activeRows.map(r => r.systemKey ? r.systemKey.trim() : '');

        // 1. Check for empty keys in visible rows
        if (keys.some(k => k === '')) {
            toast('All visible columns must have a System Key.', 'error');
            return;
        }

        // 2. Check for duplicates in visible rows
        const uniqueKeys = new Set(keys);
        if (uniqueKeys.size !== keys.length) {
            // Find specific duplicate for better error message
            const duplicates = keys.filter((item, index) => keys.indexOf(item) !== index);
            toast(`Duplicate System Key found: "${duplicates[0]}". Keys must be unique among visible columns.`, 'error');
            return;
        }

        await saveSchema(activeSourceId, schemaRows);
        setIsSchemaOpen(false);
    };

    const updateSchemaRow = (index: number, field: keyof SchemaRow, value: any) => {
        const newRows = [...schemaRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setSchemaRows(newRows);
    };

    if (!hasPermission('datasource_manage')) return <div className="p-8 text-center text-gray-500">Access Denied</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Data Sources</h1>
                <Button onClick={handleAddNew} disabled={isSyncing || loading}>
                    <Plus className="w-5 h-5 mr-2" /> Add Data Source
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && <SurfaceLoader label="Loading sources..." />}
                {sources.map(source => {
                    const config = JSON.parse(source.connectionConfig || '{}');
                    return (
                        <Card key={source.sourceId} className="relative overflow-hidden group">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                                        <Database size={24} />
                                    </div>
                                    <Badge 
                                        variant={source.sourceType === 'INTERNAL' ? 'success' : 'warning'}
                                        className={source.sourceType === 'EXTERNAL' ? '!bg-orange-100 !text-orange-900 border border-orange-200 dark:!bg-orange-900/30 dark:!text-orange-100 dark:border-orange-800' : ''}
                                    >
                                        {source.sourceType}
                                    </Badge>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--foreground)]">{source.displayName}</h3>
                                    <p className="text-sm text-[var(--foreground-muted)] font-mono mt-1">{source.targetSheetName}</p>
                                </div>
                                {source.sourceType === 'EXTERNAL' && (
                                     <div className="text-xs text-[var(--foreground-muted)] bg-[var(--card-inset-background)] p-2 rounded truncate" title={config.fileId}>
                                         File ID: {config.fileId || 'Not Configured'}
                                     </div>
                                )}
                            </div>
                            <div className="px-6 py-4 bg-[var(--card-footer-background)] border-t border-[var(--border)] flex justify-between items-center">
                                <div className="flex gap-2">
                                     <Button variant="secondary" size="sm" onClick={() => handleEdit(source)} disabled={isSyncing} title="Edit Settings"><Settings size={16} /></Button>
                                     <Button variant="danger" size="sm" onClick={() => handleDeleteRequest(source)} disabled={isSyncing} title="Delete Source"><Trash2 size={16} /></Button>
                                </div>
                                <div className="flex gap-2">
                                     {source.sourceType === 'EXTERNAL' && (
                                         <>
                                            <Button variant="secondary" size="sm" onClick={() => openSchemaEditor(source.sourceId)} disabled={isSyncing}>Schema</Button>
                                            <Button size="sm" onClick={() => handleSync(source.sourceId)} isLoading={isSyncing} disabled={isSyncing}>
                                                <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sync
                                            </Button>
                                         </>
                                     )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Edit Source Modal */}
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingSource ? "Edit Data Source" : "New Data Source"}>
                <form onSubmit={handleSaveSource} className="space-y-4">
                    <Input label="Display Name" value={formData.displayName || ''} onChange={e => setFormData({...formData, displayName: e.target.value})} required />
                    <Input label="Target Sheet Name" value={formData.targetSheetName || ''} onChange={e => setFormData({...formData, targetSheetName: e.target.value})} required placeholder="Source_..." />
                    
                    {formData.sourceType === 'EXTERNAL' && (
                         <Input 
                            label="File ID" 
                            value={formData.fileId || (formData.connectionConfig ? JSON.parse(formData.connectionConfig).fileId : '')} 
                            onChange={e => setFormData({...formData, fileId: e.target.value})} 
                            required 
                            placeholder="Paste Excel or Google Sheet File ID" 
                        />
                    )}
                    
                    <div className="flex justify-end pt-4">
                        <Button type="submit" isLoading={isSaving}>Save Source</Button>
                    </div>
                </form>
            </Modal>

            {/* Schema Editor Modal */}
            <Modal isOpen={isSchemaOpen} onClose={() => setIsSchemaOpen(false)} title="Map Source Schema">
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                        Review the mapping below. <strong>Excel Header</strong> is the raw column name from your file. <strong>System Key</strong> is how it will be named in the database (no spaces allowed).
                    </div>
                    {isLoadingSchema ? <SurfaceLoader label="Loading schema..." /> : (
                        <div className="max-h-[60vh] border rounded-lg overflow-y-auto bg-[var(--card-background)]">
                            {/* 'table-fixed' ensures columns respect their widths and wrap text instead of overflowing */}
                            <table className="w-full table-fixed text-sm divide-y divide-[var(--border)]">
                                <thead className="bg-[var(--card-inset-background)] sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {/* Force narrow width for checkbox column, allow header wrapping */}
                                        <th className="p-3 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider w-14 break-words whitespace-normal leading-tight">
                                            Vis.
                                        </th>
                                        <th className="p-3 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider w-[40%]">
                                            Excel Header
                                        </th>
                                        <th className="p-3 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider w-[35%]">
                                            System Key <span className="text-red-500">*</span>
                                        </th>
                                        <th className="p-3 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wider w-[25%]">
                                            Data Type
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {schemaRows.map((row, i) => (
                                        <tr key={i} className={`transition-colors ${row.isVisible ? 'hover:bg-[var(--list-item-hover-background)]' : 'bg-gray-50 dark:bg-slate-900/50 opacity-60'}`}>
                                            <td className="p-3 align-top">
                                                <Checkbox 
                                                    id={`visible-${i}`}
                                                    checked={row.isVisible}
                                                    onChange={e => updateSchemaRow(i, 'isVisible', e.target.checked)}
                                                />
                                            </td>
                                            <td className="p-3 font-mono text-[var(--foreground-muted)] select-all align-top whitespace-normal break-words">
                                                {row.excelHeader ? (
                                                    row.excelHeader
                                                ) : (
                                                    <span className="italic text-amber-500 flex items-center gap-1">
                                                        <AlertTriangle size={12} /> (No Header)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 align-top">
                                                <input 
                                                    className={`w-full bg-transparent border-b border-dashed outline-none py-1 transition-colors ${
                                                        !row.isVisible 
                                                            ? 'text-[var(--foreground-muted)] border-transparent line-through decoration-gray-400/50 opacity-60 cursor-not-allowed' 
                                                            : (!row.systemKey ? 'border-red-400 placeholder-red-400 text-[var(--foreground)]' : 'border-[var(--border)] focus:border-[var(--primary-color)] text-[var(--foreground)]')
                                                    }`}
                                                    value={row.systemKey}
                                                    onChange={e => {
                                                        const cleanVal = e.target.value.replace(/\s+/g, '');
                                                        updateSchemaRow(i, 'systemKey', cleanVal);
                                                    }}
                                                    placeholder={row.isVisible ? "Required" : "Ignored"}
                                                    disabled={!row.isVisible}
                                                />
                                            </td>
                                            <td className="p-3 align-top">
                                                    <select 
                                                    className="bg-[var(--card-background)] text-[var(--foreground)] border border-[var(--input)] rounded p-1.5 focus:ring-1 focus:ring-[var(--primary-color)] outline-none w-full disabled:opacity-50"
                                                    value={row.dataType}
                                                    onChange={e => updateSchemaRow(i, 'dataType', e.target.value)}
                                                    disabled={!row.isVisible}
                                                >
                                                    <option value="text">Text</option>
                                                    <option value="number">Number</option>
                                                    <option value="date">Date</option>
                                                    <option value="boolean">Boolean</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {schemaRows.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-[var(--foreground-muted)]">No schema defined. Run a Sync to auto-discover columns.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                        <Button variant="secondary" onClick={() => setIsSchemaOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSchema} isLoading={isSaving}>Save Mapping</Button>
                    </div>
                </div>
            </Modal>
            
            {sourceToDelete && (
                 <ConfirmModal
                    isOpen={!!sourceToDelete}
                    onClose={() => setSourceToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Data Source"
                    message={`Are you sure you want to delete "${sourceToDelete.displayName}"? This action will remove the configuration and schema definition. It will be blocked if any reports depend on this source.`}
                    isLoading={isSaving}
                    confirmText="Delete"
                />
            )}
        </div>
    );
};

export default DataSourceManager;
