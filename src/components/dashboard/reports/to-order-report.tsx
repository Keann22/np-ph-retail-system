'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type Product = {
    name: string;
    sku: string;
    quantityOnHand: number;
};

export function ToOrderReport() {
    const firestore = useFirestore();
    const { user } = useUser();

    const productsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'products') : null), [firestore, user]);
    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    const toOrder = useMemo(() => {
        if (!products) return [];
        return products.filter(p => p.quantityOnHand <= 0).sort((a, b) => a.quantityOnHand - b.quantityOnHand);
    }, [products]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>To Order (Procurement List)</CardTitle>
                <CardDescription>Products with zero or negative stock that need restocking.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-right">Stock Level</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                            </TableRow>
                        )) : toOrder.map((p, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={p.quantityOnHand < 0 ? "destructive" : "secondary"}>
                                        {p.quantityOnHand}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {!isLoading && toOrder.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        All products are currently in stock!
                    </div>
                )}
            </CardContent>
        </Card>
    );
}