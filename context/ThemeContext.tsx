import React, { createContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const savedTheme = localStorage.getItem('theme');
            return (savedTheme as Theme) || 'system';
        } catch (e) {
            return 'system';
        }
    });

    useEffect(() => {
        const root = window.document.documentElement;

        const applyCorrectTheme = () => {
            const isDark =
                theme === 'dark' ||
                (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

            root.classList.remove(isDark ? 'light' : 'dark');
            root.classList.add(isDark ? 'dark' : 'light');
        };
        
        applyCorrectTheme();

        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.error("Failed to save theme to localStorage", e);
        }

        // Set up a listener for OS theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = () => {
            // Only react if the user's preference is 'system'
            if (localStorage.getItem('theme') === 'system') {
                applyCorrectTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);

        // Cleanup listener on unmount
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};