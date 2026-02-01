'use client';
import { useMemo } from 'react';
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
import { format } from 'date-fns';

type Order = {
    id: string;
    amountPaid: number;
    balanceDue: number;
    orderDate: string;
    customerId: string;
    paymentType: string;
    orderStatus: string;
};

type Customer = {
    id: string;
    firstName: string;
    lastName: string;
};

// --- STATIC PLACEHOLDER DATA ---
const staticCustomers: Customer[] = [
    { id: 'cust1', firstName: 'John', lastName: 'Doe' },
    { id: 'cust2', firstName: 'Jane', lastName: 'Smith' },
];

const staticLayawayOrders: Order[] = [
    { id: 'ord1', customerId: 'cust1', orderDate: new Date(2024, 6, 1).toISOString(), amountPaid: 100, balanceDue: 400, paymentType: 'Lay-away', orderStatus: 'Processing' },
    { id: 'ord2', customerId: 'cust2', orderDate: new Date(2024, 6, 15).toISOString(), amountPaid: 50, balanceDue: 50, paymentType: 'Lay-away', orderStatus: 'Pending Payment' },
];
// --- END STATIC DATA ---

export function LayawayReport() {
    const isLoading = false; // Using static data

    const customerMap = useMemo(() => {
        return new Map(staticCustomers.map(c => [c.id, `${c.firstName} ${c.lastName}`]));
    }, []);

    const { totalPaid, totalPending, breakdown } = useMemo(() => {
        if (!staticLayawayOrders) {
            return { totalPaid: 0, totalPending: 0, breakdown: [] };
        }

        const paid = staticLayawayOrders.reduce((sum, order) => sum + order.amountPaid, 0);
        const pending = staticLayawayOrders.reduce((sum, order) => sum + order.balanceDue, 0);
        const orderBreakdown = staticLayawayOrders.map(order => ({
            ...order,
            customerName: customerMap.get(order.customerId) || 'Unknown Customer'
        }));

        return { totalPaid: paid, totalPending: pending, breakdown: orderBreakdown };
    }, [customerMap]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Lay-away (Hulugan) Balances</CardTitle>
                <CardDescription>Report on active lay-away plans where items have not yet been released. (Currently showing static data)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Active Lay-aways (Total Paid)</CardDescription>
                            <CardTitle className="text-3xl">
                                {isLoading ? <Skeleton className="h-8 w-32" /> : `₱${totalPaid.toFixed(2)}`}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">This is cash received for items not yet completed.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Pending Completion (Balance Due)</CardDescription>
                            <CardTitle className="text-3xl">
                                {isLoading ? <Skeleton className="h-8 w-32" /> : `₱${totalPending.toFixed(2)}`}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">This is the remaining amount to be collected for these lay-away plans.</p>
                        </CardContent>
                    </Card>
                </div>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Order Date</TableHead>
                            <TableHead className="text-right">Amount Paid</TableHead>
                            <TableHead className="text-right">Balance Due</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading && Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                    {breakdown.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.customerName}</TableCell>
                            <TableCell>{format(new Date(order.orderDate), 'PPP')}</TableCell>
                            <TableCell className="text-right">₱{order.amountPaid.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">₱{order.balanceDue.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                {!isLoading && breakdown.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                    <p className="text-lg font-semibold">No Active Lay-away Plans</p>
                    <p className="text-muted-foreground mt-2">
                    There are no current orders marked as 'Lay-away'.
                    </p>
                </div>
                )}
            </CardContent>
        </Card>
    );
}
