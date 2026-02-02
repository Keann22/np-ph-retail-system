'use client';

import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import {
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  format,
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';


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

export function SalesReport() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(startOfToday(), 1),
    to: endOfToday(),
  });

  const firestore = useFirestore();
  const { user } = useUser();

  const ordersQuery = useMemoFirebase(() => {
      if (!firestore || !user || !date?.from || !date.to) return null;
      return query(
          collection(firestore, 'orders'),
          where('orderStatus', '==', 'Completed'),
          where('orderDate', '>=', date.from.toISOString()),
          where('orderDate', '<=', date.to.toISOString())
      );
  }, [firestore, user, date]);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const usersQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return collection(firestore, 'users');
  }, [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const isLoading = isLoadingOrders || isLoadingUsers;

  const userMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  }, [users]);

  const salesByPerson = useMemo(() => {
    if (!orders || !userMap) return [];
    
    const salesData = orders
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
  }, [orders, userMap]);

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
          View completed sales for each salesperson within a selected date range.
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
