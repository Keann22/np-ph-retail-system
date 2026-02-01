'use client';
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDateFilter } from './report-date-filter';
import { Separator } from '@/components/ui/separator';

type Order = {
    id: string;
    totalAmount: number;
    orderDate: string;
    orderStatus: string;
};

type OrderItem = {
    orderId: string;
    quantity: number;
    costPriceAtSale: number;
};

type Expense = {
    amount: number;
    expenseDate: string;
    category: string;
};

type BadDebt = {
    amount: number;
    writeOffDate: string;
}

// --- STATIC PLACEHOLDER DATA ---
const staticOrders: Order[] = [
    { id: 'ord1', orderDate: new Date(2024, 6, 20).toISOString(), totalAmount: 250, orderStatus: 'Completed' },
    { id: 'ord2', orderDate: new Date(2024, 6, 18).toISOString(), totalAmount: 1200, orderStatus: 'Processing' },
    { id: 'ord3', orderDate: new Date(2024, 6, 15).toISOString(), totalAmount: 800, orderStatus: 'Processing' },
    { id: 'ord4', orderDate: new Date(2024, 5, 10).toISOString(), totalAmount: 50, orderStatus: 'Cancelled' },
];
const staticOrderItems: OrderItem[] = [
    { orderId: 'ord1', quantity: 1, costPriceAtSale: 180 },
    { orderId: 'ord2', quantity: 2, costPriceAtSale: 400 },
    { orderId: 'ord3', quantity: 1, costPriceAtSale: 650 },
];
const staticExpenses: Expense[] = [
    { expenseDate: new Date(2024, 6, 1).toISOString(), amount: 15000, category: 'Rent' },
    { expenseDate: new Date(2024, 6, 5).toISOString(), amount: 5000, category: 'Utilities' },
];
const staticBadDebts: BadDebt[] = [
    { writeOffDate: new Date(2024, 6, 25).toISOString(), amount: 150 },
];
// --- END STATIC DATA ---

export function PnlReport() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const isLoading = false; // Using static data

    const reportData = useMemo(() => {
        if (!date?.from || !date?.to) {
             return { revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, badDebtExpense: 0, netProfit: 0 };
        }
        
        const ordersInDateRange = staticOrders.filter(o => 
            o.orderStatus !== 'Cancelled' && isWithinInterval(new Date(o.orderDate), { start: date.from!, end: date.to! })
        );

        const totalRevenue = ordersInDateRange.reduce((sum, order) => sum + order.totalAmount, 0);

        const orderIds = new Set(ordersInDateRange.map(o => o.id));
        const relevantOrderItems = staticOrderItems.filter(item => orderIds.has(item.orderId));
        
        const totalCogs = relevantOrderItems.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);

        const expensesInDateRange = staticExpenses.filter(e => isWithinInterval(new Date(e.expenseDate), { start: date.from!, end: date.to! }));
        const operatingExpenses = expensesInDateRange.reduce((sum, expense) => {
            if (expense.category.toLowerCase() !== 'cost of goods sold') {
                return sum + expense.amount;
            }
            return sum;
        }, 0);
        
        const badDebtsInDateRange = staticBadDebts.filter(d => isWithinInterval(new Date(d.writeOffDate), { start: date.from!, end: date.to! }));
        const totalBadDebt = badDebtsInDateRange.reduce((sum, debt) => sum + debt.amount, 0);

        const grossProfit = totalRevenue - totalCogs;
        const netProfit = grossProfit - operatingExpenses - totalBadDebt;

        return {
            revenue: totalRevenue,
            cogs: totalCogs,
            grossProfit,
            operatingExpenses,
            badDebtExpense: totalBadDebt,
            netProfit,
        };
    }, [date]);

    const ReportItem = ({ label, value, isBold = false, isNegative = false }: { label: string; value: number; isBold?: boolean; isNegative?: boolean; }) => (
        <div className={`flex justify-between py-2 ${isBold ? 'font-bold' : ''}`}>
            <span>{label}</span>
            <span className={isNegative ? 'text-destructive' : ''}>₱{value.toFixed(2)}</span>
        </div>
    );
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Profit &amp; Loss Statement</CardTitle>
                <CardDescription>An accrual-based P&amp;L report for the selected period. (Currently showing static data)</CardDescription>
            </CardHeader>
            <CardContent>
                <ReportDateFilter date={date} setDate={setDate} />
                {isLoading ? (
                    <div className="space-y-4 mt-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-8 w-3/4" />
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto mt-4">
                        <ReportItem label="Total Revenue" value={reportData.revenue} />
                        <ReportItem label="Cost of Goods Sold (COGS)" value={-reportData.cogs} />
                        <Separator />
                        <ReportItem label="Gross Profit" value={reportData.grossProfit} isBold />
                        <Separator />
                        <ReportItem label="Operating Expenses" value={-reportData.operatingExpenses} />
                        <ReportItem label="Bad Debt Expense" value={-reportData.badDebtExpense} />
                        <Separator />
                        <ReportItem label="Net Profit" value={reportData.netProfit} isBold isNegative={reportData.netProfit < 0} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
