
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SuperMasterRecord, AppModuleConfig } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { useData } from '../../hooks/useData';
import { useSMR } from '../../hooks/useSMR';
import { Lock, Loader, GitBranch } from 'lucide-react';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import DynamicFormSkeleton from '../common/DynamicFormSkeleton';
import * as api from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../ui/Toast';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';

// Debounce hook
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

// Helper to generate the Data Scope Name (e.g. "Users", "Residents") from a module config.
const generateDataScopeName = (mod: AppModuleConfig) => {
    let source = mod.componentKey;
    // If it's a placeholder or undefined, fallback to the module ID suffix
    if (source === 'placeholder' || !source) {
         source = mod.moduleId.replace(/^mod_/, '').replace(/^cat_/, '');
    }
    // Convert kebab-case or snake_case to PascalCase
    return source.split(/[-_]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
};

interface SMREditorFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (field: SuperMasterRecord) => void;
    existingField: SuperMasterRecord | null;
    isSaving: boolean;
    initialData?: SuperMasterRecord | null; // For Clone functionality
}

const SMREditorForm: React.FC<SMREditorFormProps> = ({ isOpen, onClose, onSave, existingField, isSaving, initialData }) => {
    const { user } = useAuth();
    const { allAppModules, mastersData, fetchAllAppModules } = useData();
    const { superMasterRecord, loading: smrLoading } = useSMR();
    const [formData, setFormData] = useState<Partial<SuperMasterRecord>>({});
    const [validationStatus, setValidationStatus] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

    // State for Condition Builder
    const [enableCondition, setEnableCondition] = useState(false);
    const [conditionField, setConditionField] = useState('');
    const [conditionOp, setConditionOp] = useState('EQUALS');
    const [conditionValue, setConditionValue] = useState('');

    const debouncedFieldName = useDebounce(formData.fieldName || '', 500);
    
    const isLocked = !!existingField?.isSystemLocked;
    const isEditing = !!existingField;

    useEffect(() => {
        if(isOpen && allAppModules.length === 0) {
            fetchAllAppModules();
        }
    }, [isOpen, allAppModules, fetchAllAppModules]);

    // Initialize Form State
    useEffect(() => {
        const resetState = (defaults: Partial<SuperMasterRecord> = {}) => {
            setFormData(defaults);
            setValidationStatus({ loading: false, error: null });
            
            // Reset Condition Builder
            if (defaults.visibleWhen) {
                try {
                    const rule = JSON.parse(defaults.visibleWhen);
                    setEnableCondition(true);
                    setConditionField(rule.field || '');
                    setConditionOp(rule.operator || 'EQUALS');
                    setConditionValue(String(rule.value ?? ''));
                } catch (e) {
                    setEnableCondition(false);
                    setConditionField('');
                    setConditionOp('EQUALS');
                    setConditionValue('');
                }
            } else {
                setEnableCondition(false);
                setConditionField('');
                setConditionOp('EQUALS');
                setConditionValue('');
            }
        };

        if (existingField) {
            resetState(existingField);
        } else if (initialData) {
            resetState(initialData);
        } else {
            resetState({
                dataType: 'text',
                mandatory: false,
                maxLength: 100,
                isPrimaryKey: false,
                displayInList: false,
            });
        }
    }, [existingField, initialData, isOpen]);

    // Uniqueness Validation
    useEffect(() => {
        const validateUniqueness = async () => {
            if (!debouncedFieldName || (isEditing && debouncedFieldName === existingField?.fieldName)) {
                setValidationStatus({ loading: false, error: null });
                return;
            }
            if (!user?.sessionId) return;
            
            setValidationStatus({ loading: true, error: null });
            try {
                const result = await api.validateSmrUniqueness(user.sessionId, 'fieldName', debouncedFieldName, existingField?.fieldId || null);
                if (!result.isUnique) {
                    setValidationStatus({ loading: false, error: result.message || 'This name is already in use.' });
                } else {
                    setValidationStatus({ loading: false, error: null });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Could not validate name.';
                setValidationStatus({ loading: false, error: message });
            }
        };
        validateUniqueness();
    }, [debouncedFieldName, existingField, isEditing, user?.sessionId]);

    const handleChange = (field: keyof SuperMasterRecord, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validationStatus.error) {
            toast("Please fix the validation errors before saving.", 'error');
            return;
        }

        // Serialize Conditional Logic
        let visibleWhen = '';
        if (enableCondition && conditionField) {
            // Determine if value needs to be boolean or string based on controller field type
            const controller = superMasterRecord.find(f => f.fieldName === conditionField);
            let finalValue: string | boolean = conditionValue;
            
            if (controller?.dataType === 'boolean') {
                 finalValue = conditionValue === 'true';
            }

            visibleWhen = JSON.stringify({
                field: conditionField,
                operator: conditionOp,
                value: finalValue
            });
        }

        const finalField: SuperMasterRecord = {
            fieldId: formData.fieldId || '',
            fieldName: formData.fieldName || '',
            displayName: formData.displayName || '',
            description: formData.description || '',
            dataType: formData.dataType || 'text',
            lookupSource: (formData.dataType === 'lookup' || formData.dataType === 'lookup-multi') ? formData.lookupSource : '',
            validationRegex: formData.validationRegex || '',
            mandatory: formData.mandatory || false,
            isPrimaryKey: formData.isPrimaryKey || false,
            maxLength: formData.maxLength || 0,
            modules: formData.modules || '[]',
            defaultValue: formData.defaultValue || '',
            sortOrders: formData.sortOrders || '{}',
            groupName: formData.groupName || '',
            visibleWhen: visibleWhen,
            displayInList: formData.displayInList || false,
            isSystemLocked: formData.isSystemLocked || false,
        };
        onSave(finalField);
    };
    
    // --- Module Selection Logic ---
    const { moduleOptions, lockedModulesSet } = useMemo(() => {
        const getLocked = () => {
            if (!existingField || !existingField.isSystemLocked) return new Set<string>();
            const lockedValue = existingField.isSystemLocked;
            if (typeof lockedValue === 'string' && lockedValue.startsWith('[')) {
                try { return new Set<string>(JSON.parse(lockedValue)); } catch { return new Set<string>(); }
            }
            if (lockedValue === true) {
                try { return new Set<string>(JSON.parse(existingField.modules || '[]')); } catch { return new Set<string>(); }
            }
            return new Set<string>();
        };
        
        const lockedSet = getLocked();

        const options = allAppModules
            .filter(m => m.moduleType === 'MODULE')
            .map(m => {
                const dataScopeName = generateDataScopeName(m);
                return { 
                    value: m.moduleId, 
                    label: m.displayName,
                    disabled: lockedSet.has(dataScopeName)
                };
            })
            .sort((a,b) => a.label.localeCompare(b.label));
            
        return { moduleOptions: options, lockedModulesSet: lockedSet };
    }, [allAppModules, existingField]);

    const selectedModuleIds = useMemo(() => {
        const savedScopes: string[] = JSON.parse(formData.modules || '[]');
        const ids: string[] = [];
        
        savedScopes.forEach(scope => {
            const matchingMod = allAppModules.find(m => generateDataScopeName(m) === scope);
            if (matchingMod) {
                ids.push(matchingMod.moduleId);
            }
        });
        return ids;
    }, [formData.modules, allAppModules]);

    const handleModulesChange = (newModuleIds: string[]) => {
        const newScopes = newModuleIds.map(id => {
            const mod = allAppModules.find(m => m.moduleId === id);
            return mod ? generateDataScopeName(mod) : null;
        }).filter(Boolean); 
        const uniqueScopes = [...new Set(newScopes)];
        handleChange('modules', JSON.stringify(uniqueScopes));
    };

    // --- Logic for Condition Builder Controller Fields ---
    const availableControllerFields = useMemo(() => {
        const currentModules: string[] = JSON.parse(formData.modules || '[]');
        if (currentModules.length === 0) return superMasterRecord; 

        // Find fields that share at least one module with the current field
        return superMasterRecord.filter(f => {
            if (f.fieldName === formData.fieldName) return false; // Cannot depend on self
            try {
                const fModules = JSON.parse(f.modules || '[]');
                return fModules.some((m: string) => currentModules.includes(m));
            } catch { return false; }
        }).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [superMasterRecord, formData.modules, formData.fieldName]);


    // --- Dynamic Form Logic ---
    const { groupedFields } = useMemo(() => {
        const moduleScope = "SMREditor";
        let fields = superMasterRecord.filter(field => {
            try {
                return JSON.parse(field.modules).includes(moduleScope);
            } catch { return false; }
        });

        if (!isEditing) {
            fields = fields.filter(field => !field.isPrimaryKey);
        }

        fields.sort((a, b) => a.displayName.localeCompare(b.displayName));

        const groups: Record<string, SuperMasterRecord[]> = {};
        fields.forEach(field => {
            const groupName = field.groupName || 'Other';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(field);
        });

        return { groupedFields: groups };
    }, [superMasterRecord, isEditing]);
    
    // --- Dynamic Options Injection ---
    // 1. Calculate the list of Master Categories
    const masterNameOptions = useMemo(() => {
        const names = new Set(mastersData.map(m => m.masterName));
        return Array.from(names).sort().map(name => ({ value: name, label: name }));
    }, [mastersData]);

    const formGroupOptions = useMemo(() => {
        return mastersData
            .filter(m => m.masterName === 'FormGroups' && m.isActive)
            .map(m => ({ value: String(m.value), label: m.label }))
            .sort((a,b) => a.label.localeCompare(b.label));
    }, [mastersData]);
    
    // 2. Determine injection mapping dynamically
    // This fixes the issue where 'lookupSource' field might have a different source name configured in SMR
    const lookupDataMap = useMemo(() => {
        const map: Record<string, any> = {
            'FormGroups': formGroupOptions,
            'MasterNames': masterNameOptions // Default Fallback
        };
        
        // Find the definition of the 'lookupSource' field itself
        const lookupSourceField = superMasterRecord.find(f => {
             try { return f.fieldName === 'lookupSource' && JSON.parse(f.modules).includes('SMREditor'); } 
             catch { return false; }
        });

        // If it defines a specific lookupSource, inject the master names into that key
        if (lookupSourceField && lookupSourceField.lookupSource) {
            map[lookupSourceField.lookupSource] = masterNameOptions;
        }

        return map;
    }, [formGroupOptions, masterNameOptions, superMasterRecord]);
    
    
    const isFieldDisabled = (field: SuperMasterRecord): boolean => {
        if (!isLocked) return false;
        const lockedCoreProps = ['fieldId', 'fieldName', 'dataType', 'isPrimaryKey', 'mandatory', 'lookupSource'];
        return lockedCoreProps.includes(field.fieldName);
    };

    const renderConditionValueInput = () => {
        const controller = superMasterRecord.find(f => f.fieldName === conditionField);
        
        if (controller?.dataType === 'boolean') {
            return (
                <Select
                    label="Value"
                    value={conditionValue}
                    onChange={setConditionValue}
                    options={[{value: 'true', label: 'True'}, {value: 'false', label: 'False'}]}
                />
            );
        }

        if (controller?.dataType === 'lookup' && controller.lookupSource) {
            const options = mastersData
                .filter(m => m.masterName === controller.lookupSource && m.isActive)
                .map(m => ({ value: String(m.value), label: m.label }));
            
            return (
                <Select
                    label="Value"
                    value={conditionValue}
                    onChange={setConditionValue}
                    options={options}
                />
            );
        }

        return (
            <Input
                label="Value"
                value={conditionValue}
                onChange={e => setConditionValue(e.target.value)}
            />
        );
    };

    const renderFooter = () => (
        <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button form="smr-editor-form" type="submit" isLoading={isSaving} disabled={isSaving || validationStatus.loading || !!validationStatus.error}>Save</Button>
        </div>
    );
    
    const formConfigLoading = smrLoading || mastersData.length === 0;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={existingField ? 'Edit SMR Field' : 'Add New SMR Field'}
            footer={renderFooter()}
        >
            {formConfigLoading ? (
                <DynamicFormSkeleton />
            ) : (
                <form id="smr-editor-form" onSubmit={handleSubmit} className="space-y-6">
                    {isLocked && (
                        <div className="p-3 bg-[var(--toast-info-background)] text-[var(--toast-info-foreground)] rounded-lg flex items-center space-x-3 text-sm">
                            <Lock className="h-5 w-5 flex-shrink-0" />
                            <span>This is a system-locked field. Core properties cannot be changed.</span>
                        </div>
                    )}
                    
                    {Object.keys(groupedFields).sort().map(groupName => {
                        const fields = groupedFields[groupName];
                        
                        // Manually exclude visibleWhen from dynamic rendering to avoid duplication
                        let fieldNamesToRender = fields
                            .filter(f => !['modules', 'visibleWhen'].includes(f.fieldName))
                            .map(f => f.fieldName);
                        
                        if (fieldNamesToRender.length === 0) return null;
                        
                        const fieldNameIndex = fieldNamesToRender.indexOf('fieldName');

                        return (
                             <fieldset key={groupName} className="border-t border-[var(--border)] pt-4">
                                <legend className="text-base font-semibold text-[var(--foreground-muted)] -mt-3 px-2 bg-[var(--popover-background)]">{groupName}</legend>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <DynamicFormEngine
                                        moduleName="SMREditor"
                                        fieldNames={fieldNamesToRender}
                                        formData={formData as Record<string, string | boolean>}
                                        onFormChange={handleChange}
                                        isEditing={isEditing}
                                        isFieldDisabled={isFieldDisabled}
                                        lookupData={lookupDataMap}
                                    />
                                    {fieldNameIndex !== -1 && (
                                        <div className={`-mt-3 ${fieldNameIndex % 2 === 0 ? 'md:col-start-2' : ''}`}>
                                            {validationStatus.loading && <span className="text-xs text-gray-500 flex items-center"><Loader className="animate-spin h-3 w-3 mr-1" /> Checking...</span>}
                                            {validationStatus.error && <span className="text-xs text-red-500">{validationStatus.error}</span>}
                                        </div>
                                    )}
                                </div>
                            </fieldset>
                        );
                    })}
                    
                    {/* Restored Condition Builder UI */}
                    <fieldset className="border-t border-[var(--border)] pt-4">
                        <legend className="text-base font-semibold text-[var(--foreground-muted)] -mt-3 px-2 bg-[var(--popover-background)]">Conditional Visibility</legend>
                        <div className="space-y-4 pt-2">
                            <Checkbox
                                id="enable-condition"
                                label={
                                    <span className="flex items-center">
                                        <GitBranch className="w-4 h-4 mr-2" /> Enable Conditional Visibility
                                    </span>
                                }
                                checked={enableCondition}
                                onChange={e => setEnableCondition(e.target.checked)}
                            />
                            
                            {enableCondition && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--card-inset-background)] p-3 rounded-lg">
                                    <Select
                                        label="Controller Field"
                                        value={conditionField}
                                        onChange={val => { setConditionField(val); setConditionValue(''); }}
                                        options={availableControllerFields.map(f => ({ value: f.fieldName, label: f.displayName }))}
                                    />
                                    <Select
                                        label="Operator"
                                        value={conditionOp}
                                        onChange={setConditionOp}
                                        options={[
                                            { value: 'EQUALS', label: 'Equals' },
                                            { value: 'NOT_EQUALS', label: 'Not Equals' }
                                        ]}
                                    />
                                    {renderConditionValueInput()}
                                </div>
                            )}
                             <p className="text-xs text-[var(--foreground-muted)]">Define a rule to control when this field is visible in forms.</p>
                        </div>
                    </fieldset>

                    <MultiSelectCombobox
                        label="Used in Modules"
                        options={moduleOptions}
                        selectedValues={selectedModuleIds}
                        onChange={handleModulesChange}
                        disabled={isLocked && lockedModulesSet.size === moduleOptions.length}
                    />
                </form>
            )}
        </Modal>
    );
};

export default SMREditorForm;
