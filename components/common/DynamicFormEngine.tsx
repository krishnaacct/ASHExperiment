import React, { useMemo } from 'react';
import { useData } from '../../hooks/useData';
import { useSMR } from '../../hooks/useSMR'; 
import { Input } from '../ui/Input';
import { SuperMasterRecord } from '../../types';
import { Select } from '../ui/Select';
import { ICONS } from '../dashboard/modules';
import { ColorInput } from '../ui/ColorInput';
import { Checkbox } from '../ui/Checkbox';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox'; 
import DynamicFormSkeleton from './DynamicFormSkeleton';
import { MasterDataItem } from '../../types';

interface DynamicFormEngineProps {
    moduleName: string;
    fieldNames: string[];
    formData: Record<string, any>; 
    onFormChange: (fieldName: string, value: string | boolean) => void;
    disabled?: boolean;
    isEditing?: boolean;
    isFieldDisabled?: (field: SuperMasterRecord) => boolean;
    lookupData?: Record<string, { value: string; label: string; disabled?: boolean }[]>;
    lookupLoading?: Record<string, boolean>;
    mandatoryOverrides?: Record<string, boolean>; // New prop for runtime mandatory logic
}

export const DynamicFormEngine: React.FC<DynamicFormEngineProps> = ({
    moduleName,
    fieldNames,
    formData,
    onFormChange,
    disabled = false,
    isEditing = false,
    isFieldDisabled,
    lookupData = {},
    lookupLoading = {},
    mandatoryOverrides = {},
}) => {
    const { mastersData, allAppModules } = useData(); 
    const { superMasterRecord, loading } = useSMR(); 

    const formFields = useMemo(() => {
        if (!superMasterRecord || superMasterRecord.length === 0) {
            return [];
        }
        const requiredFields = new Set(fieldNames);
        
        const moduleFields = superMasterRecord.filter(record => {
             try {
                const modules = JSON.parse(record.modules || '[]');
                return Array.isArray(modules) && modules.includes(moduleName);
            } catch {
                return false;
            }
        });

        const filtered = moduleFields.filter(record => requiredFields.has(record.fieldName));
        
        const uniqueFieldsMap = new Map<string, SuperMasterRecord>();
        filtered.forEach(f => uniqueFieldsMap.set(f.fieldName, f));

        return Array.from(uniqueFieldsMap.values())
            .sort((a, b) => fieldNames.indexOf(a.fieldName) - fieldNames.indexOf(b.fieldName));

    }, [superMasterRecord, fieldNames, moduleName]);
    
    const visibleFields = useMemo(() => {
        return formFields.filter(field => {
            if (!field.visibleWhen) return true;
            try {
                const rule = JSON.parse(field.visibleWhen);
                const currentValue = formData[rule.field];
                if (rule.operator === 'EQUALS') return String(currentValue) === String(rule.value);
                if (rule.operator === 'NOT_EQUALS') return String(currentValue) !== String(rule.value);
                if (rule.operator === 'IN' && Array.isArray(rule.value)) {
                    return rule.value.includes(String(currentValue));
                }
                return true;
            } catch (e) {
                return true;
            }
        });
    }, [formFields, formData]);

    const renderInput = (field: SuperMasterRecord) => {
        const customDisabled = isFieldDisabled ? isFieldDisabled(field) : false;
        const fieldIsDisabled = disabled || (isEditing && field.isPrimaryKey) || customDisabled;

        // Calculate effective mandatory status (SMR definition OR runtime override)
        const isMandatory = mandatoryOverrides[field.fieldName] !== undefined 
            ? mandatoryOverrides[field.fieldName] 
            : field.mandatory;

        const getLookupOptions = () => {
            let options: { value: string; label: string; disabled: boolean; }[] = [];
            
            if (field.lookupSource && lookupData[field.lookupSource]) {
                options = lookupData[field.lookupSource].map(opt => ({ ...opt, disabled: opt.disabled || false }));
            } else {
                options = mastersData
                    .filter(item => item.masterName === field.lookupSource)
                    .map((item: MasterDataItem) => ({ value: String(item.value), label: String(item.label), disabled: !item.isActive }));
            }
            return options;
        };

        const label = field.displayName;

        // Rich label for manual components (Checkbox, Textarea, MultiSelect)
        const labelWithAsterisk = (
            <span>
                {field.displayName} 
                {isMandatory && <span className="text-red-500 ml-1 font-bold">*</span>}
            </span>
        );

        switch (field.dataType) {
            case 'lookup': {
                const options = getLookupOptions();
                const currentValue = String(formData[field.fieldName] || '');
                return (
                    <Select
                        key={field.fieldId}
                        id={field.fieldId}
                        label={label}
                        value={currentValue}
                        onChange={value => onFormChange(field.fieldName, value)}
                        required={isMandatory}
                        disabled={fieldIsDisabled}
                        options={options}
                        loading={field.lookupSource ? lookupLoading[field.lookupSource] : false}
                    />
                );
            }
            case 'lookup-multi': {
                const options = getLookupOptions();
                let selectedValues: string[] = [];
                try {
                    const rawVal = formData[field.fieldName];
                    if (rawVal) {
                        selectedValues = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
                    }
                } catch (e) {
                    selectedValues = [];
                }

                return (
                    <div key={field.fieldId} className="pt-1">
                        <MultiSelectCombobox
                            label={field.displayName} // MultiSelectCombobox handles asterisk internally via required prop
                            options={options}
                            selectedValues={selectedValues}
                            onChange={(newValues) => onFormChange(field.fieldName, JSON.stringify(newValues))}
                            disabled={fieldIsDisabled}
                            placeholder={`Select ${field.displayName}...`}
                            loading={field.lookupSource ? lookupLoading[field.lookupSource] : false}
                            required={isMandatory}
                        />
                         {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
                    </div>
                );
            }
            case 'boolean':
                return (
                    <div key={field.fieldId} className="flex items-center pt-2">
                        <Checkbox
                            id={field.fieldId}
                            label={labelWithAsterisk}
                            checked={!!formData[field.fieldName]}
                            onChange={e => onFormChange(field.fieldName, e.target.checked)}
                            disabled={fieldIsDisabled}
                        />
                    </div>
                );
            case 'color':
                return (
                    <ColorInput
                        key={field.fieldId}
                        id={field.fieldId}
                        label={label}
                        value={String(formData[field.fieldName] || '#000000')}
                        onChange={value => onFormChange(field.fieldName, value)}
                        disabled={fieldIsDisabled}
                    />
                );
            case 'icon':
                // Generate icon options from the ICONS map
                const iconOptions = Object.keys(ICONS).map(key => ({ 
                    value: key, 
                    label: key,
                    icon: ICONS[key] ? React.cloneElement(ICONS[key] as React.ReactElement<any>, { className: "w-4 h-4" }) : null
                }));
                
                return (
                     <Select
                        key={field.fieldId}
                        id={field.fieldId}
                        label={label}
                        value={String(formData[field.fieldName] || '')}
                        onChange={value => onFormChange(field.fieldName, value)}
                        required={isMandatory}
                        disabled={fieldIsDisabled}
                        options={iconOptions}
                        placeholder="Select an icon..."
                    />
                );
            case 'text':
            case 'tel':
            case 'email':
            case 'number':
            case 'date':
                return (
                    <Input
                        key={field.fieldId}
                        id={field.fieldId}
                        label={label}
                        type={field.dataType}
                        value={String(formData[field.fieldName] || '')}
                        onChange={e => onFormChange(field.fieldName, e.target.value)}
                        required={isMandatory}
                        maxLength={field.maxLength || undefined}
                        placeholder={field.description}
                        disabled={fieldIsDisabled}
                    />
                );
            case 'textarea':
                 return (
                    <div key={field.fieldId} className="md:col-span-2">
                        <label htmlFor={field.fieldId} className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                            {labelWithAsterisk}
                        </label>
                        <textarea
                            id={field.fieldId}
                            value={String(formData[field.fieldName] || '')}
                            onChange={e => onFormChange(field.fieldName, e.target.value)}
                            required={isMandatory}
                            maxLength={field.maxLength || undefined}
                            placeholder={field.description}
                            disabled={fieldIsDisabled}
                            rows={4}
                            className="block w-full px-4 py-3 text-base bg-[var(--card-background)] border border-[var(--input)] rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 text-[var(--foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--primary-color-focus-ring)] focus:border-[var(--primary-color)] transition-all duration-300"
                        />
                    </div>
                )
            default:
                return <p key={field.fieldId}>Unsupported field type: {field.dataType}</p>;
        }
    };
    
    if (loading) {
        return <DynamicFormSkeleton />;
    }

    return (
        <>
            {visibleFields.map(field => renderInput(field))}
        </>
    );
};