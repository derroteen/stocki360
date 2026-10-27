'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { TooltipValueType } from 'recharts';
import { ProductStockLevel } from '@/lib/supabase/types';
import { useTheme, type Theme } from '@/components/ThemeToggle';

interface OverviewChartProps {
  data: ProductStockLevel[];
}

const CHART_COLORS: Record<
  Theme,
  { muted: string; border: string; card: string; text: string; warning: string; primary: string }
> = {
  light: {
    muted: '#64748B',
    border: '#E2E8F0',
    card: '#FFFFFF',
    text: '#0F172A',
    warning: '#B45309',
    primary: '#2563EB',
  },
  dark: {
    muted: '#94A3B8',
    border: '#334155',
    card: '#111A2E',
    text: '#E2E8F0',
    warning: '#FBBF24',
    primary: '#3B82F6',
  },
};

export default function OverviewChart({ data }: OverviewChartProps) {
  const theme = useTheme();
  const colors = CHART_COLORS[theme];

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
          <XAxis
            dataKey="name"
            stroke={colors.muted}
            tick={{ fill: colors.muted }}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: colors.border }}
          />
          <YAxis
            stroke={colors.muted}
            tick={{ fill: colors.muted }}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: colors.border }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '13px',
              color: colors.text,
            }}
            labelStyle={{ color: colors.text }}
            itemStyle={{ color: colors.text }}
            formatter={(value: TooltipValueType | undefined) => [
              `${value ?? 0} in stock`,
              'Stock Level',
            ]}
          />
          <Bar dataKey="current_stock" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={`cell-${entry.id}`}
                fill={entry.is_low_stock ? colors.warning : colors.primary}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
