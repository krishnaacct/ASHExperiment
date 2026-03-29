import React from 'react';
import { WorkstationSkeleton } from './WorkstationSkeleton';

const ModuleLoader: React.FC = () => {
    // Standardize lazy-load fallback to match the common workstation layout
    return <WorkstationSkeleton type="list-detail" />;
};

export default ModuleLoader;