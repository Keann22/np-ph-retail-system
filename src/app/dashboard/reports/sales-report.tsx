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
  subMonths,
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
  CardFooter,
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
  TableFooter as ReportTableFooter,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Matches a subset of the Firestore document structure for an order
type Order = {
  id: string;
  totalAmount: number;
  orderDate: string; // ISO string
  salesPersonId: string;
  orderStatus: 'Pending Payment' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled';
};

// Matches a subset of the Firestore document structure for a user
type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
};

type SalesData = {
    userId: string;
    name: string;
    salesCount: number;
    totalAmount: number;
}

// --- STATIC PLACEHOLDER DATA ---
const staticUsers: UserProfile[] = [
    { id: 'user1', firstName: 'Keneth', lastName: 'Ornos' },
    { id: 'user2', firstName: 'Jane', lastName: 'Sales' },
];

const staticOrders: Order[] = [
    { id: 'ord1', salesPersonId: 'user1', orderDate: new Date(2024, 6, 20).toISOString(), totalAmount: 250, orderStatus: 'Completed' },
    { id: 'ord2', salesPersonId: 'user2', orderDate: new Date(2024, 6, 18).toISOString(), totalAmount: 1200, orderStatus: 'Completed' },
    { id: 'ord3', salesPersonId: 'user1', orderDate: new Date(2024, 6, 15).toISOString(), totalAmount: 300, orderStatus: 'Completed' },
    { id: 'ord4', salesPersonId: 'user2', orderDate: new Date(2024, 6, 12).toISOString(), totalAmount: 800, orderStatus: 'Processing' }, // This one should be filtered out
];
// --- END STATIC DATA ---

export function SalesReport() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(startOfToday(), 1),
    to: endOfToday(),
  });

  const isLoading = false; // Using static data

  const userMap = useMemo(() => {
    return new Map(staticUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  }, []);

  const salesByPerson = useMemo(() => {
    if (!staticOrders || !date?.from) return [];
    
    const intervalEnd = date.to ?? endOfDay(date.from);

    const salesData = staticOrders
      .filter(order => {
        const orderDate = new Date(order.orderDate);
        return (
          order.orderStatus === 'Completed' &&
          isWithinInterval(orderDate, { start: date.from!, end: intervalEnd })
        );
      })
      .reduce((acc, order) => {
        const { salesPersonId, totalAmount } = order;
        if (!salesPersonId) return acc; // Skip if no salesperson assigned

        if (!acc[salesPersonId]) {
          acc[salesPersonId] = {
            userId: salesPersonId,
            name: userMap.get(salesPersonId) || 'Unknown User',
            salesCount: 0,
            totalAmount: 0,
          };
        }
        
        acc[salesPersonId].salesCount += 1;
        acc[salesPersonId].totalAmount += totalAmount;
        
        return acc;
      }, {} as Record<string, SalesData>);
      
      return Object.values(salesData).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [userMap, date]);

  const grandTotal = useMemo(() => {
    return salesByPerson.reduce((sum, item) => sum + item.totalAmount, 0);
  }, [salesByPerson]);

  const setDatePreset = (preset: 'today' | 'yesterday') => {
    const from = preset === 'today' ? startOfToday() : startOfYesterday();
    const to = preset === 'today' ? endOfToday() : endOfYesterday();
    setDate({ from, to });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Sales Report by Person</CardTitle>
        <CardDescription>
          View completed sales for each salesperson within a selected date range. (Currently showing static data)
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
                    id="sales-date-picker"
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
              <TableHead>Sales Person</TableHead>
              <TableHead className="text-center">Number of Sales</TableHead>
              <TableHead className="text-right">Total Sales Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))}
            {salesByPerson.map((sale) => (
              <TableRow key={sale.userId}>
                <TableCell className="font-medium">{sale.name}</TableCell>
                <TableCell className="text-center">{sale.salesCount}</TableCell>
                <TableCell className="text-right">₱{sale.totalAmount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <ReportTableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-bold">Grand Total</TableCell>
              <TableCell className="text-right font-bold">
                {isLoading ? <Skeleton className="h-5 w-28 ml-auto" /> : `₱${grandTotal.toFixed(2)}`}
              </TableCell>
            </TableRow>
          </ReportTableFooter>
        </Table>
        {!isLoading && salesByPerson.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
            <p className="text-lg font-semibold">No Completed Sales Found</p>
            <p className="text-muted-foreground mt-2">
              There are no orders with "Completed" status in the selected date range.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
