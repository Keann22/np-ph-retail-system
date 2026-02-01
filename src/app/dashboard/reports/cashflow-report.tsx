'use client';
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDateFilter } from './report-date-filter';
import { Separator } from '@/components/ui/separator';

type Payment = {
    amount: number;
    paymentDate: string;
};

type Expense = {
    amount: number;
    expenseDate: string;
    category: string;
};

type Refund = {
    amount: number;
    refundDate: string;
};


// --- STATIC PLACEHOLDER DATA ---
const staticPayments: Payment[] = [
    { paymentDate: new Date(2024, 6, 20).toISOString(), amount: 250 },
    { paymentDate: new Date(2024, 6, 18).toISOString(), amount: 1200 },
    { paymentDate: new Date(2024, 6, 15).toISOString(), amount: 300 },
];
const staticExpenses: Expense[] = [
    { expenseDate: new Date(2024, 6, 1).toISOString(), amount: 150, category: 'Cost of Goods Sold' },
    { expenseDate: new Date(2024, 6, 5).toISOString(), amount: 50, category: 'Marketing' },
];
const staticRefunds: Refund[] = [
    { refundDate: new Date(2024, 6, 22).toISOString(), amount: 75 },
];
// --- END STATIC DATA ---


export function CashFlowReport() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const isLoading = false; // Using static data

    const reportData = useMemo(() => {
        if (!date?.from || !date?.to) {
            return { cashIn: 0, cashOut: 0, netCash: 0 };
        }

        const paymentsInDateRange = staticPayments.filter(p => isWithinInterval(new Date(p.paymentDate), { start: date.from!, end: date.to! }));
        const expensesInDateRange = staticExpenses.filter(e => isWithinInterval(new Date(e.expenseDate), { start: date.from!, end: date.to! }));
        const refundsInDateRange = staticRefunds.filter(r => isWithinInterval(new Date(r.refundDate), { start: date.from!, end: date.to! }));
        
        const totalCashIn = paymentsInDateRange.reduce((sum, payment) => sum + payment.amount, 0);
        const totalExpenses = expensesInDateRange.reduce((sum, expense) => sum + expense.amount, 0);
        const totalRefunds = refundsInDateRange.reduce((sum, refund) => sum + refund.amount, 0);
        
        const totalCashOut = totalExpenses + totalRefunds;
        const netCash = totalCashIn - totalCashOut;

        return {
            cashIn: totalCashIn,
            cashOut: totalCashOut,
            netCash,
        };
    }, [date]);

    const ReportItem = ({ label, value, isBold = false, isNegative = false }: { label: string; value: number; isBold?: boolean; isNegative?: boolean; }) => (
        <div className={`flex justify-between py-3 ${isBold ? 'font-bold text-lg' : 'text-sm'}`}>
            <span className='text-muted-foreground'>{label}</span>
            <span className={isNegative ? 'text-destructive' : ''}>₱{value.toFixed(2)}</span>
        </div>
    );
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Cash Flow Tracker</CardTitle>
                <CardDescription>A report on the actual cash that moved in and out of the business. (Currently showing static data)</CardDescription>
            </CardHeader>
            <CardContent>
                <ReportDateFilter date={date} setDate={setDate} />
                {isLoading ? (
                    <div className="space-y-4 mt-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : (
                    <div className="max-w-md mx-auto mt-4">
                        <ReportItem label="Total Cash In" value={reportData.cashIn} />
                        <ReportItem label="Total Cash Out" value={-reportData.cashOut} />
                        <Separator />
                        <ReportItem label="Net Cash Flow" value={reportData.netCash} isBold isNegative={reportData.netCash < 0}/>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
