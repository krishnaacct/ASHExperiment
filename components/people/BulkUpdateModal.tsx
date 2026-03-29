
import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { DynamicFormEngine } from '../common/DynamicFormEngine';
import { useSMR } from '../../hooks/useSMR';

interface BulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCount: number;
    onConfirm: (fieldName: string, value: any) => Promise<void>;
}

const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({ isOpen, onClose, selectedCount, onConfirm }) => {
    const { superMasterRecord } = useSMR();
    const [selectedField, setSelectedField] = useState('');
    const [formState, setFormState] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Get editable fields for "People" module
    const fieldOptions = useMemo(() => {
        return superMasterRecord
            .filter(f => {
                try {
                    const modules = JSON.parse(f.modules || '[]');
                    // Exclude PK and System Locked fields (simple check)
                    return modules.includes('People') && !f.isPrimaryKey && !f.isSystemLocked;
                } catch { return false; }
            })
            .map(f => ({ value: f.fieldName, label: f.displayName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [superMasterRecord]);

    const handleSave = async () => {
        if (!selectedField) return;
        setIsSaving(true);
        try {
            await onConfirm(selectedField, formState[selectedField]);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormChange = (field: string, value: any) => {
        setFormState({ [field]: value });
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Bulk Update (${selectedCount} Records)`}
            footer={
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} disabled={!selectedField || isSaving}>Update Records</Button>
                </div>
            }
        >
            <div className="space-y-6">
                <Select
                    label="Field to Update"
                    value={selectedField}
                    onChange={(val) => { setSelectedField(val); setFormState({}); }}
                    options={fieldOptions}
                    placeholder="Select a field..."
                />
                
                {selectedField && (
                    <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--card-inset-background)]">
                        <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">New Value</label>
                        <DynamicFormEngine
                            moduleName="People"
                            fieldNames={[selectedField]}
                            formData={formState}
                            onFormChange={handleFormChange}
                            disabled={isSaving}
                        />
                         <p className="text-xs text-[var(--foreground-muted)] mt-2">
                            This value will be applied to all {selectedCount} selected records. Existing values will be overwritten.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default BulkUpdateModal;
