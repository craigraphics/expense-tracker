import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Expense, ExpenseCategory } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { CHART_COLORS } from '../utils/chartColors';

interface SpendingChartProps {
  expenses: Expense[];
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ expenses }) => {
  const categoryData = expenses.reduce<Record<string, number>>((acc, exp) => {
    const cat = exp.category || 'Other';
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {});

  const chartData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={CHART_COLORS[entry.name as ExpenseCategory] || CHART_COLORS.Other}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              color: '#1f2937',
              fontSize: '12px',
              fontWeight: '500',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
