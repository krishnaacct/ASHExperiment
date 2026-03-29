import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';

interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: User | Omit<User, 'UserID' | 'ActiveStatus'>) => void;
    user: User | null;
}

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, onSave, user }) => {
    const [name, setName] = useState('');
    const [telegramId, setTelegramId] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [roleLabel, setRoleLabel] = useState('');
    const [activeStatus, setActiveStatus] = useState(true);

    useEffect(() => {
        if (user) {
            setName(user.Name);
            setTelegramId(user.TelegramID);
            setMobileNumber(user.MobileNumber);
            setRoleLabel(user.RoleLabel);
            setActiveStatus(user.ActiveStatus);
        } else {
            setName('');
            setTelegramId('');
            setMobileNumber('');
            setRoleLabel('');
            setActiveStatus(true);
        }
    }, [user, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userData = {
            Name: name,
            TelegramID: telegramId,
            MobileNumber: mobileNumber,
            RoleLabel: roleLabel,
            ActiveStatus: activeStatus,
        };
        if (user) {
            onSave({ ...userData, UserID: user.UserID });
        } else {
            onSave(userData);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Add User'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <Input
                    label="Mobile Number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    type="tel"
                    required
                />
                <Input
                    label="Telegram ID"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    required
                />
                 <Input
                    label="Role Label"
                    value={roleLabel}
                    onChange={(e) => setRoleLabel(e.target.value)}
                    placeholder="e.g., Volunteer, Coordinator"
                    required
                />
                {user && (
                    <div className="flex items-center">
                        <Checkbox
                            id="activeStatus"
                            checked={activeStatus}
                            onChange={(e) => setActiveStatus(e.target.checked)}
                            label="Active"
                        />
                    </div>
                )}
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save</Button>
                </div>
            </form>
        </Modal>
    );
};

export default UserForm;