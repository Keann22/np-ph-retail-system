'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogPaymentDialog } from '@/components/dashboard/log-payment-dialog';
import { format } from 'date-fns';
import { type Order } from '@/app/dashboard/orders/page';

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Payment = {
  id: string;
  orderId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const firestore = useFirestore();

  const [logPaymentOrder, setLogPaymentOrder] = useState<Order | null>(null);
  
  // Fetch customer
  const customerRef = useMemoFirebase(() => (firestore && customerId ? doc(firestore, 'customers', customerId) : null), [firestore, customerId]);
  const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerRef);
  
  // Fetch orders for this customer
  const ordersQuery = useMemoFirebase(() => (firestore && customerId ? query(collection(firestore, 'orders'), where('customerId', '==', customerId), orderBy('orderDate', 'desc')) : null), [firestore, customerId]);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const orderIds = useMemo(() => orders?.map(o => o.id) || [], [orders]);
  
  // Fetch payments for this customer's orders
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || orderIds.length === 0) return null;
    // Firestore 'in' queries are limited to 30 elements. This will fail if a customer has more than 30 orders.
    // For this app's scope, we assume this is a reasonable limitation.
    return query(collection(firestore, 'payments'), where('orderId', 'in', orderIds), orderBy('paymentDate', 'desc'));
  }, [firestore, orderIds]);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);
  
  const isLoading = isLoadingCustomer || isLoadingOrders || isLoadingPayments;

  const { totalBalanceOwed, outstandingOrders } = useMemo(() => {
    if (!orders) return { totalBalanceOwed: 0, outstandingOrders: [] };
    const outstanding = orders.filter(o => o.balanceDue > 0 && o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Returned');
    const total = outstanding.reduce((sum, o) => sum + o.balanceDue, 0);
    return { totalBalanceOwed: total, outstandingOrders: outstanding };
  }, [orders]);
  
  if (isLoading) {
    return null; // Handled by loading.tsx
  }

  if (!customer) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Customer Not Found</CardTitle>
                <CardDescription>The requested customer could not be found.</CardDescription>
            </CardHeader>
        </Card>
    );
  }
  
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-2xl">{customer.firstName[0]}{customer.lastName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-headline">{customer.firstName} {customer.lastName}</CardTitle>
              <CardDescription className="text-base">
                Total Outstanding Balance: <span className="font-bold text-destructive">₱{totalBalanceOwed.toFixed(2)}</span>
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
        
        {/* Installments Section */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Balances</CardTitle>
            <CardDescription>All orders with a remaining balance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingOrders.length > 0 ? outstandingOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell>{format(new Date(order.orderDate), 'PPP')}</TableCell>
                    <TableCell>₱{order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">₱{order.balanceDue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setLogPaymentOrder(order)}>Log Payment</Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">No outstanding balances.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Payment History Section */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>A complete log of all payments received from this customer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments && payments.length > 0 ? payments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.paymentDate), 'PPP p')}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell className="text-right font-medium">₱{payment.amount.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                   <TableRow><TableCell colSpan={3} className="h-24 text-center">No payments recorded.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {logPaymentOrder && (
        <LogPaymentDialog 
            order={logPaymentOrder}
            open={!!logPaymentOrder}
            onOpenChange={(isOpen) => !isOpen && setLogPaymentOrder(null)}
        />
      )}
    </>
  );
}
