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
import { useCollection, useFirestore, useMemoFirebase, useStorage, useUser } from '@/firebase';
import { collection, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { AddProductDialog } from '@/components/dashboard/add-product-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BulkUploadProductsDialog } from '@/components/dashboard/bulk-upload-products-dialog';
import { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditProductDialog } from '@/components/dashboard/edit-product-dialog';

// Matches the Firestore document structure for a product
export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  supplierId?: string;
  images: string[];
  sellingPrice: number;
  quantityOnHand: number;
};

type Supplier = {
    id: string;
    name: string;
}

export type FormattedProduct = Product & {
    status: { text: 'In Stock' | 'Low Stock' | 'Out of Stock'; variant: 'outline' | 'default' | 'destructive'; };
    price: string;
    image: string;
    supplierName?: string;
}

const getStatus = (stock: number | undefined | null): { text: 'In Stock' | 'Low Stock' | 'Out of Stock'; variant: 'outline' | 'default' | 'destructive' } => {
  const currentStock = stock ?? 0;
  if (currentStock <= 0) {
    return { text: 'Out of Stock', variant: 'destructive' };
  }
  if (currentStock <= 10) {
    return { text: 'Low Stock', variant: 'default' };
  }
  return { text: 'In Stock', variant: 'outline' };
};

export default function ProductsPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const [deletingProduct, setDeletingProduct] = useState<FormattedProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<FormattedProduct | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  const productsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'products') : null),
    [firestore, user]
  );
  const suppliersQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'suppliers') : null),
    [firestore, user]
  );

  const { data: products, isLoading: isLoadingProducts } = useCollection<Omit<Product, 'id'>>(productsQuery);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Omit<Supplier, 'id'>>(suppliersQuery);
  
  const isLoading = isLoadingProducts || isLoadingSuppliers;

  const supplierMap = useMemo(() => {
    if (!suppliers) return new Map();
    return new Map(suppliers.map(s => [s.id, s.name]));
  }, [suppliers]);

  const formattedProducts: FormattedProduct[] = useMemo(() => {
    if (!products) return [];
    return products.map(p => ({
      ...p,
      quantityOnHand: p.quantityOnHand ?? 0,
      status: getStatus(p.quantityOnHand),
      price: `₱${p.sellingPrice.toFixed(2)}`,
      image: p.images?.[0] || 'https://placehold.co/64x64',
      supplierName: p.supplierId ? supplierMap.get(p.supplierId) : 'N/A',
    }));
  }, [products, supplierMap]);

  const filteredProducts = useMemo(() => {
    let results = formattedProducts;

    // Filter by stock status
    if (stockFilter === 'in-stock') {
      results = results.filter(product => (product.quantityOnHand ?? 0) > 0);
    } else if (stockFilter === 'no-stock') {
      results = results.filter(product => (product.quantityOnHand ?? 0) === 0);
    } else if (stockFilter === 'negative-stock') {
        results = results.filter(product => (product.quantityOnHand ?? 0) < 0);
    }

    // Filter by search term
    if (searchTerm) {
      results = results.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return results;
  }, [formattedProducts, searchTerm, stockFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const startIndex = filteredProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = filteredProducts.length > 0 ? Math.min(currentPage * itemsPerPage, filteredProducts.length) : 0;


  const handleDeleteConfirm = async () => {
    if (!deletingProduct || !firestore || !storage) return;

    const productToDelete = deletingProduct;
    setDeletingProduct(null);

    toast({
      title: "Deleting Product...",
      description: `"${productToDelete.name}" is being removed.`,
    });

    try {
        // Delete images from Storage
        if (productToDelete.images && productToDelete.images.length > 0) {
            const deletePromises = productToDelete.images.map(imageUrl => {
                // Don't delete placeholder images from placehold.co
                if (imageUrl.includes('placehold.co')) {
                    return Promise.resolve();
                }
                const imageFileRef = storageRef(storage, imageUrl);
                return deleteObject(imageFileRef);
            });
            await Promise.all(deletePromises);
        }

        // Delete Firestore document
        const productDocRef = doc(firestore, 'products', productToDelete.id);
        await deleteDoc(productDocRef);

        toast({
          title: "Product Deleted",
          description: `"${productToDelete.name}" has been removed from your catalog.`,
        });
    } catch (error) {
        console.error("Error deleting product:", error);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: `Could not delete "${productToDelete.name}".`
        });
    }
  }

  const handleBulkDeleteConfirm = async () => {
    if (!firestore || !storage || selectedProductIds.length === 0) return;

    const idsToDelete = [...selectedProductIds];
    setShowBulkDeleteConfirm(false);
    setSelectedProductIds([]); // Clear selection

    toast({
      title: "Bulk Deletion Initiated",
      description: `${idsToDelete.length} products are being queued for deletion.`,
    });

    const results = await Promise.allSettled(idsToDelete.map(async (productId) => {
        const productDocRef = doc(firestore, 'products', productId);
        const docSnap = await getDoc(productDocRef);

        if (docSnap.exists()) {
            const productData = docSnap.data() as Product;
            // Delete images from Storage
            if (productData.images && productData.images.length > 0) {
                await Promise.all(productData.images.map(imageUrl => {
                    if (imageUrl.includes('placehold.co')) {
                        return Promise.resolve();
                    }
                    const imageFileRef = storageRef(storage, imageUrl);
                    // Log error but don't fail the whole batch
                    return deleteObject(imageFileRef).catch(err => console.error(`Failed to delete image ${imageUrl}`, err));
                }));
            }
        }
        // Delete Firestore document
        await deleteDoc(productDocRef);
        return productId;
    }));

    const successfulDeletes = results.filter(r => r.status === 'fulfilled').length;
    const failedDeletes = results.filter(r => r.status === 'rejected').length;

    if (failedDeletes > 0) {
        toast({
            variant: "destructive",
            title: "Bulk Deletion Partially Failed",
            description: `${successfulDeletes} products deleted. ${failedDeletes} failed.`,
        });
    } else {
         toast({
          title: "Bulk Deletion Complete",
          description: `${successfulDeletes} products have been successfully deleted.`,
        });
    }
  };

  const areAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id));

  return (
    <>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Input
                placeholder="Search products by name..."
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
                className="max-w-sm"
                />
                <Select value={stockFilter} onValueChange={(value) => {
                    setStockFilter(value);
                    setCurrentPage(1);
                }}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by stock" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="in-stock">In Stock</SelectItem>
                        <SelectItem value="no-stock">No Stock</SelectItem>
                        <SelectItem value="negative-stock">Negative Stock</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {selectedProductIds.length > 0 && (
                <Button
                    variant="destructive"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                >
                    Delete Selected ({selectedProductIds.length})
                </Button>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    onCheckedChange={(checked) => {
                        if (checked) {
                            setSelectedProductIds(prev => Array.from(new Set([...prev, ...filteredProducts.map(p => p.id)])));
                        } else {
                            const filteredIds = new Set(filteredProducts.map(p => p.id));
                            setSelectedProductIds(prev => prev.filter(id => !filteredIds.has(id)));
                        }
                    }}
                    checked={areAllFilteredSelected}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Supplier</TableHead>
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
              {isLoading && Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                          <Skeleton className="aspect-square rounded-md h-16 w-16" />
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell>
                          <Skeleton className="h-8 w-8" />
                      </TableCell>
                  </TableRow>
              ))}
              {paginatedProducts && paginatedProducts.map((product) => (
                <TableRow key={product.id} data-state={selectedProductIds.includes(product.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                        onCheckedChange={(checked) => {
                            setSelectedProductIds((prevIds) =>
                            checked
                                ? [...prevIds, product.id]
                                : prevIds.filter((id) => id !== product.id)
                            );
                        }}
                        checked={selectedProductIds.includes(product.id)}
                        aria-label={`Select product ${product.name}`}
                    />
                  </TableCell>
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
                  <TableCell className="hidden md:table-cell">{product.supplierName}</TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.quantityOnHand ?? 0}
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
                        <DropdownMenuItem onClick={() => setEditingProduct(product)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem>View History</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => setDeletingProduct(product)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-4">
                  <p className="text-lg font-semibold">No products found</p>
                  <p className="text-muted-foreground mt-2">
                      {searchTerm ? `Your search for "${searchTerm}" did not match any products.` : `Click "Add Product" to get started.`}
                  </p>
              </div>
          )}
        </CardContent>
        {filteredProducts.length > 0 && (
          <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing <strong>{startIndex}-{endIndex}</strong> of <strong>{filteredProducts.length}</strong> products
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span className='text-sm text-muted-foreground'>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <EditProductDialog 
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(isOpen) => !isOpen && setEditingProduct(null)}
      />

      <AlertDialog open={!!deletingProduct} onOpenChange={(isOpen) => !isOpen && setDeletingProduct(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will permanently delete the product "{deletingProduct?.name}". This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
            >
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will permanently delete the {selectedProductIds.length} selected products. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleBulkDeleteConfirm}
            >
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
