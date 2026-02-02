'use client';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';

// Types based on backend.json
type Order = {
    id: string;
    totalAmount: number;
    balanceDue: number;
    orderDate: string;
    customerId: string;
    paymentType: 'Full Payment' | 'Lay-away' | 'Installment';
    orderStatus: string;
};

type Customer = {
    id: string;
    firstName: string;
    lastName: string;
};

// The type for the filtered, display-ready data
type ReceivableOrder = Order & {
    customerName: string;
};

export function AccountsReceivableReport() {
    const firestore = useFirestore();
    const { user } = useUser();

    // 1. Fetch ALL orders, no server-side filtering
    const allOrdersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'orders'));
    }, [firestore, user]);
    const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(allOrdersQuery);
    
    // 2. Fetch ALL customers to create a name map
    const customersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'customers');
    }, [firestore, user]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

    const isLoading = isLoadingOrders || isLoadingCustomers;

    // Create a map for quick customer lookup
    const customerMap = useMemo(() => {
        if (!customers) return new Map();
        return new Map(customers.map(c => [c.id, `${c.firstName} ${c.lastName}`]));
    }, [customers]);

    // 3. Perform filtering on the CLIENT-SIDE
    const { totalOutstanding, customerBreakdown } = useMemo(() => {
        if (!allOrders) {
            return { totalOutstanding: 0, customerBreakdown: [] };
        }

        // Filter for orders that constitute accounts receivable
        const arOrders = allOrders.filter(order => 
            order.balanceDue > 0 && 
            (order.paymentType === 'Installment' || order.paymentType === 'Lay-away')
        );

        const total = arOrders.reduce((sum, order) => sum + order.balanceDue, 0);

        const breakdown: ReceivableOrder[] = arOrders.map(order => ({
            ...order,
            customerName: customerMap.get(order.customerId) || 'Unknown Customer'
        })).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()); // Sort by most recent

        return { totalOutstanding: total, customerBreakdown: breakdown };
    }, [allOrders, customerMap]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <CardTitle className="font-headline">Accounts Receivable</CardTitle>
                        <CardDescription>Report on outstanding installment and lay-away balances.</CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                        {isLoading ? (
                            <Skeleton className="h-8 w-32 mt-1" />
                        ) : (
                            <p className="text-2xl font-bold">₱{totalOutstanding.toFixed(2)}</p>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    This report lists all customers with a remaining balance.
                </p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Order Date</TableHead>
                            <TableHead>Payment Type</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Balance Due</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading && Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                    {customerBreakdown.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.customerName}</TableCell>
                            <TableCell>{format(new Date(order.orderDate), 'PPP')}</TableCell>
                            <TableCell>
                                <span className="text-muted-foreground">{order.paymentType}</span>
                            </TableCell>
                            <TableCell className="text-right">₱{order.totalAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">₱{order.balanceDue.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                {!isLoading && customerBreakdown.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                    <p className="text-lg font-semibold">No Outstanding Balances</p>
                    <p className="text-muted-foreground mt-2">
                        All installment and lay-away plans are fully paid.
                    </p>
                </div>
                )}
            </CardContent>
        </Card>
    );
}
