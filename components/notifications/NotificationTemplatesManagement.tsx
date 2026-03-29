
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNotificationTemplates } from '../../hooks/useNotificationTemplates';
import { useAuth } from '../../hooks/useAuth';
import { MessageTemplate, AppModuleConfig, Permission, MasterDataItem } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { Badge } from '../ui/Badge';
import { Send, History, Save, RotateCcw, ChevronDown, ChevronUp, Info, Settings, Bot, ShieldCheck, Clock, CheckSquare } from 'lucide-react';
import { WysiwygEditor, WysiwygEditorRef } from '../ui/WysiwygEditor';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { Modal } from '../ui/Modal';
import { Checkbox } from '../ui/Checkbox';
import { Combobox } from '../ui/Combobox';
import { Select } from '../ui/Select'; 
import { Input } from '../ui/Input';   
import { useData } from '../../hooks/useData';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';

interface GroupedTemplates {
    [moduleId: string]: {
        module: AppModuleConfig | { displayName: string, componentKey: string };
        templates: MessageTemplate[];
    };
}

const SYSTEM_DEFINED_TEMPLATES = ['otp_template', 'welcome_new_user'];

const FREQUENCY_OPTIONS = [
    { value: 'Hourly', label: 'Hourly' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
];

const DAY_OPTIONS = [
    { value: 'Mon', label: 'Monday' },
    { value: 'Tue', label: 'Tuesday' },
    { value: 'Wed', label: 'Wednesday' },
    { value: 'Thu', label: 'Thursday' },
    { value: 'Fri', label: 'Friday' },
    { value: 'Sat', label: 'Saturday' },
    { value: 'Sun', label: 'Sunday' },
];

const TemplateEditorCard: React.FC<{
    template: MessageTemplate;
    isDirty: boolean;
    canEdit: boolean;
    canSendThisTemplate: boolean;
    recipientOptions: { value: string; label: string }[];
    telegramGroupOptions: { value: string; label: string }[];
    botOptions: { value: string; label: string }[];
    moduleOptions: { value: string; label: string }[];
    masterCategoryOptions: { value: string; label: string }[];
    onTemplateChange: (templateId: string, field: keyof MessageTemplate, value: any) => void;
    onRevert: (templateId: string) => void;
    onSave: (templateId: string) => void;
    onSendPreview: (templateId: string) => void;
    onQueue: (templateId: string) => void;
    isSaving: boolean;
    isPreviewing: boolean;
}> = React.memo(({
    template, isDirty, canEdit, canSendThisTemplate, recipientOptions, telegramGroupOptions, botOptions, moduleOptions, masterCategoryOptions,
    onTemplateChange, onRevert, onSave, onSendPreview, onQueue,
    isSaving, isPreviewing
}) => {

    const [isTrayExpanded, setIsTrayExpanded] = useState(false);
    const editorRef = useRef<WysiwygEditorRef>(null);

    const isSystemDefined = SYSTEM_DEFINED_TEMPLATES.includes(template.templateId);
    let primaryRecipientInfo = '';
    if (template.templateId === 'otp_template') {
        primaryRecipientInfo = 'The user requesting the OTP.';
    } else if (template.templateId === 'welcome_new_user') {
        primaryRecipientInfo = 'The newly created user.';
    }
    
    // --- Adapter Pattern Logic for Schedule ---
    const { frequency, day, time } = useMemo(() => {
        const parts = (template.schedule || '').trim().split(' ');
        let freq = 'Daily';
        let d = 'Mon';
        let t = '09:00';

        if (parts.length > 0 && parts[0]) {
             const type = parts[0];
             if (type === 'Hourly') freq = 'Hourly';
             else if (type === 'Weekly') {
                 freq = 'Weekly';
                 if (parts[1]) d = parts[1];
                 if (parts[2]) t = parts[2];
             } else if (type === 'Daily') {
                 freq = 'Daily';
                 if (parts[1]) t = parts[1];
             }
        }
        return { frequency: freq, day: d, time: t };
    }, [template.schedule]);

    const updateSchedule = (newFreq: string, newDay: string, newTime: string) => {
        let newSchedule = '';
        if (newFreq === 'Hourly') newSchedule = 'Hourly';
        else if (newFreq === 'Weekly') newSchedule = `Weekly ${newDay} ${newTime}`;
        else newSchedule = `Daily ${newTime}`; // Default to Daily
        
        onTemplateChange(template.templateId, 'schedule', newSchedule);
    };

    const handlePlaceholderClick = (ph: string) => {
        if (!canEdit) return;
        const textToInsert = `{${ph}}`;
        if (editorRef.current) {
            editorRef.current.insertText(textToInsert);
        }
    };
    
    const includedMasters = useMemo(() => {
        try {
            return JSON.parse(template.includeIndividualsFromMasters || '[]');
        } catch (e) {
            return [];
        }
    }, [template.includeIndividualsFromMasters]);


    return (
        <Card className={`flex flex-col transition-all duration-300 ${isDirty ? 'ring-2 ring-[var(--primary-color)] shadow-lg' : ''}`}>
            {/* 1. Header (Compact) */}
            <div className="p-3 border-b border-[var(--border)] bg-[var(--card-inset-background)] flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <h3 className="font-mono text-sm font-bold text-[var(--foreground)] truncate" title={template.templateId}>{template.templateId}</h3>
                    <p className="text-[10px] text-[var(--foreground-muted)] truncate" title={template.description}>{template.description}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {template.sendingBotId && template.sendingBotId !== 'DEFAULT' && <span title="Custom Bot Assigned"><Bot size={16} strokeWidth={2.5} className="text-blue-500" /></span>}
                    {template.isSchedulable && <span title="Scheduled Template"><Clock size={16} strokeWidth={2.5} className="text-orange-500" /></span>}
                </div>
            </div>

            {/* 2. Message Editor (Primary Content) */}
            <div className="p-3 flex-grow flex flex-col min-h-[250px]">
                <div className="mb-2 flex flex-wrap gap-1">
                    {template.availablePlaceholders.split(',').map(ph => (
                        <button 
                            key={ph.trim()} 
                            onClick={() => handlePlaceholderClick(ph.trim())}
                            disabled={!canEdit}
                            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${canEdit ? 'bg-[var(--card-background)] border-[var(--border)] hover:bg-[var(--list-item-hover-background)] cursor-pointer text-[var(--primary-color)]' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                            title="Click to insert"
                        >
                            {`{${ph.trim()}}`}
                        </button>
                    ))}
                </div>
                <WysiwygEditor
                    ref={editorRef}
                    className="flex-grow !shadow-none"
                    value={template.messageContentEn}
                    onChange={content => onTemplateChange(template.templateId, 'messageContentEn', content)}
                    disabled={!canEdit}
                />
            </div>

            {/* 3. Settings Tray (Collapsible) */}
            <div className="border-t border-[var(--border)]">
                <button 
                    type="button"
                    onClick={() => setIsTrayExpanded(!isTrayExpanded)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-[11px] font-black text-[var(--foreground-muted)] uppercase tracking-widest hover:bg-[var(--interactive-hover-background)] transition-colors group"
                >
                    <span className="flex items-center group-hover:text-[var(--foreground)] transition-colors">
                        <Settings size={24} strokeWidth={2.5} className="mr-2" /> 
                        Routing & Schedule
                    </span>
                    {isTrayExpanded ? <ChevronUp size={24} strokeWidth={2.5} /> : <ChevronDown size={24} strokeWidth={2.5} />}
                </button>
                
                {isTrayExpanded && (
                    <div className="p-4 bg-[var(--card-inset-background)] border-t border-[var(--border)] space-y-6 animate-in slide-in-from-top-2 duration-300">
                        {/* A. Routing Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-[var(--border)] pb-1">Routing Instructions</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <Combobox
                                    label="Module Group"
                                    options={moduleOptions}
                                    value={template.moduleId || ''}
                                    onChange={value => onTemplateChange(template.templateId, 'moduleId', value)}
                                    disabled={!canEdit}
                                    placeholder="Select module..."
                                />
                                <Select 
                                    label="Notification Agent (Bot)"
                                    options={botOptions}
                                    value={template.sendingBotId || 'DEFAULT'}
                                    onChange={val => onTemplateChange(template.templateId, 'sendingBotId', val)}
                                    disabled={!canEdit}
                                />
                                <Combobox 
                                    label="Audit Destination (BCC)"
                                    options={telegramGroupOptions}
                                    value={template.auditGroupId || ''}
                                    onChange={val => onTemplateChange(template.templateId, 'auditGroupId', val)}
                                    disabled={!canEdit}
                                    placeholder="System Default Log..."
                                />
                                <MultiSelectCombobox
                                    label="Additional Recipients (CC)"
                                    options={recipientOptions}
                                    selectedValues={JSON.parse(template.defaultRecipients || '[]')}
                                    onChange={selected => onTemplateChange(template.templateId, 'defaultRecipients', JSON.stringify(selected))}
                                    disabled={!canEdit}
                                />
                                <MultiSelectCombobox
                                    label="Target Telegram Groups"
                                    options={telegramGroupOptions}
                                    selectedValues={JSON.parse(template.targetGroupIds || '[]')}
                                    onChange={value => onTemplateChange(template.templateId, 'targetGroupIds', JSON.stringify(value))}
                                    disabled={!canEdit}
                                />
                                <MultiSelectCombobox
                                    label="Include Individuals from Masters"
                                    options={masterCategoryOptions}
                                    selectedValues={includedMasters}
                                    onChange={value => onTemplateChange(template.templateId, 'includeIndividualsFromMasters', JSON.stringify(value))}
                                    disabled={!canEdit}
                                    placeholder="Select Master Categories..."
                                />
                            </div>
                            {isSystemDefined && (
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 text-[10px] flex items-start gap-2 shadow-sm">
                                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                                    <span><strong>System Lock:</strong> Primary recipient is system-defined ({primaryRecipientInfo})</span>
                                </div>
                            )}
                            {includedMasters.length > 0 && (
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800 text-[10px] flex items-start gap-2 shadow-sm">
                                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                                    <span><strong>Distribution Note:</strong> All active individuals in the selected Master Categories ({includedMasters.join(', ')}) will receive this message. Ensure these records contain valid Telegram IDs in the 'Value' field.</span>
                                </div>
                            )}
                        </div>

                        {/* B. Schedule Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-[var(--border)] pb-1">Automated Schedule</h4>
                            <div className="space-y-3">
                                <Checkbox
                                    id={`sched-${template.templateId}`}
                                    checked={template.isSchedulable}
                                    onChange={e => onTemplateChange(template.templateId, 'isSchedulable', e.target.checked)}
                                    disabled={!canEdit}
                                    label={<span className="text-xs font-bold text-[var(--foreground)]">Enable Scheduling</span>}
                                />
                                {template.isSchedulable && (
                                    <div className="space-y-3 p-3 bg-[var(--card-background)] border border-[var(--border)] rounded-md shadow-inner">
                                        <Select
                                            label="Frequency"
                                            options={FREQUENCY_OPTIONS}
                                            value={frequency}
                                            onChange={(val) => updateSchedule(val, day, time)}
                                            disabled={!canEdit}
                                            required
                                        />
                                        {frequency === 'Weekly' && (
                                            <Select
                                                label="Day of Week"
                                                options={DAY_OPTIONS}
                                                value={day}
                                                onChange={(val) => updateSchedule(frequency, val, time)}
                                                disabled={!canEdit}
                                                required
                                            />
                                        )}
                                        {frequency !== 'Hourly' && (
                                            <Input
                                                type="time"
                                                label="Time (24h)"
                                                value={time}
                                                onChange={(e) => updateSchedule(frequency, day, e.target.value)}
                                                disabled={!canEdit}
                                                required
                                            />
                                        )}
                                        <div className="text-[10px] text-[var(--foreground-muted)] pt-1 text-center font-mono italic">
                                            Instruction: {template.schedule}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* C. Misc Options */}
                        <div className="space-y-3">
                             <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-[var(--border)] pb-1">Preferences</h4>
                             <Checkbox
                                id={`silent-${template.templateId}`}
                                checked={template.defaultSilentSend}
                                onChange={e => onTemplateChange(template.templateId, 'defaultSilentSend', e.target.checked)}
                                disabled={!canEdit}
                                label={<span className="text-xs font-bold text-[var(--foreground)]">Send Silently</span>}
                            />
                            <Checkbox
                                id={`preview-${template.templateId}`}
                                checked={template.disableWebPagePreview}
                                onChange={e => onTemplateChange(template.templateId, 'disableWebPagePreview', e.target.checked)}
                                disabled={!canEdit}
                                label={<span className="text-xs font-bold text-[var(--foreground)]">Disable Link Previews</span>}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Action Footer */}
            <div className="p-3 bg-[var(--card-footer-background)] border-t border-[var(--border)] flex flex-wrap justify-between items-center gap-2">
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="h-9 w-9 p-0 shadow-sm border-[var(--border)]" onClick={() => onSendPreview(template.templateId)} disabled={!canSendThisTemplate || isPreviewing} isLoading={isPreviewing} title="Send Preview">
                        <Send size={24} strokeWidth={2.5} />
                    </Button>
                    {template.isSchedulable && (
                        <Button variant="secondary" size="sm" className="h-9 w-9 p-0 shadow-sm border-[var(--border)]" onClick={() => onQueue(template.templateId)} disabled={!canSendThisTemplate} title="Queue Manual Send">
                            <History size={24} strokeWidth={2.5} />
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    {isDirty && canEdit && (
                        <Button variant="secondary" size="sm" className="h-9 w-9 p-0 shadow-sm border-[var(--border)]" onClick={() => onRevert(template.templateId)} title="Revert Changes">
                            <RotateCcw size={24} strokeWidth={2.5} />
                        </Button>
                    )}
                    <Button size="sm" className="h-9 px-4 text-xs font-bold" onClick={() => onSave(template.templateId)} disabled={!isDirty || !canEdit || isSaving} isLoading={isSaving}>
                        <Save size={24} strokeWidth={2.5} className="mr-2" /> Save Changes
                    </Button>
                </div>
            </div>
        </Card>
    );
});


const NotificationTemplatesManagement: React.FC = () => {
    // ... rest of the component remains the same ...
    const { messageTemplates, notificationRecipients, fetchMessageTemplates, fetchNotificationRecipients, updateSingleMessageTemplate, sendPreviewNotification, queueManualNotification, loading } = useNotificationTemplates();
    const { user, hasPermission } = useAuth();
    const { appModules = [] } = user || {};
    const { mastersData } = useData();

    const [editedTemplates, setEditedTemplates] = useState<Record<string, MessageTemplate>>({});
    const [dirtyTemplates, setDirtyTemplates] = useState<Set<string>>(new Set());
    const [queueConfirmation, setQueueConfirmation] = useState<string | null>(null);
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
    const [accordionsInitialized, setAccordionsInitialized] = useState(false);

    const [savingStates, setSavingStates] = useState<Set<string>>(new Set());
    const [previewingStates, setPreviewingStates] = useState<Set<string>>(new Set());
    const [isQueuing, setIsQueuing] = useState(false);

    useEffect(() => {
        if (hasPermission('notification_templates_view')) {
            fetchMessageTemplates();
            fetchNotificationRecipients();
        }
    }, [hasPermission, fetchMessageTemplates, fetchNotificationRecipients]);

    const canEdit = hasPermission('notification_templates_edit');

    const recipientOptions = useMemo(() => {
        return notificationRecipients.map(r => ({ value: r.recipientId, label: r.displayName }));
    }, [notificationRecipients]);

    const telegramGroupOptions = useMemo(() => {
        return mastersData.filter(m => m.masterName === 'TelegramGroups').map((m: MasterDataItem) => ({ value: String(m.masterId), label: String(m.label) }));
    }, [mastersData]);
    
    const botOptions = useMemo(() => {
        const bots = mastersData.filter(m => m.masterName === 'TelegramBots' && m.isActive);
        return [{ value: 'DEFAULT', label: 'System Default' }, ...bots.map(b => ({ value: b.masterId, label: b.label }))];
    }, [mastersData]);

    const moduleOptions = useMemo(() => {
        return appModules
            .filter(m => m.moduleType === 'MODULE')
            .map(m => ({ value: m.moduleId, label: m.displayName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [appModules]);
    
    const masterCategoryOptions = useMemo(() => {
        const uniqueCategories = [...new Set(mastersData.map(m => m.masterName))];
        return uniqueCategories.sort().map(c => ({ value: c, label: c }));
    }, [mastersData]);

    const groupedTemplates = useMemo((): GroupedTemplates => {
        const groups: GroupedTemplates = {};
        const moduleMap = new Map<string, AppModuleConfig>(appModules.map(m => [m.moduleId, m]));

        messageTemplates.forEach(template => {
            const moduleId = template.moduleId || 'uncategorized';
            if (!groups[moduleId]) {
                const moduleInfo: AppModuleConfig | { displayName: string, componentKey: string } = moduleMap.get(moduleId) || { displayName: 'Uncategorized', componentKey: 'uncategorized' };
                groups[moduleId] = {
                    module: moduleInfo,
                    templates: []
                };
            }
            groups[moduleId].templates.push(template);
        });
        return groups;
    }, [messageTemplates, appModules]);

    useEffect(() => {
        const firstGroupId = Object.keys(groupedTemplates)[0];
        if(firstGroupId && !accordionsInitialized) {
            setOpenAccordions(new Set([firstGroupId]));
            setAccordionsInitialized(true);
        }
    }, [groupedTemplates, accordionsInitialized]);


    const handleTemplateChange = useCallback((templateId: string, field: keyof MessageTemplate, value: any) => {
        const originalTemplate = messageTemplates.find(t => t.templateId === templateId);
        if (!originalTemplate) return;

        setEditedTemplates(prev => {
            const currentEdit = prev[templateId] || { ...originalTemplate };
            return {
                ...prev,
                [templateId]: { ...currentEdit, [field]: value }
            };
        });

        setDirtyTemplates(prev => {
            const newDirty = new Set(prev);
            newDirty.add(templateId);
            return newDirty;
        });
    }, [messageTemplates]);

    const handleRevertChanges = (templateId: string) => {
        setEditedTemplates(prev => {
            const newEdits = { ...prev };
            delete newEdits[templateId];
            return newEdits;
        });
        setDirtyTemplates(prev => {
            const newDirty = new Set(prev);
            newDirty.delete(templateId);
            return newDirty;
        });
    };

    const handleSaveSingleTemplate = async (templateId: string) => {
        if (!canEdit) return;
        const templateToSave = editedTemplates[templateId];
        if (!templateToSave) return;
        
        setSavingStates(prev => new Set(prev).add(templateId));
        try {
            await updateSingleMessageTemplate(templateToSave);
            toast('Template saved successfully!', 'success');
            handleRevertChanges(templateId);
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save template', 'error');
        } finally {
            setSavingStates(prev => {
                const next = new Set(prev);
                next.delete(templateId);
                return next;
            });
        }
    };
    
    const handleSendPreview = async (templateId: string) => {
        setPreviewingStates(prev => new Set(prev).add(templateId));
        try {
            await sendPreviewNotification(templateId);
            toast('Preview sent to your Telegram.', 'success');
        } catch (error) {
             toast(error instanceof Error ? error.message : 'Failed to send preview', 'error');
        } finally {
            setPreviewingStates(prev => {
                const next = new Set(prev);
                next.delete(templateId);
                return next;
            });
        }
    };
    
    const handleConfirmQueue = async () => {
        if (!queueConfirmation) return;
        
        setIsQueuing(true);
        try {
            await queueManualNotification(queueConfirmation, []);
            toast('Notification has been queued for delivery.', 'success');
        } catch (error) {
             toast(error instanceof Error ? error.message : 'Failed to queue notification', 'error');
        } finally {
            setIsQueuing(false);
            setQueueConfirmation(null);
        }
    };

    const toggleAccordion = (moduleId: string) => {
        setOpenAccordions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(moduleId)) {
                newSet.delete(moduleId);
            } else {
                newSet.add(moduleId);
            }
            return newSet;
        });
    };

    if (loading && !messageTemplates.length) {
        return <WorkstationSkeleton type="list-detail" />;
    }
    
    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Notification Templates</h1>
            </div>
            <div className="space-y-4">
                {Object.keys(groupedTemplates).map(moduleId => {
                    const group = groupedTemplates[moduleId];
                    const isOpen = openAccordions.has(moduleId);
                    return (
                        <div key={moduleId} className="bg-[var(--card-background)] rounded-lg shadow-sm overflow-hidden border border-[var(--border)]">
                            <button
                                type="button"
                                onClick={() => toggleAccordion(moduleId)}
                                className="w-full flex justify-between items-center p-4 text-left bg-[var(--card-inset-background)] hover:bg-[var(--list-item-hover-background)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]"
                            >
                                <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center">
                                    <ShieldCheck size={24} strokeWidth={2.5} className="mr-3 text-blue-500" />
                                    {group.module.displayName}
                                    <span className="ml-3 text-xs font-normal text-[var(--foreground-muted)]">({group.templates.length} templates)</span>
                                </h2>
                                <ChevronDown size={28} strokeWidth={2.5} className={`text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {group.templates.map(template => {
                                        const isDirty = dirtyTemplates.has(template.templateId);
                                        const currentTemplate = editedTemplates[template.templateId] || template;
                                        
                                        const moduleConfig = group.module as AppModuleConfig;
                                        const componentKey = moduleConfig.componentKey ? moduleConfig.componentKey.replace(/-/g, '_') : 'placeholder';
                                        const requiredPermission = `notification_send_${componentKey}` as Permission;
                                        const canSendThisTemplate = hasPermission(requiredPermission) || hasPermission('notification_templates_send_manual'); 

                                        return (
                                            <TemplateEditorCard
                                                key={template.templateId}
                                                template={currentTemplate}
                                                isDirty={isDirty}
                                                canEdit={canEdit}
                                                canSendThisTemplate={canSendThisTemplate}
                                                recipientOptions={recipientOptions}
                                                telegramGroupOptions={telegramGroupOptions}
                                                botOptions={botOptions}
                                                moduleOptions={moduleOptions}
                                                masterCategoryOptions={masterCategoryOptions}
                                                onTemplateChange={handleTemplateChange}
                                                onRevert={handleRevertChanges}
                                                onSave={handleSaveSingleTemplate}
                                                onSendPreview={handleSendPreview}
                                                onQueue={setQueueConfirmation}
                                                isSaving={savingStates.has(template.templateId)}
                                                isPreviewing={previewingStates.has(template.templateId)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <Modal
                isOpen={!!queueConfirmation}
                onClose={() => setQueueConfirmation(null)}
                title="Confirm Manual Notification"
            >
                <div className="space-y-4">
                    <p className="text-[var(--foreground-muted)] font-medium">You are about to manually queue the following notification:</p>
                    <div className="bg-[var(--card-inset-background)] p-4 rounded-xl border border-dashed border-[var(--border)]">
                        <p className="font-mono font-bold text-[var(--foreground)] text-center">{queueConfirmation}</p>
                    </div>
                    <p className="text-[var(--foreground-muted)] text-sm">This will send a message to its configured additional recipients and target groups immediately. This action cannot be undone.</p>
                </div>

                <div className="flex justify-end space-x-2 pt-4 mt-6 border-t border-[var(--border)]">
                    <Button variant="secondary" onClick={() => setQueueConfirmation(null)} disabled={isQueuing}>Cancel</Button>
                    <Button onClick={handleConfirmQueue} isLoading={isQueuing}>Confirm & Queue</Button>
                </div>
            </Modal>
        </div>
    );
};

export default NotificationTemplatesManagement;
