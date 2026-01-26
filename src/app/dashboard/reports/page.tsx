'use client';

import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import {
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  format,
  isWithinInterval,
} from 'date-fns';
import { Calendar as CalendarIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Matches the Firestore document structure for an order
type Order = {
  id: string;
  customerId: string;
  orderDate: string; // ISO string
  totalAmount: number;
  orderStatus: 'Pending Payment' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled';
  paymentType: 'Full Payment' | 'Lay-away' | 'Installment';
};

// Matches the Firestore document structure for a customer
type Customer = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfToday(),
    to: endOfToday(),
  });

  const firestore = useFirestore();

  // Query for all orders, ordered by date. Filtering will happen on the client.
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      orderBy('orderDate', 'desc')
    );
  }, [firestore]);
  
  const customersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'customers') : null),
    [firestore]
  );

  const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Omit<Order, 'id'>>(ordersQuery);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Omit<Customer, 'id'>>(customersQuery);

  const isLoading = isLoadingOrders || isLoadingCustomers;

  const customerMap = useMemo(() => {
    if (!customers) return new Map();
    return new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
  }, [customers]);

  const formattedOrders = useMemo(() => {
    if (!allOrders || !date?.from) return [];

    const intervalEnd = date.to ?? endOfToday(date.from);

    return allOrders
      .filter(order => {
        const orderDate = new Date(order.orderDate);
        return (
          order.orderStatus === 'Processing' &&
          isWithinInterval(orderDate, { start: date.from!, end: intervalEnd })
        );
      })
      .map((order) => ({
        ...order,
        customerName: customerMap.get(order.customerId) || 'Unknown Customer',
        formattedDate: format(new Date(order.orderDate), 'PPP p'),
        formattedTotal: `₱${order.totalAmount.toFixed(2)}`,
      }));
  }, [allOrders, customerMap, date]);
  
  const setDatePreset = (preset: 'today' | 'yesterday') => {
    const from = preset === 'today' ? startOfToday() : startOfYesterday();
    const to = preset === 'today' ? endOfToday() : endOfYesterday();
    setDate({ from, to });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Processed Orders Report</CardTitle>
        <CardDescription>
          View all orders currently in the "Processing" state for a selected date range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm font-medium">Filter by:</span>
            <Button variant={cn(date?.from?.toDateString() === startOfToday().toDateString() ? 'default': 'outline')} size="sm" onClick={() => setDatePreset('today')}>Today</Button>
            <Button variant={cn(date?.from?.toDateString() === startOfYesterday().toDateString() ? 'default': 'outline')} size="sm" onClick={() => setDatePreset('yesterday')}>Yesterday</Button>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    size="sm"
                    className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                    date.to ? (
                        <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(date.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pick a date</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="ml-auto">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
            </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))}
            {formattedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.customerName}</TableCell>
                <TableCell>{order.formattedDate}</TableCell>
                <TableCell>{order.paymentType}</TableCell>
                <TableCell className="text-right">{order.formattedTotal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && formattedOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
            <p className="text-lg font-semibold">No Processed Orders Found</p>
            <p className="text-muted-foreground mt-2">
              There are no orders with "Processing" status in the selected date range.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
