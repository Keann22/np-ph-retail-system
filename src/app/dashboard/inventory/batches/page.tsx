'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
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
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type Product = {
  id: string;
  name: string;
  sku: string;
  quantityOnHand: number;
  stockBatches?: StockBatch[];
};

type StockBatch = {
  batchId: string;
  purchaseDate: string; // ISO string
  originalQty: number;
  remainingQty: number;
  unitCost: number;
  supplierName: string;
};

type FlattenedBatch = StockBatch & {
  productName: string;
  productSku: string;
};

export default function BatchesPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'products'),
      where('quantityOnHand', '>', 0),
      orderBy('quantityOnHand', 'desc')
    );
  }, [firestore, user]);

  const { data: products, isLoading } = useCollection<Product>(productsQuery);

  const allBatches = useMemo((): FlattenedBatch[] => {
    if (!products) {
      return [];
    }

    const flattened = products.flatMap((product) => {
      if (!product.stockBatches || product.stockBatches.length === 0) {
        return [];
      }
      return product.stockBatches
        .filter((batch) => batch.remainingQty > 0)
        .map((batch) => ({
          ...batch,
          productName: product.name,
          productSku: product.sku,
        }));
    });

    // Sort by purchase date, oldest first
    return flattened.sort(
      (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
    );
  }, [products]);

  const totalAssetValue = useMemo(() => {
    return allBatches.reduce((total, batch) => {
      return total + batch.remainingQty * batch.unitCost;
    }, 0);
  }, [allBatches]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <CardTitle className="font-headline">Stock Batch List</CardTitle>
                <CardDescription>
                View all individual stock batches for your products, sorted with the oldest first (FIFO).
                </CardDescription>
            </div>
            <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Total Asset Value</p>
                {isLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                    <p className="text-2xl font-bold">₱{totalAssetValue.toFixed(2)}</p>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead className="hidden sm:table-cell">SKU</TableHead>
              <TableHead>Batch Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Remaining Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            {allBatches.map((batch) => (
              <TableRow key={batch.batchId}>
                <TableCell className="font-medium">{batch.productName}</TableCell>
                <TableCell className="hidden sm:table-cell">{batch.productSku}</TableCell>
                <TableCell>{format(new Date(batch.purchaseDate), 'MMM d, yyyy')}</TableCell>
                <TableCell>{batch.supplierName}</TableCell>
                <TableCell className="text-right">₱{batch.unitCost.toFixed(2)}</TableCell>
                <TableCell className="text-right">{batch.remainingQty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && allBatches.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
            <p className="text-lg font-semibold">No Stock Batches Found</p>
            <p className="text-muted-foreground mt-2">
                Restock products to see their batches appear here.
            </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
