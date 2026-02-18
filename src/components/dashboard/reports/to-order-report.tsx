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
        // Only show products with negative stock (oversold)
        return products.filter(p => p.quantityOnHand < 0).sort((a, b) => a.quantityOnHand - b.quantityOnHand);
    }, [products]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>To Order (Procurement List)</CardTitle>
                <CardDescription>Oversold products that need immediate restocking to fulfill current demand.</CardDescription>
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
                                    <Badge variant="destructive">
                                        {p.quantityOnHand}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {!isLoading && toOrder.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg mt-4">
                        <p className="text-lg font-semibold text-primary">No negative stock items</p>
                        <p className="text-sm text-muted-foreground mt-1">All orders are covered by current inventory levels.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
