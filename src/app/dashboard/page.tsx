'use client';

import { Activity, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Overview } from '@/components/dashboard/overview';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { AiRecommendations } from '@/components/dashboard/ai-recommendations';
import { Skeleton } from '@/components/ui/skeleton';

// Types based on backend.json
type Order = {
  id: string;
  totalAmount: number;
  balanceDue: number;
  orderStatus: 'Pending Payment' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled' | 'Returned';
};

type OrderItem = {
  orderId: string;
  quantity: number;
  costPriceAtSale: number;
};

type Expense = {
  amount: number;
  category: string;
};


export default function DashboardPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    // Queries
    const ordersQuery = useMemoFirebase(
        () => (firestore && user ? collection(firestore, 'orders') : null),
        [firestore, user]
    );

    const orderItemsQuery = useMemoFirebase(
        () => (firestore && user ? collection(firestore, 'orderItems') : null),
        [firestore, user]
    );

    const expensesQuery = useMemoFirebase(
        () => (firestore && user ? collection(firestore, 'expenses') : null),
        [firestore, user]
    );
    
    // Data fetching
    const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);
    const { data: orderItems, isLoading: isLoadingOrderItems } = useCollection<OrderItem>(orderItemsQuery);
    const { data: expenses, isLoading: isLoadingExpenses } = useCollection<Expense>(expensesQuery);

    const isLoading = isLoadingOrders || isLoadingOrderItems || isLoadingExpenses;

    const dashboardMetrics = useMemo(() => {
        if (!orders || !orderItems || !expenses) {
            return {
                totalRevenue: 0,
                netProfit: 0,
                salesCount: 0,
                accountsReceivable: 0,
                arCount: 0,
            };
        }

        const validOrders = orders.filter(o => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Returned');

        const totalRevenue = validOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        const salesCount = validOrders.length;
        
        const accountsReceivableData = orders.filter(o => o.balanceDue > 0);
        const accountsReceivable = accountsReceivableData.reduce((sum, order) => sum + order.balanceDue, 0);
        const arCount = accountsReceivableData.length;

        // Net Profit Calculation
        const validOrderIds = new Set(validOrders.map(o => o.id));
        const relevantOrderItems = orderItems.filter(item => validOrderIds.has(item.orderId));
        
        const totalCogs = relevantOrderItems.reduce((sum, item) => sum + ((item.costPriceAtSale || 0) * (item.quantity || 0)), 0);
        
        const operatingExpenses = expenses.reduce((sum, expense) => {
            if (expense.category.toLowerCase() !== 'cost of goods sold') {
                return sum + expense.amount;
            }
            return sum;
        }, 0);
        
        // Note: Bad Debts are not included here for simplicity, but could be added.
        const grossProfit = totalRevenue - totalCogs;
        const netProfit = grossProfit - operatingExpenses;

        return {
            totalRevenue,
            netProfit,
            salesCount,
            accountsReceivable,
            arCount,
        }

    }, [orders, orderItems, expenses]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : (
                <div className="text-2xl font-bold">₱{dashboardMetrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total revenue from all non-cancelled orders.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : (
                <div className="text-2xl font-bold">₱{dashboardMetrics.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Revenue minus COGS and operating expenses.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/2 mt-1" /> : (
                <div className="text-2xl font-bold">+{dashboardMetrics.salesCount.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total number of non-cancelled orders.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Accounts Receivable
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4 mt-1" /> : (
                <div className="text-2xl font-bold">₱{dashboardMetrics.accountsReceivable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {dashboardMetrics.arCount} active installments
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentSales />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8">
        <AiRecommendations />
      </div>
    </>
  );
}
