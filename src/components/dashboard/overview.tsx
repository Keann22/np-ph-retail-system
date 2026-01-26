"use client"
import { useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Skeleton } from '@/components/ui/skeleton';

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function Overview() {
  const [data, setData] = useState<{name: string, total: number}[]>([]);

  useEffect(() => {
    // This will only run on the client, after initial hydration
    setData(months.map(month => ({
      name: month,
      total: Math.floor(Math.random() * 5000) + 1000,
    })));
  }, []); // Empty dependency array ensures this runs once on mount

  if (data.length === 0) {
    return <Skeleton className="w-full h-[350px]" />;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₱${value}`}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
