'use client';
import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDateFilter } from '@/components/dashboard/reports/report-date-filter';
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

// --- Data Types ---
type Order = {
    id: string;
    subtotal: number;
    totalDiscount: number;
    totalAmount: number;
    orderDate: string;
    orderStatus: 'Pending Payment' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled' | 'Returned';
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

type Refund = {
    amount: number;
    refundDate: string;
}

// --- Report Component ---
export function PnlReport() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const firestore = useFirestore();
    const { user } = useUser();

    // --- Data Fetching ---
    // Fetch all documents and filter on the client-side for consistency and to avoid complex queries.
    const allOrdersQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, 'orders')) : null), [firestore, user]);
    const allExpensesQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, 'expenses')) : null), [firestore, user]);
    const allBadDebtsQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, 'badDebts')) : null), [firestore, user]);
    const allOrderItemsQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, 'orderItems')) : null), [firestore, user]);
    const allRefundsQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, 'refunds')) : null), [firestore, user]);

    const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(allOrdersQuery);
    const { data: allExpenses, isLoading: isLoadingExpenses } = useCollection<Expense>(allExpensesQuery);
    const { data: allBadDebts, isLoading: isLoadingBadDebts } = useCollection<BadDebt>(allBadDebtsQuery);
    const { data: allOrderItems, isLoading: isLoadingOrderItems } = useCollection<OrderItem>(allOrderItemsQuery);
    const { data: allRefunds, isLoading: isLoadingRefunds } = useCollection<Refund>(allRefundsQuery);
    
    const isLoading = isLoadingOrders || isLoadingExpenses || isLoadingBadDebts || isLoadingOrderItems || isLoadingRefunds;

    // --- Data Processing & Calculation ---
    const reportData = useMemo(() => {
        const defaults = {
            grossSales: 0,
            salesReturns: 0,
            salesDiscounts: 0,
            netSales: 0,
            cogs: 0,
            grossProfit: 0,
            operatingExpenses: 0,
            operatingExpensesBreakdown: {} as Record<string, number>,
            badDebtExpense: 0,
            refundsExpense: 0,
            totalOtherLosses: 0,
            netProfit: 0,
        };

        if (!allOrders || !allOrderItems || !allExpenses || !allBadDebts || !allRefunds || !date?.from || !date?.to) {
             return defaults;
        }
        
        const fromTime = date.from.getTime();
        const toTime = date.to.getTime();
        
        // Filter all data sources by the selected date range
        const periodOrders = allOrders.filter(o => {
            const orderTime = new Date(o.orderDate).getTime();
            return orderTime >= fromTime && orderTime <= toTime;
        });
        
        const periodExpenses = allExpenses.filter(e => {
            const expenseTime = new Date(e.expenseDate).getTime();
            return expenseTime >= fromTime && expenseTime <= toTime;
        });

        const periodBadDebts = allBadDebts.filter(d => {
            const debtTime = new Date(d.writeOffDate).getTime();
            return debtTime >= fromTime && debtTime <= toTime;
        });

        const periodRefunds = allRefunds.filter(r => {
            const refundTime = new Date(r.refundDate).getTime();
            return refundTime >= fromTime && refundTime <= toTime;
        });


        // 1. Revenue Calculation
        const validOrders = periodOrders.filter(o => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Returned');
        const returnedOrders = periodOrders.filter(o => o.orderStatus === 'Cancelled' || o.orderStatus === 'Returned');
        
        const grossSales = validOrders.reduce((sum, order) => sum + (order.subtotal || order.totalAmount + (order.totalDiscount || 0)), 0);
        const salesDiscounts = validOrders.reduce((sum, order) => sum + (order.totalDiscount || 0), 0);
        const salesReturns = returnedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const netSales = grossSales - salesDiscounts; // Net Sales before returns for the Gross Profit calculation

        // 2. COGS Calculation
        const validOrderIds = new Set(validOrders.map(o => o.id));
        const relevantOrderItems = allOrderItems.filter(item => validOrderIds.has(item.orderId));
        const cogs = relevantOrderItems.reduce((sum, item) => sum + ((item.costPriceAtSale || 0) * (item.quantity || 0)), 0);

        // 3. Gross Profit
        const grossProfit = netSales - cogs;

        // 4. Operating Expenses
        const operatingExpensesBreakdown = periodExpenses.reduce((acc, expense) => {
            if (expense.category.toLowerCase() !== 'cost of goods sold') {
                if (!acc[expense.category]) {
                    acc[expense.category] = 0;
                }
                acc[expense.category] += expense.amount;
            }
            return acc;
        }, {} as Record<string, number>);
        const operatingExpenses = Object.values(operatingExpensesBreakdown).reduce((sum, amount) => sum + amount, 0);

        // 5. Other Losses
        const badDebtExpense = periodBadDebts.reduce((sum, debt) => sum + debt.amount, 0);
        const refundsExpense = periodRefunds.reduce((sum, refund) => sum + refund.amount, 0);
        const totalOtherLosses = badDebtExpense + refundsExpense + salesReturns; // Returns are treated as a loss against gross profit

        // 6. Net Profit
        const netProfit = grossProfit - operatingExpenses - totalOtherLosses;

        return {
            grossSales,
            salesReturns,
            salesDiscounts,
            netSales,
            cogs,
            grossProfit,
            operatingExpenses,
            operatingExpensesBreakdown,
            badDebtExpense,
            refundsExpense,
            totalOtherLosses,
            netProfit,
        };
    }, [allOrders, allOrderItems, allExpenses, allBadDebts, allRefunds, date]);

    const ReportItem = ({ label, value, isBold = false, isNegative = false, isSubItem = false, isFinal = false }: { label: string; value: number; isBold?: boolean; isNegative?: boolean; isSubItem?: boolean; isFinal?: boolean }) => (
        <div className={cn("flex justify-between py-2", isBold && "font-bold", isSubItem && "pl-4 text-sm")}>
            <span>{label}</span>
            <span className={cn(isNegative && 'text-destructive', isFinal && 'border-t-2 border-b-4 double border-foreground py-1 my-1')}>{`₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
        </div>
    );
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Profit &amp; Loss Statement</CardTitle>
                <CardDescription>An accrual-based P&amp;L report for the selected period, reflecting your business operations.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReportDateFilter date={date} setDate={setDate} />
                {isLoading ? (
                    <div className="space-y-4 mt-4 max-w-2xl mx-auto">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Separator />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Separator />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto mt-4 text-base">
                        <h3 className='font-bold text-lg mb-2'>Revenue</h3>
                        <ReportItem label="Gross Sales" value={reportData.grossSales} isSubItem />
                        <ReportItem label="Less: Sales Discounts" value={-reportData.salesDiscounts} isSubItem />
                        <ReportItem label="Net Sales" value={reportData.netSales} isBold />
                        
                        <Separator className='my-4'/>

                        <h3 className='font-bold text-lg mb-2'>Cost of Goods Sold</h3>
                        <ReportItem label="Total FIFO COGS" value={-reportData.cogs} />
                        
                        <Separator className='my-4' />

                        <ReportItem label="Gross Profit" value={reportData.grossProfit} isBold />

                        <Separator className='my-4' />

                        <h3 className='font-bold text-lg mb-2'>Operating Expenses</h3>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="operating-expenses" className="border-b-0 -my-2">
                                <AccordionTrigger className="py-2 font-normal hover:no-underline">
                                <div className="flex flex-1 justify-between">
                                    <span>Total Operating Expenses</span>
                                    <span>{`₱${(-reportData.operatingExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                                </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-8 pt-2">
                                {Object.entries(reportData.operatingExpensesBreakdown)
                                    .sort(([catA], [catB]) => catA.localeCompare(catB))
                                    .map(([category, amount]) => (
                                    <div key={category} className="flex justify-between py-1 text-sm text-muted-foreground">
                                        <span>{category}</span>
                                        <span>{`₱${(-amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                                    </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        
                        <Separator className='my-4' />

                        <h3 className='font-bold text-lg mb-2'>Other Losses & Adjustments</h3>
                        <ReportItem label="Sales Returns & Allowances" value={-reportData.salesReturns} isSubItem />
                        <ReportItem label="Bad Debt Expense" value={-reportData.badDebtExpense} isSubItem />
                        <ReportItem label="Refunds" value={-reportData.refundsExpense} isSubItem />
                        
                        <Separator className='my-4' />
                        
                        <ReportItem label="Net Profit" value={reportData.netProfit} isBold isNegative={reportData.netProfit < 0} isFinal/>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
