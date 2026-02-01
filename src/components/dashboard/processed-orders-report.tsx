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
  endOfDay,
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

// --- STATIC PLACEHOLDER DATA ---
const staticCustomers: Customer[] = [
    { id: 'cust1', firstName: 'Liam', lastName: 'Johnson' },
    { id: 'cust2', firstName: 'Ava', lastName: 'Williams' },
];

const staticOrders: Order[] = [
    { id: 'ord1', customerId: 'cust1', orderDate: new Date().toISOString(), totalAmount: 150.00, orderStatus: 'Processing', paymentType: 'Full Payment' },
    { id: 'ord2', customerId: 'cust2', orderDate: new Date().toISOString(), totalAmount: 75.50, orderStatus: 'Processing', paymentType: 'Lay-away' },
    { id: 'ord3', customerId: 'cust1', orderDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), totalAmount: 200.00, orderStatus: 'Processing', paymentType: 'Full Payment' },
];
// --- END STATIC DATA ---

export function ProcessedOrdersReport() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfToday(),
    to: endOfToday(),
  });

  const isLoading = false; // Using static data

  const customerMap = useMemo(() => {
    return new Map(staticCustomers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
  }, []);

  const formattedOrders = useMemo(() => {
    if (!staticOrders || !date?.from) return [];

    const intervalEnd = date.to ?? endOfDay(date.from);

    return staticOrders
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
  }, [customerMap, date]);

  const totalProcessedAmount = useMemo(() => {
    if (isLoading) return 0;
    return formattedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  }, [formattedOrders, isLoading]);
  
  const setDatePreset = (preset: 'today' | 'yesterday') => {
    const from = preset === 'today' ? startOfToday() : startOfYesterday();
    const to = preset === 'today' ? endOfToday() : endOfYesterday();
    setDate({ from, to });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline">Processed Orders Report</CardTitle>
            <CardDescription>
              View all orders currently in the "Processing" state for a selected date range. (Currently showing static data)
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Total for Period</p>
            {isLoading ? (
                <Skeleton className="h-8 w-32 mt-1" />
            ) : (
                <p className="text-2xl font-bold">₱{totalProcessedAmount.toFixed(2)}</p>
            )}
          </div>
        </div>
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
