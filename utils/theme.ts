// A simple utility to generate darker/lighter shades of a hex color.
// This is a simplified version and works best with hex colors.
const shadeColor = (color: string, percent: number): string => {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(String(R * (100 + percent) / 100));
    G = parseInt(String(G * (100 + percent) / 100));
    B = parseInt(String(B * (100 + percent) / 100));

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;
    
    R = Math.max(0, R);
    G = Math.max(0, G);
    B = Math.max(0, B);

    const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
};

export const applyTheme = (color: string) => {
    try {
        const hoverColor = shadeColor(color, -10);
        const focusRingColor = shadeColor(color, 50) + '80'; // Add transparency

        document.documentElement.style.setProperty('--primary-color', color);
        document.documentElement.style.setProperty('--primary-color-hover', hoverColor);
        document.documentElement.style.setProperty('--primary-color-focus-ring', focusRingColor);
    } catch (error) {
        console.error("Failed to apply theme color", error);
        // Fallback to defaults if color is invalid
        document.documentElement.style.setProperty('--primary-color', '#3b82f6');
        document.documentElement.style.setProperty('--primary-color-hover', '#2563eb');
        document.documentElement.style.setProperty('--primary-color-focus-ring', '#93c5fd');
    }
};