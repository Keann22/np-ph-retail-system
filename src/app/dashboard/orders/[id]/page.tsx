'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { type Order } from '@/app/dashboard/orders/page';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Product = {
    id: string;
    name: string;
}

type OrderItem = {
    id: string;
    orderId: string;
    productId: string;
    productName?: string;
    quantity: number;
    costPriceAtSale: number;
    sellingPriceAtSale: number;
    discount?: number;
}

type Payment = {
  id: string;
  orderId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
}

const getStatusVariant = (status: Order['orderStatus']) => {
    switch (status) {
      case 'Shipped':
      case 'Completed':
        return 'outline';
      case 'Processing':
        return 'secondary';
      case 'Cancelled':
      case 'Returned':
          return 'destructive';
      case 'Pending Payment':
      default:
        return 'default';
    }
  }

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const firestore = useFirestore();

  const orderRef = useMemoFirebase(() => (firestore && orderId ? doc(firestore, 'orders', orderId) : null), [firestore, orderId]);
  const { data: order, isLoading: isLoadingOrder } = useDoc<Order>(orderRef);

  const customersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'customers')) : null), [firestore]);
  const { data: allCustomers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  
  const productsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'products')) : null), [firestore]);
  const { data: allProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const orderItemsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orderItems')) : null), [firestore]);
  const { data: allOrderItems, isLoading: isLoadingOrderItems } = useCollection<OrderItem>(orderItemsQuery);
  
  const paymentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'payments')) : null), [firestore]);
  const { data: allPayments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const isLoading = isLoadingOrder || isLoadingCustomers || isLoadingOrderItems || isLoadingPayments || isLoadingProducts;

  const customer = useMemo(() => {
    if (!order || !allCustomers) return null;
    return allCustomers.find(c => c.id === order.customerId) || null;
  }, [order, allCustomers]);

  const productMap = useMemo(() => {
    if (!allProducts) return new Map<string, string>();
    return new Map(allProducts.map(p => [p.id, p.name]));
  }, [allProducts]);

  const orderItems = useMemo(() => {
    if (!allOrderItems || !orderId) return [];
    return allOrderItems
        .filter(item => item.orderId === orderId)
        .map(item => ({
            ...item,
            productName: productMap.get(item.productId) || 'Unknown Product'
        }));
  }, [allOrderItems, orderId, productMap]);

  const payments = useMemo(() => {
    if (!allPayments || !orderId) return [];
    return allPayments.filter(p => p.orderId === orderId).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [allPayments, orderId]);

  if (isLoading) {
    return null; // Handled by loading.tsx
  }

  if (!order) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Order Not Found</CardTitle>
                <CardDescription>The requested order could not be found.</CardDescription>
            </CardHeader>
        </Card>
    );
  }
  
  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-headline">Order #{order.id.substring(0, 7).toUpperCase()}</CardTitle>
              <CardDescription>
                Placed on {format(new Date(order.orderDate), 'PPP')}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(order.orderStatus)} className="text-base">
                {order.orderStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Customer</p>
            <p className="font-semibold">{customer ? `${customer.firstName} ${customer.lastName}` : 'Loading...'}</p>
            <p className="text-sm text-muted-foreground">{customer?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Payment Type</p>
            <p className="font-semibold">{order.paymentType}</p>
            {order.paymentType === 'Installment' && (
                <p className="text-sm text-muted-foreground">{order.installmentMonths} months</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderItems.length > 0 ? orderItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">₱{item.sellingPriceAtSale.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-destructive">- ₱{(item.discount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">₱{((item.sellingPriceAtSale - (item.discount || 0)) * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No items found for this order.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length > 0 ? payments.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>{format(new Date(p.paymentDate), 'PPp')}</TableCell>
                                <TableCell>{p.paymentMethod}</TableCell>
                                <TableCell className="text-right font-medium">₱{p.amount.toFixed(2)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center">No payments logged yet.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card className="md:col-span-2">
            <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₱{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">- ₱{(order.totalDiscount || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>₱{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span>₱{order.amountPaid.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-semibold text-base">
                    <span>Balance Due</span>
                    <span>₱{order.balanceDue.toFixed(2)}</span>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
