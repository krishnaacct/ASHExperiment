import React, { useState, useEffect, useMemo } from 'react';
import { useReportBuilder } from '../../hooks/useReportBuilder';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { Save, Play, Plus, Trash2, LayoutTemplate, BarChart3, Grid, FileText, RefreshCw, Loader, Calculator, X, TableProperties } from 'lucide-react';
import { UniversalDataGrid } from '../common/UniversalDataGrid';
import { ReportChart } from './ReportChart';
import { Badge } from '../ui/Badge';
import { ConfirmModal } from '../ui/ConfirmModal';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { SurfaceLoader } from '../common/SurfaceLoader';
import { toast } from '../ui/Toast';

type ViewMode = 'grid' | 'chart';

const ReportBuilder: React.FC = () => {
    const { savedReports, dataSources, loading: reportsLoading, fetchData, saveReport, deleteReport, executeReport, getSourceSchema } = useReportBuilder();
    const [isListMode, setIsListMode] = useState(true);
    
    // Editor State
    const [activeReportId, setActiveReportId] = useState<string | null>(null);
    const [config, setConfig] = useState<any>({ 
        displayName: 'New Report', 
        sourceId: '', 
        columns: [], 
        filters: [], 
        groupBy: [],
        pivotConfig: {
            enabled: false,
            rowKey: '',
            columnKey: '',
            valueKey: '',
            aggregation: 'sum'
        },
        chartConfig: {
            enabled: false,
            chartType: 'bar',
            xAxisKey: '',
            dataKey: '',
            aggregation: 'count'
        }
    });
    
    // Schema Metadata for the selected source
    const [sourceFields, setSourceFields] = useState<any[]>([]);
    
    // UI State for Feedback
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<any>(null);
    const [isSchemaLoading, setIsSchemaLoading] = useState(false);
    
    // Preview Data
    const [previewData, setPreviewData] = useState<any[] | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Load Schema when Source Changes
    useEffect(() => {
        if (config.sourceId) {
            setIsSchemaLoading(true);
            getSourceSchema(config.sourceId)
                .then(fields => {
                    setSourceFields(fields);
                })
                .finally(() => {
                    setIsSchemaLoading(false);
                });
        } else {
            setSourceFields([]);
        }
    }, [config.sourceId, getSourceSchema]);

    const handleEdit = (report: any) => {
        setActiveReportId(report.reportId);
        const savedConfig = JSON.parse(report.reportConfig);
        
        setIsListMode(false);
        setPreviewData(null);
        
        // Normalize columns for older configs
        const normalizedCols = (savedConfig.columns || []).map((col: any) => {
            if (typeof col === 'string') return { key: col, aggregation: 'none' };
            return col;
        });

        setConfig({
            displayName: report.displayName,
            sourceId: report.sourceId,
            ...savedConfig,
            columns: normalizedCols,
            pivotConfig: {
                enabled: false,
                rowKey: '',
                columnKey: '',
                valueKey: '',
                aggregation: 'sum',
                ...(savedConfig.pivotConfig || {})
            },
            chartConfig: {
                enabled: false,
                chartType: 'bar',
                xAxisKey: '',
                dataKey: '',
                aggregation: 'count',
                ...(savedConfig.chartConfig || {})
            }
        });
        
        if (savedConfig.chartConfig?.enabled) {
            setViewMode('chart');
        } else {
            setViewMode('grid');
        }
    };

    const handleCreate = () => {
        setActiveReportId(null);
        setConfig({ 
            displayName: 'New Report', 
            sourceId: '', 
            columns: [], 
            filters: [], 
            groupBy: [],
            pivotConfig: { enabled: false, rowKey: '', columnKey: '', valueKey: '', aggregation: 'sum' },
            chartConfig: { enabled: false, chartType: 'bar', xAxisKey: '', dataKey: '', aggregation: 'count' }
        });
        setIsListMode(false);
        setPreviewData(null);
        setViewMode('grid');
    };

    const handleSave = async () => {
        if (!config.displayName || !config.sourceId) {
            toast("Please provide a name and select a data source.", "error");
            return;
        }

        setIsSaving(true);
        try {
            const reportPayload = {
                reportId: activeReportId,
                displayName: config.displayName,
                sourceId: config.sourceId,
                config: {
                    columns: config.columns,
                    groupBy: config.groupBy,
                    filters: config.filters,
                    pivotConfig: config.pivotConfig,
                    chartConfig: config.chartConfig
                },
                requiredPermission: 'reports_view' 
            };
            const newId = await saveReport(reportPayload);
            if (!activeReportId) setActiveReportId(newId);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRequest = (report: any) => {
        setReportToDelete(report);
    };

    const handleConfirmDelete = async () => {
        if (!reportToDelete) return;
        setIsDeleting(true);
        try {
            await deleteReport(reportToDelete.reportId);
            setReportToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRunPreview = async () => {
        if (!config.sourceId) {
            toast("Please select a data source first.", "info");
            return;
        }
        
        if (!activeReportId) {
            toast("Please save the report configuration to preview data.", "info");
            return;
        }

        setIsPreviewLoading(true);
        try {
            const result = await executeReport(activeReportId);
            setPreviewData(result.data);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const fieldOptions = useMemo(() => {
        return sourceFields.map(f => ({ value: f.systemKey || f.fieldName, label: f.excelHeader || f.displayName || f.fieldName }));
    }, [sourceFields]);

    const handleColumnSelection = (selectedKeys: string[]) => {
        setConfig((prev: any) => {
            const currentCols = [...prev.columns];
            const newCols = selectedKeys.map(key => {
                const existing = currentCols.find(c => c.key === key);
                return existing || { key, aggregation: 'none' };
            });
            return { ...prev, columns: newCols };
        });
    };

    const updateColAggregation = (key: string, aggregation: string) => {
        setConfig((prev: any) => ({
            ...prev,
            columns: prev.columns.map((c: any) => c.key === key ? { ...c, aggregation } : c)
        }));
    };

    const updatePivotConfig = (field: string, value: any) => {
        setConfig((prev: any) => ({
            ...prev,
            pivotConfig: { ...prev.pivotConfig, [field]: value }
        }));
    };

    const updateChartConfig = (field: string, value: any) => {
        setConfig((prev: any) => ({
            ...prev,
            chartConfig: { ...prev.chartConfig, [field]: value }
        }));
    };

    if (isListMode) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">Report Builder</h1>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => fetchData()} isLoading={reportsLoading} title="Refresh Data Sources">
                            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                        </Button>
                        <Button onClick={handleCreate}><Plus className="w-5 h-5 mr-2" /> Create Report</Button>
                    </div>
                </div>
                
                {reportsLoading ? (
                    <WorkstationSkeleton type="grid" />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedReports.map(report => (
                            <Card key={report.reportId} className="hover:border-blue-500 cursor-pointer transition-colors group" >
                                <div className="p-6 h-full flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                             <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                                                 <LayoutTemplate className="w-6 h-6" />
                                             </div>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRequest(report); }} 
                                                className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 size={18}/>
                                             </button>
                                        </div>
                                        <h3 className="text-lg font-bold text-[var(--foreground)] mt-4">{report.displayName}</h3>
                                        <Badge variant="secondary" className="mt-2">{dataSources.find(s => s.sourceId === report.sourceId)?.displayName || 'Unknown Source'}</Badge>
                                    </div>
                                    <Button variant="secondary" size="sm" className="mt-6 w-full" onClick={() => handleEdit(report)}>Edit Configuration</Button>
                                </div>
                            </Card>
                        ))}
                        {savedReports.length === 0 && (
                            <div className="col-span-full p-12 text-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--card-inset-background)]">
                                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-[var(--foreground)]">No custom reports yet</h3>
                                <p className="text-[var(--foreground-muted)] mt-1 mb-6">Create your first report to start analyzing data.</p>
                                <Button onClick={handleCreate}><Plus className="w-5 h-5 mr-2" /> Create Report</Button>
                            </div>
                        )}
                    </div>
                )}
                
                <ConfirmModal 
                    isOpen={!!reportToDelete}
                    onClose={() => setReportToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Report"
                    message={`Are you sure you want to delete "${reportToDelete?.displayName}"? This action cannot be undone.`}
                    confirmText="Delete"
                    isLoading={isDeleting}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border)] bg-[var(--background)] z-10">
                <div className="flex items-center gap-4">
                    <Button variant="secondary" onClick={() => setIsListMode(true)} disabled={isSaving}>Back</Button>
                    <Input 
                        value={config.displayName} 
                        onChange={e => setConfig({...config, displayName: e.target.value})} 
                        className="font-bold text-lg w-64 md:w-96"
                        placeholder="Report Name"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleRunPreview} isLoading={isPreviewLoading} disabled={isSaving}>
                        <Play className="w-4 h-4 mr-2" /> Preview
                    </Button>
                    <Button onClick={handleSave} isLoading={isSaving} disabled={isPreviewLoading}>
                        <Save className="w-4 h-4 mr-2" /> Save Configuration
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* CONFIG PANE */}
                <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-[var(--card-background)] border border-[var(--border)] rounded-xl p-4 overflow-y-auto space-y-6 h-full relative">
                    {isSchemaLoading && <SurfaceLoader label="Loading Schema..." />}
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-[var(--foreground-muted)]">Data Source</label>
                        </div>
                        <Select 
                            value={config.sourceId} 
                            onChange={v => setConfig({...config, sourceId: v, columns: [], groupBy: [], filters: [] })}
                            options={dataSources.map(s => ({ value: s.sourceId, label: s.displayName }))}
                            disabled={isSchemaLoading}
                            placeholder="Select Source..."
                        />
                    </div>
                    
                    {config.sourceId && (
                        <>
                             {/* PIVOT SETTINGS */}
                             <div className="pt-4 border-t border-[var(--border)]">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-[var(--foreground)] flex items-center"><TableProperties className="w-4 h-4 mr-2"/> Pivot Table Mode</h3>
                                    <input 
                                        type="checkbox" 
                                        checked={config.pivotConfig.enabled} 
                                        onChange={e => updatePivotConfig('enabled', e.target.checked)}
                                        className="w-4 h-4 text-[var(--primary-color)]"
                                    />
                                </div>
                                {config.pivotConfig.enabled && (
                                    <div className="space-y-4 p-3 bg-[var(--card-inset-background)] rounded-lg border border-[var(--border)]">
                                        <Select
                                            label="Row Field"
                                            value={config.pivotConfig.rowKey}
                                            onChange={v => updatePivotConfig('rowKey', v)}
                                            options={fieldOptions}
                                            placeholder="Select row..."
                                        />
                                        <Select
                                            label="Column Field"
                                            value={config.pivotConfig.columnKey}
                                            onChange={v => updatePivotConfig('columnKey', v)}
                                            options={fieldOptions}
                                            placeholder="Select column..."
                                        />
                                        <Select
                                            label="Value Field"
                                            value={config.pivotConfig.valueKey}
                                            onChange={v => updatePivotConfig('valueKey', v)}
                                            options={fieldOptions}
                                            placeholder="Select value..."
                                        />
                                        <Select
                                            label="Aggregation"
                                            value={config.pivotConfig.aggregation}
                                            onChange={v => updatePivotConfig('aggregation', v)}
                                            options={[
                                                {value: 'sum', label: 'Sum'},
                                                {value: 'count', label: 'Count'},
                                                {value: 'avg', label: 'Average'}
                                            ]}
                                        />
                                    </div>
                                )}
                             </div>

                             <div className="pt-4 border-t border-[var(--border)]" style={{ display: config.pivotConfig.enabled ? 'none' : 'block' }}>
                                <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center"><Grid className="w-4 h-4 mr-2"/> Grid Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--foreground-muted)] mb-2">Selected Columns & Aggregation</label>
                                        <MultiSelectCombobox 
                                            label=""
                                            options={fieldOptions}
                                            selectedValues={config.columns.map((c: any) => c.key)}
                                            onChange={handleColumnSelection}
                                            placeholder="Select columns..."
                                            disabled={isSchemaLoading}
                                        />
                                        
                                        <div className="mt-4 space-y-2">
                                            {config.columns.map((col: any) => (
                                                <div key={col.key} className="flex flex-col gap-2 p-3 bg-[var(--card-inset-background)] rounded-lg border border-[var(--border)]">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-[var(--foreground)] truncate">{fieldOptions.find(f => f.value === col.key)?.label || col.key}</span>
                                                        <Calculator className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                    <select 
                                                        className="bg-[var(--card-background)] border border-[var(--border)] text-xs rounded p-1 outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                                                        value={col.aggregation}
                                                        onChange={(e) => updateColAggregation(col.key, e.target.value)}
                                                    >
                                                        <option value="none">No Aggregation</option>
                                                        <option value="sum">Sum (Total)</option>
                                                        <option value="count">Count (Records)</option>
                                                        <option value="avg">Average</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--foreground-muted)] mb-2">Group By Hierarchy</label>
                                        <MultiSelectCombobox 
                                            label=""
                                            options={fieldOptions}
                                            selectedValues={config.groupBy}
                                            onChange={v => setConfig({...config, groupBy: v})}
                                            placeholder="Select grouping..."
                                            disabled={isSchemaLoading}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[var(--border)]">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-[var(--foreground)] flex items-center"><BarChart3 className="w-4 h-4 mr-2"/> Visualization</h3>
                                    <input 
                                        type="checkbox" 
                                        checked={config.chartConfig.enabled} 
                                        onChange={e => {
                                            const enabled = e.target.checked;
                                            updateChartConfig('enabled', enabled);
                                            if (enabled) setViewMode('chart');
                                        }}
                                        className="w-4 h-4 text-[var(--primary-color)]"
                                        disabled={isSchemaLoading}
                                    />
                                </div>
                                
                                {config.chartConfig.enabled && (
                                    <div className="space-y-4 p-3 bg-[var(--card-inset-background)] rounded-lg border border-[var(--border)]">
                                        <Select
                                            label="Chart Type"
                                            value={config.chartConfig.chartType}
                                            onChange={v => updateChartConfig('chartType', v)}
                                            options={[
                                                {value: 'bar', label: 'Bar Chart'},
                                                {value: 'area', label: 'Area Chart'},
                                                {value: 'pie', label: 'Pie Chart'}
                                            ]}
                                        />
                                        <Select
                                            label="Category (X-Axis)"
                                            value={config.chartConfig.xAxisKey}
                                            onChange={v => updateChartConfig('xAxisKey', v)}
                                            options={fieldOptions}
                                            placeholder="Select category..."
                                        />
                                        <Select
                                            label="Value (Y-Axis)"
                                            value={config.chartConfig.dataKey}
                                            onChange={v => updateChartConfig('dataKey', v)}
                                            options={[{value: '', label: '(None - Count Rows)'}, ...fieldOptions]}
                                        />
                                        <Select
                                            label="Aggregation"
                                            value={config.chartConfig.aggregation}
                                            onChange={v => updateChartConfig('aggregation', v)}
                                            options={[
                                                {value: 'count', label: 'Count'},
                                                {value: 'sum', label: 'Sum (Total)'}
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* PREVIEW PANE */}
                <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-[var(--card-background)] border border-[var(--border)] rounded-xl flex flex-col h-full overflow-hidden relative">
                    <div className="p-4 bg-[var(--card-inset-background)] border-b border-[var(--border)] flex justify-between items-center">
                        <h3 className="font-bold text-[var(--foreground-muted)] uppercase text-xs tracking-wider">Live Preview</h3>
                        {config.chartConfig.enabled && (
                            <div className="flex bg-[var(--card-background)] rounded-lg p-1 border border-[var(--border)]">
                                <button 
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[var(--primary-color)] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Grid View"
                                >
                                    <Grid size={16} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('chart')}
                                    className={`p-2 rounded-md transition-colors ${viewMode === 'chart' ? 'bg-[var(--primary-color)] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Chart View"
                                >
                                    <BarChart3 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 relative overflow-auto p-0">
                        {isPreviewLoading ? (
                             <SurfaceLoader label="Generating Preview..." />
                        ) : previewData ? (
                            viewMode === 'chart' && config.chartConfig.enabled ? (
                                <div className="p-6 h-full flex flex-col">
                                    <ReportChart 
                                        data={previewData} 
                                        config={config.chartConfig} 
                                    />
                                </div>
                            ) : (
                                <UniversalDataGrid 
                                    data={previewData} 
                                    config={{
                                        title: config.displayName,
                                        groupBy: config.groupBy,
                                        columns: config.columns.map((col: any) => ({
                                            key: col.key,
                                            header: fieldOptions.find(f => f.value === col.key)?.label || col.key,
                                            aggregation: col.aggregation,
                                            align: 'left'
                                        })),
                                        showLeafNodes: true,
                                        pivotConfig: config.pivotConfig
                                    }}
                                />
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-[var(--foreground-muted)]">
                                <Play className="w-12 h-12 mb-4 opacity-20" />
                                <p>Click "Preview" to run the report.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportBuilder;