'use client';

import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddOrderDialog } from '@/components/dashboard/add-order-dialog';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LogPaymentDialog } from '@/components/dashboard/log-payment-dialog';

// Matches the Firestore document structure for an order
export type Order = {
  id: string;
  customerId: string;
  orderDate: string; // ISO string
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  orderStatus: 'Pending Payment' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled';
  paymentType: 'Full Payment' | 'Lay-away' | 'Installment';
};

// Matches the Firestore document structure for a customer
type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

const getStatusVariant = (status: Order['orderStatus']) => {
  switch (status) {
    case 'Shipped':
    case 'Completed':
      return 'outline';
    case 'Processing':
      return 'secondary';
    case 'Cancelled':
      return 'destructive';
    case 'Pending Payment':
    default:
      return 'default';
  }
}

const statuses: Order['orderStatus'][] = ['Pending Payment', 'Processing', 'Shipped', 'Completed'];

export default function OrdersPage() {
  const [logPaymentOrder, setLogPaymentOrder] = useState<Order | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const ordersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'orders'), orderBy('orderDate', 'desc')) : null),
    [firestore]
  );
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

  const handleStatusChange = (orderId: string, status: Order['orderStatus']) => {
    if (!firestore) return;
    const orderDocRef = doc(firestore, 'orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { orderStatus: status });
    toast({
      title: 'Order Status Updated',
      description: `The order is now marked as "${status}".`,
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Orders</CardTitle>
            <CardDescription>
              View and manage customer sales orders.
            </CardDescription>
          </div>
          <AddOrderDialog />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                   </TableRow>
              ))}
              {formattedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.customerName}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {order.paymentType}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={getStatusVariant(order.orderStatus)}>
                      {order.orderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {order.formattedDate}
                  </TableCell>
                  <TableCell className="text-right">{order.formattedTotal}</TableCell>
                  <TableCell>
                    <div className='flex justify-end'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLogPaymentOrder(order)}>
                            Log Payment
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <span>Update Status</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuRadioGroup
                                value={order.orderStatus}
                                onValueChange={(newStatus) => {
                                  if (newStatus !== order.orderStatus) {
                                    handleStatusChange(order.id, newStatus as Order['orderStatus']);
                                  }
                                }}
                              >
                                {statuses.map((status) => (
                                  <DropdownMenuRadioItem key={status} value={status} disabled={order.orderStatus === status}>
                                    {status}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => handleStatusChange(order.id, 'Cancelled')}
                            disabled={order.orderStatus === 'Cancelled'}
                          >
                            Cancel Order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && formattedOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                  <p className="text-lg font-semibold">No orders found</p>
                  <p className="text-muted-foreground mt-2">
                      Click "New Order" to get started.
                  </p>
              </div>
          )}
        </CardContent>
         {formattedOrders.length > 0 && (
          <CardFooter>
              <div className="text-xs text-muted-foreground">
              Showing <strong>1-{formattedOrders.length}</strong> of <strong>{formattedOrders.length}</strong> orders
              </div>
          </CardFooter>
        )}
      </Card>
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
