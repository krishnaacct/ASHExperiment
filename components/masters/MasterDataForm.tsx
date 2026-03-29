
import React, { useState, useEffect } from 'react';
import { MasterDataItem, SuperMasterRecord } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DynamicFormEngine } from '../common/DynamicFormEngine';

interface MasterDataFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: MasterDataItem) => void;
    existingItem: MasterDataItem | null;
    isSaving: boolean;
}

const MasterDataForm: React.FC<MasterDataFormProps> = ({ isOpen, onClose, onSave, existingItem, isSaving }) => {
    const [formData, setFormData] = useState<Partial<MasterDataItem>>({});
    
    useEffect(() => {
        if (existingItem) {
            setFormData(existingItem);
        } else {
            setFormData({
                isActive: true,
            });
        }
    }, [existingItem, isOpen]);

    const handleFormChange = (fieldName: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as MasterDataItem);
    };

    const renderFooter = () => (
        <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button form="master-data-form" type="submit" isLoading={isSaving} disabled={isSaving}>Save</Button>
        </div>
    );

    const isEditing = !!existingItem;
    
    // THE FIX: Protect 'value' from being edited after creation
    const isFieldDisabled = (field: SuperMasterRecord): boolean => {
        if (isEditing && field.fieldName === 'value') return true;
        return false;
    };

    const fieldNames = isEditing
        ? ['masterId', 'masterName', 'value', 'label', 'isActive']
        : ['masterName', 'value', 'label', 'isActive'];


    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={existingItem ? 'Edit Master Item' : 'Add New Master Item'}
            footer={renderFooter()}
        >
            <form id="master-data-form" onSubmit={handleSubmit} className="space-y-4">
                <DynamicFormEngine
                    moduleName="Masters"
                    fieldNames={fieldNames}
                    formData={formData as Record<string, string | boolean>}
                    onFormChange={handleFormChange}
                    disabled={isSaving}
                    isEditing={isEditing}
                    isFieldDisabled={isFieldDisabled}
                />
            </form>
        </Modal>
    );
};

export default MasterDataForm;
