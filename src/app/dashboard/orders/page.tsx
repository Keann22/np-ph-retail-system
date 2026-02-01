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
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  orderStatus: 'Pending Payment' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled' | 'Returned';
  paymentType: 'Full Payment' | 'Lay-away' | 'Installment';
};

// Placeholder data to prevent crash
const staticOrders: (Order & {customerName: string})[] = [
    { id: '1', customerId: '1', customerName: 'Olivia Martin', orderDate: new Date(2024, 6, 15).toISOString(), totalAmount: 1999.00, amountPaid: 1999.00, balanceDue: 0, orderStatus: 'Completed', paymentType: 'Full Payment' },
    { id: '2', customerId: '2', customerName: 'Jackson Lee', orderDate: new Date(2024, 6, 14).toISOString(), totalAmount: 39.00, amountPaid: 0, balanceDue: 39.00, orderStatus: 'Pending Payment', paymentType: 'Full Payment' },
    { id: '3', customerId: '3', customerName: 'Isabella Nguyen', orderDate: new Date(2024, 6, 12).toISOString(), totalAmount: 598.00, amountPaid: 300, balanceDue: 298.00, orderStatus: 'Processing', paymentType: 'Lay-away' },
    { id: '4', customerId: '4', customerName: 'William Kim', orderDate: new Date(2024, 5, 30).toISOString(), totalAmount: 99.00, amountPaid: 99.00, balanceDue: 0, orderStatus: 'Shipped', paymentType: 'Full Payment' },
];

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

const statuses: Order['orderStatus'][] = ['Pending Payment', 'Processing', 'Shipped', 'Completed', 'Returned'];

export default function OrdersPage() {
  const [logPaymentOrder, setLogPaymentOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  const isLoading = false; // Using static data

  const formattedOrders = useMemo(() => {
    return staticOrders.map(order => ({
      ...order,
      formattedDate: format(new Date(order.orderDate), 'PPP'),
      formattedTotal: `₱${order.totalAmount.toFixed(2)}`,
    }));
  }, []);
  
  const processOrderReturn = async (orderId: string) => {
    toast({
        variant: "default",
        title: 'Action Disabled',
        description: 'Return processing is disabled while using placeholder data.'
    });
  }


  const handleStatusChange = (orderId: string, status: Order['orderStatus']) => {
     toast({
        variant: "default",
        title: 'Action Disabled',
        description: 'Status changes are disabled while using placeholder data.'
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Orders</CardTitle>
            <CardDescription>
              View and manage customer sales orders. (Currently showing static data)
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
                            disabled={order.orderStatus === 'Cancelled' || order.orderStatus === 'Returned'}
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
