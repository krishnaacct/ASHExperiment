import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: string) => void;
    title: string;
    label: string;
    defaultValue?: string;
    isLoading?: boolean;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, onSubmit, title, label, defaultValue = '', isLoading }) => {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(value);
    };

    const renderFooter = () => (
        <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" form="prompt-form" isLoading={isLoading}>Submit</Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={renderFooter()}>
            <form id="prompt-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label={label}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    required
                    autoFocus
                />
            </form>
        </Modal>
    );
};