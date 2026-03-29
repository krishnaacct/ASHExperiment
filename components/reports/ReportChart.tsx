
import React, { useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

interface ReportChartProps {
    data: any[];
    config: {
        chartType: 'bar' | 'area' | 'pie';
        xAxisKey: string;
        dataKey: string;
        aggregation?: 'count' | 'sum';
    };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[var(--popover-background)] border border-[var(--border)] p-3 rounded-lg shadow-lg z-50">
                <p className="text-sm font-bold text-[var(--foreground)] mb-1">{label}</p>
                <p className="text-sm text-[var(--primary-color)]">
                    {Number(payload[0].value).toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

// Wrapper with explicit height to ensure Recharts renders
const ChartWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ width: '100%', height: 400, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
        </ResponsiveContainer>
    </div>
);

export const ReportChart: React.FC<ReportChartProps> = ({ data, config }) => {
    const chartData = useMemo(() => {
        // Aggregate Data
        const grouped = data.reduce((acc, item) => {
            const key = String(item[config.xAxisKey] || 'Unknown');
            if (!acc[key]) acc[key] = { name: key, value: 0 };
            
            if (config.aggregation === 'sum') {
                // Robust parsing for strings like "$1,200.00" or "1,200"
                const rawVal = item[config.dataKey];
                const cleanVal = String(rawVal || '0').replace(/[^0-9.-]+/g, "");
                const val = parseFloat(cleanVal);
                if (!isNaN(val)) acc[key].value += val;
            } else {
                acc[key].value += 1; // Count
            }
            return acc;
        }, {} as Record<string, { name: string, value: number }>);

        // Sort desc by value
        return Object.values(grouped).sort((a: any, b: any) => b.value - a.value);
    }, [data, config]);

    if (!data || data.length === 0) return <div className="p-8 text-center text-gray-400">No data available for chart.</div>;

    const commonProps = {
        data: chartData,
        margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    if (config.chartType === 'pie') {
        return (
            <ChartWrapper>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--card-background)" strokeWidth={2} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                </PieChart>
            </ChartWrapper>
        );
    }

    if (config.chartType === 'area') {
        return (
            <ChartWrapper>
                <AreaChart {...commonProps}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--foreground-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--foreground-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--accent-background)' }} />
                    <Area type="monotone" dataKey="value" stroke="var(--primary-color)" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
            </ChartWrapper>
        );
    }

    // Default: Bar Chart
    return (
        <ChartWrapper>
            <BarChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--foreground-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--foreground-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--accent-background)' }} />
                <Bar dataKey="value" fill="var(--primary-color)" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
        </ChartWrapper>
    );
};
