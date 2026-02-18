'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type OrderItem = {
    productId: string;
    productName: string;
    quantity: number;
    sellingPriceAtSale: number;
};

export function SalesByProductReport() {
    const firestore = useFirestore();
    const { user } = useUser();

    const itemsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'orderItems') : null), [firestore, user]);
    const { data: items, isLoading } = useCollection<OrderItem>(itemsQuery);

    const aggregated = useMemo(() => {
        if (!items) return [];
        const map = new Map<string, { name: string, qty: number, revenue: number }>();
        items.forEach(item => {
            const existing = map.get(item.productId) || { name: item.productName, qty: 0, revenue: 0 };
            map.set(item.productId, {
                name: item.productName,
                qty: existing.qty + item.quantity,
                revenue: existing.revenue + (item.quantity * item.sellingPriceAtSale)
            });
        });
        return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
    }, [items]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales by Product</CardTitle>
                <CardDescription>Which products are moving the fastest.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty Sold</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        )) : aggregated.map((p, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-right">{p.qty}</TableCell>
                                <TableCell className="text-right">₱{p.revenue.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}