'use client';
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
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
};

type Refund = {
    amount: number;
    refundDate: string;
};

export function CashFlowReport() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const firestore = useFirestore();

    // Queries
    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore || !date?.from || !date?.to) return null;
        return query(
            collection(firestore, 'payments'),
            where('paymentDate', '>=', date.from.toISOString()),
            where('paymentDate', '<=', date.to.toISOString())
        );
    }, [firestore, date]);
    
    const expensesQuery = useMemoFirebase(() => {
        if (!firestore || !date?.from || !date?.to) return null;
        return query(
            collection(firestore, 'expenses'),
            where('expenseDate', '>=', date.from.toISOString()),
            where('expenseDate', '<=', date.to.toISOString())
        );
    }, [firestore, date]);
    
    const refundsQuery = useMemoFirebase(() => {
        if (!firestore || !date?.from || !date?.to) return null;
        return query(
            collection(firestore, 'refunds'),
            where('refundDate', '>=', date.from.toISOString()),
            where('refundDate', '<=', date.to.toISOString())
        );
    }, [firestore, date]);


    // Fetch data
    const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);
    const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);
    const { data: refunds, isLoading: isLoadingRefunds } = useCollection<Refund>(refundsQuery);

    const isLoading = isLoadingPayments || isLoadingExpenses || isLoadingRefunds;

    const reportData = useMemo(() => {
        if (!payments || !expenses || !refunds) {
            return { cashIn: 0, cashOut: 0, netCash: 0 };
        }

        const totalCashIn = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalRefunds = refunds.reduce((sum, refund) => sum + refund.amount, 0);
        
        const totalCashOut = totalExpenses + totalRefunds;
        const netCash = totalCashIn - totalCashOut;

        return {
            cashIn: totalCashIn,
            cashOut: totalCashOut,
            netCash,
        };
    }, [payments, expenses, refunds]);

    const ReportItem = ({ label, value, isBold = false, isNegative = false }) => (
        <div className={`flex justify-between py-3 ${isBold ? 'font-bold text-lg' : 'text-sm'}`}>
            <span className='text-muted-foreground'>{label}</span>
            <span className={isNegative ? 'text-destructive' : ''}>₱{value.toFixed(2)}</span>
        </div>
    );
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Cash Flow Tracker</CardTitle>
                <CardDescription>A report on the actual cash that moved in and out of the business.</CardDescription>
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
                        <ReportItem label="Net Cash Flow" value={reportData.netCash} isBold isNegative={reportData.netCash &lt; 0}/>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
