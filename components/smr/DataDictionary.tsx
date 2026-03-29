
import React, { useState, useMemo } from 'react';
import { useSMR } from '../../hooks/useSMR';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { SuperMasterRecord } from '../../types';
import { Badge } from '../ui/Badge';
import { CheckCircle, XCircle, List } from 'lucide-react';
import { WorkstationSkeleton } from '../common/WorkstationSkeleton';
import { ScrollableTableContainer } from '../common/ScrollableTableContainer';

const DataDictionary: React.FC = () => {
    const { superMasterRecord, loading } = useSMR();
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredRecords = useMemo(() => {
        if (!searchTerm) return superMasterRecord;
        const lowercasedFilter = searchTerm.toLowerCase();
        return superMasterRecord.filter(record =>
            Object.values(record).some(value =>
                String(value).toLowerCase().includes(lowercasedFilter)
            )
        );
    }, [superMasterRecord, searchTerm]);

    const renderModuleBadges = (modulesJson: string) => {
        try {
            const modules = JSON.parse(modulesJson);
            if (Array.isArray(modules)) {
                return modules.map((mod, index) => <Badge key={index} variant="primary" className="mr-1 mb-1">{mod}</Badge>);
            }
        } catch (e) {
            // If parsing fails, just display the raw string
        }
        return <Badge variant="secondary">{modulesJson}</Badge>;
    };

    if (loading && !superMasterRecord.length) {
        return <WorkstationSkeleton type="list-detail" />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-6">Data Dictionary (Super Master Record)</h1>
            <Card>
                 <div className="p-4 border-b border-[var(--border)]">
                    <Input
                        placeholder="Search all fields..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <ScrollableTableContainer>
                    <table className="min-w-full divide-y divide-[var(--border)]">
                        <thead className="bg-[var(--card-inset-background)]">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Field Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Display Name & Desc</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Type & Constraints</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Modules & Group</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[var(--card-background)] divide-y divide-[var(--border)]">
                            {filteredRecords.map((record) => (
                                <tr key={record.fieldId}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-[var(--foreground)]">{record.fieldName}</div>
                                        <div className="text-xs text-[var(--foreground-muted)]">{record.fieldId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal max-w-sm">
                                        <div className="text-sm font-medium text-[var(--foreground)]">{record.displayName}</div>
                                        <div className="text-sm text-[var(--foreground-muted)]">{record.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center flex-wrap gap-2 text-sm text-[var(--foreground)]">
                                            <Badge variant="secondary">{record.dataType}</Badge>
                                            {record.mandatory ? 
                                                <Badge variant="success"><CheckCircle className="inline-block w-3 h-3 mr-1" />Mandatory</Badge> :
                                                <Badge variant="secondary"><XCircle className="inline-block w-3 h-3 mr-1" />Optional</Badge>
                                            }
                                            {record.displayInList && (
                                                <Badge variant="primary"><List className="inline-block w-3 h-3 mr-1" />In Lists</Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-[var(--foreground-muted)] mt-1">
                                            {record.maxLength ? `Max Length: ${record.maxLength}` : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-normal">
                                        <div>
                                            {renderModuleBadges(record.modules)}
                                        </div>
                                        {record.groupName && (
                                            <div className="text-xs text-[var(--foreground-muted)] mt-2">
                                                Group: <Badge variant="secondary">{record.groupName}</Badge>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredRecords.length === 0 && !loading && (
                        <p className="p-6 text-center text-[var(--foreground-muted)]">No records found.</p>
                    )}
                </ScrollableTableContainer>
            </Card>
        </div>
    );
};

export default DataDictionary;
