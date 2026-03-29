import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('system');
        } else {
            setTheme('light');
        }
    };

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return <Sun size={24} strokeWidth={2.5} />;
            case 'dark':
                return <Moon size={24} strokeWidth={2.5} />;
            case 'system':
                return <Monitor size={24} strokeWidth={2.5} />;
        }
    };

    const getLabel = () => {
        switch (theme) {
            case 'light':
                return 'Switch to Dark Mode';
            case 'dark':
                return 'Switch to System Preference';
            case 'system':
                return 'Switch to Light Mode';
        }
    }

    return (
        <Button
            onClick={cycleTheme}
            variant="secondary"
            size="sm"
            className="p-0 h-10 w-10 shadow-sm"
            aria-label={getLabel()}
            title={getLabel()}
        >
            {getIcon()}
        </Button>
    );
};