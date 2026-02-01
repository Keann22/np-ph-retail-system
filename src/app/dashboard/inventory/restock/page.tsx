'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, getDocs, query, where, orderBy, limit, runTransaction } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const restockSchema = z.object({
  productId: z.string({ required_error: 'Please select a product.' }),
  productName: z.string(),
  quantity: z.coerce.number().positive('Quantity must be a positive number.'),
  unitCost: z.coerce.number().min(0, 'Unit cost cannot be negative.'),
  supplierName: z.string().min(1, 'Supplier name is required.'),
  purchaseDate: z.date({ required_error: 'A purchase date is required.' }),
});

type RestockFormValues = z.infer<typeof restockSchema>;
type Product = { id: string; name: string; quantityOnHand: number; [key: string]: any; };

export default function RestockPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const productsQuery = useMemoFirebase(
    () => {
      if (!firestore || !user || productSearch.length < 2) return null;
      const searchTermCapitalized = productSearch.charAt(0).toUpperCase() + productSearch.slice(1);
      return query(
        collection(firestore, 'products'),
        orderBy('name'),
        where('name', '>=', searchTermCapitalized),
        where('name', '<=', searchTermCapitalized + '\uf8ff'),
        limit(10)
      );
    },
    [firestore, user, productSearch]
  );
  const { data: productResults, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const form = useForm<RestockFormValues>({
    resolver: zodResolver(restockSchema),
    defaultValues: {
      purchaseDate: new Date(),
    },
  });

  const handleProductSelect = (product: Product) => {
    form.setValue('productId', product.id);
    form.setValue('productName', product.name);
    setSelectedProduct(product);
    setProductSearch('');
  };

  const onSubmit = async (values: RestockFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    toast({ title: 'Saving Purchase...', description: 'Please wait.' });

    try {
      await runTransaction(firestore, async (transaction) => {
        const productRef = doc(firestore, 'products', values.productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists()) {
          throw new Error("Product not found. It may have been deleted.");
        }

        const productData = productDoc.data();
        const newQuantityOnHand = (productData.quantityOnHand || 0) + values.quantity;

        const newBatch = {
          batchId: doc(collection(firestore, '_')).id,
          purchaseDate: values.purchaseDate.toISOString(),
          originalQty: values.quantity,
          remainingQty: values.quantity,
          unitCost: values.unitCost,
          supplierName: values.supplierName,
        };

        const newStockBatches = [...(productData.stockBatches || []), newBatch];

        transaction.update(productRef, {
          quantityOnHand: newQuantityOnHand,
          stockBatches: newStockBatches,
        });

        const inventoryMovementRef = doc(collection(firestore, 'inventoryMovements'));
        transaction.set(inventoryMovementRef, {
          productId: values.productId,
          quantityChange: values.quantity,
          movementType: 'RESTOCK',
          timestamp: new Date().toISOString(),
          reason: `Restock from ${values.supplierName}`,
        });

        const expenseRef = doc(collection(firestore, 'expenses'));
        transaction.set(expenseRef, {
          expenseDate: values.purchaseDate.toISOString(),
          amount: values.quantity * values.unitCost,
          category: 'Cost of Goods Sold',
          description: `Purchased ${values.quantity} of ${values.productName} from ${values.supplierName}`,
          id: expenseRef.id,
        });
      });

      toast({
        title: 'Purchase Saved!',
        description: `${values.quantity} units of ${values.productName} have been added to inventory.`,
      });
      form.reset({ purchaseDate: new Date() });
      setSelectedProduct(null);
    } catch (e: any) {
      console.error("Restock transaction failed: ", e);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: e.message || 'Could not save the purchase.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Restock / Purchase</CardTitle>
        <CardDescription>
          Record a new product purchase to add stock and log the expense.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
            <FormField
              control={form.control}
              name="productId"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Product</FormLabel>
                  {selectedProduct ? (
                    <div className="flex items-center justify-between rounded-md border border-input bg-background p-2 text-sm h-10">
                      <p>{selectedProduct.name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(null);
                          form.resetField('productId');
                          form.resetField('productName');
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Command className="rounded-lg border">
                      <CommandInput
                        placeholder="Search products by name..."
                        value={productSearch}
                        onValueChange={setProductSearch}
                      />
                      {productSearch.length > 1 && (
                        <CommandList>
                          {isLoadingProducts && <CommandItem disabled>Searching...</CommandItem>}
                          {productResults && productResults.length > 0 && (
                            <CommandGroup>
                              {productResults.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name}
                                  onSelect={() => handleProductSelect(p)}
                                >
                                  {p.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {!isLoadingProducts && (!productResults || productResults.length === 0) && <CommandEmpty>No products found.</CommandEmpty>}
                        </CommandList>
                      )}
                    </Command>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Unit Cost (₱)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="50.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="supplierName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Global Imports Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Purchase Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn('w-[240px] pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Purchase
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
