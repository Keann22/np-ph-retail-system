'use client';

import Image from 'next/image';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { AddProductDialog } from '@/components/dashboard/add-product-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BulkUploadProductsDialog } from '@/components/dashboard/bulk-upload-products-dialog';

// Matches the Firestore document structure for a product
type Product = {
  id: string;
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  supplierLink: string;
  images: string[];
  costPrice: number;
  sellingPrice: number;
  stock: number;
};

const getStatus = (stock: number): { text: 'In Stock' | 'Low Stock' | 'Out of Stock'; variant: 'outline' | 'default' | 'destructive' } => {
  if (stock === 0) {
    return { text: 'Out of Stock', variant: 'destructive' };
  }
  if (stock <= 10) {
    return { text: 'Low Stock', variant: 'default' };
  }
  return { text: 'In Stock', variant: 'outline' };
};

export default function ProductsPage() {
  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Omit<Product, 'id'>>(productsQuery);
  
  const formattedProducts = products?.map(p => ({
    ...p,
    status: getStatus(p.stock),
    price: `₱${p.sellingPrice.toFixed(2)}`,
    image: p.images?.[0] || 'https://placehold.co/64x64',
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Products</CardTitle>
          <CardDescription>
            Manage your products and view their inventory status.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <BulkUploadProductsDialog />
          <AddProductDialog />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden md:table-cell">
                Stock
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
                 <TableRow key={i}>
                    <TableCell className="hidden sm:table-cell">
                        <Skeleton className="aspect-square rounded-md h-16 w-16" />
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell>
                        <Skeleton className="h-8 w-8" />
                    </TableCell>
                 </TableRow>
            ))}
            {formattedProducts && formattedProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt="Product image"
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={product.image}
                    width="64"
                    data-ai-hint="product image"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant={product.status.variant}>
                    {product.status.text}
                  </Badge>
                </TableCell>
                <TableCell>{product.price}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {product.stock}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>View History</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && (!formattedProducts || formattedProducts.length === 0) && (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                <p className="text-lg font-semibold">No products found</p>
                <p className="text-muted-foreground mt-2">
                    Click "Add Product" to get started.
                </p>
            </div>
        )}
      </CardContent>
      {formattedProducts && formattedProducts.length > 0 && (
        <CardFooter>
            <div className="text-xs text-muted-foreground">
            Showing <strong>1-{formattedProducts.length}</strong> of <strong>{formattedProducts.length}</strong> products
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
