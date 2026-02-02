'use client';
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDateFilter } from './report-date-filter';
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

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

export function PnlReport() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const firestore = useFirestore();
    const { user } = useUser();

    // Queries
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user || !date?.from || !date?.to) return null;
        return query(
            collection(firestore, 'orders'),
            where('orderDate', '>=', date.from.toISOString()),
            where('orderDate', '<=', date.to.toISOString()),
            where('orderStatus', '!=', 'Cancelled')
        );
    }, [firestore, user, date]);
    const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

    const expensesQuery = useMemoFirebase(() => {
        if (!firestore || !user || !date?.from || !date?.to) return null;
        return query(
            collection(firestore, 'expenses'),
            where('expenseDate', '>=', date.from.toISOString()),
            where('expenseDate', '<=', date.to.toISOString())
        );
    }, [firestore, user, date]);
    const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

    const badDebtsQuery = useMemoFirebase(() => {
        if (!firestore || !user || !date?.from || !date?.to) return null;
        return query(
            collection(firestore, 'badDebts'),
            where('writeOffDate', '>=', date.from.toISOString()),
            where('writeOffDate', '<=', date.to.toISOString())
        );
    }, [firestore, user, date]);
    const { data: badDebts, isLoading: isLoadingBadDebts } = useCollection<BadDebt>(badDebtsQuery);

    const orderItemsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'orderItems');
    }, [firestore, user]);
    const { data: allOrderItems, isLoading: isLoadingOrderItems } = useCollection<OrderItem>(orderItemsQuery);

    const isLoading = isLoadingOrders || isLoadingExpenses || isLoadingBadDebts || isLoadingOrderItems;

    const reportData = useMemo(() => {
        if (!orders || !allOrderItems || !expenses || !badDebts) {
             return { revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, badDebtExpense: 0, netProfit: 0 };
        }
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

        const orderIds = new Set(orders.map(o => o.id));
        const relevantOrderItems = allOrderItems.filter(item => orderIds.has(item.orderId));
        
        const totalCogs = relevantOrderItems.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);

        const operatingExpenses = expenses.reduce((sum, expense) => {
            if (expense.category.toLowerCase() !== 'cost of goods sold') {
                return sum + expense.amount;
            }
            return sum;
        }, 0);
        
        const totalBadDebt = badDebts.reduce((sum, debt) => sum + debt.amount, 0);

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
    }, [orders, allOrderItems, expenses, badDebts]);

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
                <CardDescription>An accrual-based P&amp;L report for the selected period.</CardDescription>
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
