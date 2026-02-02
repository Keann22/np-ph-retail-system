'use client';

import { MoreHorizontal } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddCustomerDialog } from '@/components/dashboard/add-customer-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';


// Matches the Firestore document structure for a customer
type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  facebookProfileLink?: string;
  shippingAddresses: string[];
};

// Matches a subset of the Order type
type Order = {
    id: string;
    customerId: string;
    balanceDue: number;
    orderStatus: 'Pending Payment' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled' | 'Returned';
};


export default function CustomersPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const customersQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'customers') : null),
    [firestore, user]
  );
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

  const ordersQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'orders') : null),
    [firestore, user]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const isLoading = isLoadingCustomers || isLoadingOrders;

  const customerBalances = useMemo(() => {
    if (!orders) return new Map<string, number>();
    const balances = new Map<string, number>();
    for (const order of orders) {
        if (order.balanceDue > 0 && order.orderStatus !== 'Cancelled' && order.orderStatus !== 'Returned') {
            const currentBalance = balances.get(order.customerId) || 0;
            balances.set(order.customerId, currentBalance + order.balanceDue);
        }
    }
    return balances;
  }, [orders]);


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Customers</CardTitle>
          <CardDescription>
            View and manage your customer database.
          </CardDescription>
        </div>
        <AddCustomerDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Balance Owed</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
                 <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className='space-y-2'>
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell>
                        <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                 </TableRow>
            ))}
            {customers && customers.map((customer) => {
              const balance = customerBalances.get(customer.id) || 0;
              const status: {text: string, variant: 'outline' | 'destructive'} = balance > 0 ? { text: 'Has Balance', variant: 'destructive' } : { text: 'Paid Up', variant: 'outline' };

              return (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarFallback>{customer.firstName.charAt(0)}{customer.lastName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                  </div>
                </TableCell>
                <TableCell>{customer.phoneNumber || 'N/A'}</TableCell>
                <TableCell>
                    <Badge variant={status.variant}>{status.text}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                    {balance > 0 ? `₱${balance.toFixed(2)}` : '—'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/customers/${customer.id}`)}>
                        View Account
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
        {!isLoading && (!customers || customers.length === 0) && (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                <p className="text-lg font-semibold">No customers found</p>
                <p className="text-muted-foreground mt-2">
                    Click "Add Customer" to get started.
                </p>
            </div>
        )}
      </CardContent>
      {customers && customers.length > 0 && (
        <CardFooter>
            <div className="text-xs text-muted-foreground">
            Showing <strong>1-{customers.length}</strong> of <strong>{customers.length}</strong> customers
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
