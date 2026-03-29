
import React from 'react';
import GenericReportViewer from './GenericReportViewer';

interface CustomReportWrapperProps {
    reportId?: string;
}

/**
 * A wrapper component that bridges the Dashboard's routing logic
 * (which passes `reportId` as a prop via `initialSelectedItemId`)
 * to the `GenericReportViewer` component.
 */
const CustomReportWrapper: React.FC<CustomReportWrapperProps> = ({ reportId }) => {
    if (!reportId) {
        return (
            <div className="p-12 text-center text-gray-500">
                <p>No report ID specified. Please launch a report from the Reports Center.</p>
            </div>
        );
    }

    return <GenericReportViewer reportId={reportId} />;
};

export default CustomReportWrapper;
