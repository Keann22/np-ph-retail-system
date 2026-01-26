'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Order } from '../orders/page';

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};


export default function ReportsPage() {
  const [activeFilter, setActiveFilter] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const firestore = useFirestore();

  useEffect(() => {
    if (activeFilter === 'today') {
      setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    } else if (activeFilter === 'yesterday') {
      const yesterday = subDays(new Date(), 1);
      setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
    }
  }, [activeFilter]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !dateRange?.from || !dateRange?.to) return null;

    return query(
      collection(firestore, 'orders'),
      where('orderStatus', '==', 'Processing'),
      where('orderDate', '>=', dateRange.from.toISOString()),
      where('orderDate', '<=', dateRange.to.toISOString())
    );
  }, [firestore, dateRange]);
  
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
          View processed orders for a specific date range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
                variant={activeFilter === 'today' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('today')}
            >
                Today
            </Button>
            <Button
                variant={activeFilter === 'yesterday' ? 'default' : 'outline'}
                onClick={() => setActiveFilter('yesterday')}
            >
                Yesterday
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={activeFilter === 'custom' ? 'default' : 'outline'}
                    className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                    )}
                    onClick={() => setActiveFilter('custom')}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                    dateRange.to ? (
                        <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(dateRange.from, "LLL dd, y")
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
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                        if (range?.from && range?.to) {
                            setDateRange({
                                from: startOfDay(range.from),
                                to: endOfDay(range.to),
                            });
                        } else if (range?.from) {
                            setDateRange({
                                from: startOfDay(range.from),
                                to: endOfDay(range.from),
                            })
                        }
                    }}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
        </div>

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
                    There are no orders with the status "Processing" for the selected date range.
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
