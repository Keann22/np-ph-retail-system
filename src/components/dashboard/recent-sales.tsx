'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useUserProfile } from '@/hooks/useUserProfile';

type Order = {
    id: string;
    customerId: string;
    totalAmount: number;
};

type Customer = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};

export function RecentSales() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { userProfile } = useUserProfile();

    // Check permissions: Inventory ONLY users cannot see customer list
    const canSeeCustomers = useMemo(() => {
        if (!userProfile) return false;
        return userProfile.roles.some(r => ['Owner', 'Admin', 'Sales'].includes(r));
    }, [userProfile]);

    const recentOrdersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'orders'), orderBy('orderDate', 'desc'), limit(5));
    }, [firestore, user]);

    // ONLY fetch customers if authorized
    const customersQuery = useMemoFirebase(() => {
        if (!firestore || !user || !canSeeCustomers) return null;
        return collection(firestore, 'customers');
    }, [firestore, user, canSeeCustomers]);

    const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(recentOrdersQuery);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);

    const isLoading = isLoadingOrders || (canSeeCustomers && isLoadingCustomers);

    const customerMap = useMemo(() => {
        if (!customers) return new Map<string, Omit<Customer, 'id'>>();
        return new Map(customers.map(c => [c.id, { firstName: c.firstName, lastName: c.lastName, email: c.email }]));
    }, [customers]);

    const recentSales = useMemo(() => {
        if (!orders) return [];
        return orders.map(order => {
            const customer = canSeeCustomers ? customerMap.get(order.customerId) : null;
            const name = customer ? `${customer.firstName} ${customer.lastName}` : 'Restricted Customer';
            const fallback = name.split(' ').map(n => n[0]).join('');
            return {
                name,
                email: customer?.email || (canSeeCustomers ? '' : 'Access restricted'),
                amount: `+₱${order.totalAmount.toFixed(2)}`,
                avatarFallback: fallback.length > 0 ? fallback : 'UC'
            }
        });
    }, [orders, customerMap, canSeeCustomers]);

    if (isLoading) {
        return (
            <div className="space-y-8">
                {Array.from({length: 5}).map((_, i) => (
                    <div className="flex items-center" key={i}>
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="ml-4 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="ml-auto h-4 w-16" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {recentSales.map((sale, index) => (
                <div className="flex items-center" key={index}>
                <Avatar className="h-9 w-9">
                    <AvatarFallback>{sale.avatarFallback}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{sale.name}</p>
                    <p className="text-sm text-muted-foreground">{sale.email}</p>
                </div>
                <div className="ml-auto font-medium">{sale.amount}</div>
                </div>
            ))}
            {!isLoading && recentSales.length === 0 && (
                <p className='text-sm text-muted-foreground text-center py-10'>No recent sales to display.</p>
            )}
        </div>
    )
}
