'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order } from '../orders/page';

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};


export default function ReportsPage() {
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    return query(
      collection(firestore, 'orders'),
      where('orderStatus', '==', 'Processing'),
      orderBy('orderDate', 'desc')
    );
  }, [firestore]);
  
  const customersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'customers') : null),
    [firestore]
  );

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Omit<Order, 'id'>>(ordersQuery);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Omit<Customer, 'id'>>(customersQuery);
  
  const isLoading = isLoadingOrders || isLoadingCustomers;

  const customerMap = useMemo(() => {
    if (!customers) return new Map();
    return new Map(customers.map(c => [c.id, `${c.firstName} ${c.lastName}`]));
  }, [customers]);

  const formattedOrders = useMemo(() => {
    if (!orders) return [];
    return orders.map(order => ({
      ...order,
      customerName: customerMap.get(order.customerId) || 'Unknown Customer',
      formattedDate: format(new Date(order.orderDate), 'PPP'),
      formattedTotal: `₱${order.totalAmount.toFixed(2)}`,
    }));
  }, [orders, customerMap]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Processed Orders Report</CardTitle>
        <CardDescription>
          A list of all orders currently in the "Processing" state.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden sm:table-cell">Payment Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
            ))}
            {formattedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div className="font-medium">{order.customerName}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {order.formattedDate}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                    {order.paymentType}
                </TableCell>
                <TableCell className="text-right">{order.formattedTotal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!isLoading && formattedOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                <p className="text-lg font-semibold">No processed orders found</p>
                <p className="text-muted-foreground mt-2">
                    There are currently no orders with the status "Processing".
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
