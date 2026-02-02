'use client';
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
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


export function CashFlowReport() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const firestore = useFirestore();
    const { user } = useUser();

    // Fetch all data and filter on the client
    const allPaymentsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'payments');
    }, [firestore, user]);
    
    const allExpensesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'expenses');
    }, [firestore, user]);
    
    const allRefundsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'refunds');
    }, [firestore, user]);

    const { data: allPayments, isLoading: isLoadingPayments } = useCollection<Payment>(allPaymentsQuery);
    const { data: allExpenses, isLoading: isLoadingExpenses } = useCollection<Expense>(allExpensesQuery);
    const { data: allRefunds, isLoading: isLoadingRefunds } = useCollection<Refund>(allRefundsQuery);

    const isLoading = isLoadingPayments || isLoadingExpenses || isLoadingRefunds;

    // Client-side filtering
    const payments = useMemo(() => {
        if (!allPayments || !date?.from || !date?.to) return null;
        const fromTime = date.from.getTime();
        const toTime = date.to.getTime();
        return allPayments.filter(payment => {
            const paymentTime = new Date(payment.paymentDate).getTime();
            return paymentTime >= fromTime && paymentTime <= toTime;
        });
    }, [allPayments, date]);

    const expenses = useMemo(() => {
        if (!allExpenses || !date?.from || !date?.to) return null;
        const fromTime = date.from.getTime();
        const toTime = date.to.getTime();
        return allExpenses.filter(expense => {
            const expenseTime = new Date(expense.expenseDate).getTime();
            return expenseTime >= fromTime && expenseTime <= toTime;
        });
    }, [allExpenses, date]);

    const refunds = useMemo(() => {
        if (!allRefunds || !date?.from || !date?.to) return null;
        const fromTime = date.from.getTime();
        const toTime = date.to.getTime();
        return allRefunds.filter(refund => {
            const refundTime = new Date(refund.refundDate).getTime();
            return refundTime >= fromTime && refundTime <= toTime;
        });
    }, [allRefunds, date]);

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
                        <ReportItem label="Net Cash Flow" value={reportData.netCash} isBold isNegative={reportData.netCash < 0}/>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
