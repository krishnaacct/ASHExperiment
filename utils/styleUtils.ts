// Centralized style definitions for room card indicators

export const getIndicatorStyle = (type: string | null) => {
    if (!type) {
        return 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300';
    }

    const typeCode = type.split(',')[0]; // Handle cases like 'B,S'

    switch (typeCode) {
        // Top Left: Room Status Modifiers
        case 'R': return 'bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-200';
        
        // Top Right: Occupant Identity
        case 'B': return 'bg-sky-100 text-sky-800 dark:bg-sky-700 dark:text-sky-200';
        case 'S': return 'bg-rose-100 text-rose-800 dark:bg-rose-700 dark:text-rose-200';
        case 'Y': return 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-200';
        case 'B,S': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200'; // Mixed gender
        
        // Bottom Left: Person Type (for Residential)
        case 'VP': 
        case 'SW': 
            return 'bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-200';
        
        // Bottom Left: Room Function (for Non-Residential)
        case 'OF': // Office
        case 'KN': // Kitchen
        case 'HL': // Hall
        case 'FY': // Foyer
        case 'PY': // Physiotherapy
        case 'PC': // Primary Care
        case 'LY': // Laundry
        case 'PR': // Press
        case 'GA': // Guest Accommodation
        case 'SK': // Stock
        case 'DG': // Dining
        case 'TG': // Tailoring
        case 'BA': // Baba Room
            return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-200';

        // Bottom Right: Stay Type
        case 'P': 
        case 'T': 
        case 'G': 
        case 'V': 
            return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
            
        default: 
            // Fallback for any other value, including multi-value bottomRight like 'P,V'
            return 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300';
    }
};
