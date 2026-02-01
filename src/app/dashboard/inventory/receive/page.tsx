'use client';

import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, runTransaction, query, orderBy, where, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const shipmentItemSchema = z.object({
  productId: z.string().min(1, "Product must be selected."),
  productName: z.string(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
});

const shipmentSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required.'),
  purchaseDate: z.date({ required_error: 'A purchase date is required.' }),
  items: z.array(shipmentItemSchema).min(1, "Please add at least one item to the shipment."),
});

type ShipmentFormValues = z.infer<typeof shipmentSchema>;
type Product = { id: string; name: string; sku: string; [key: string]: any; };

// Reusable component for product search within a row
function ProductSearch({ onProductSelect }: { onProductSelect: (product: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const firestore = useFirestore();
  const { user } = useUser();

  const productsQuery = useMemoFirebase(
    () => {
      if (!firestore || !user || search.length < 2) return null;
      // Simple capitalization for search term
      const searchTermCapitalized = search.charAt(0).toUpperCase() + search.slice(1);
      return query(
        collection(firestore, 'products'),
        orderBy('name'),
        where('name', '>=', searchTermCapitalized),
        where('name', '<=', searchTermCapitalized + '\uf8ff'),
        limit(10)
      );
    },
    [firestore, user, search]
  );
  const { data: productResults, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal text-left">Select Product...</Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search products..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoadingProducts && <CommandItem disabled>Searching...</CommandItem>}
            {productResults && productResults.length > 0 ? (
              <CommandGroup>
                {productResults.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.name}
                    onSelect={() => {
                      onProductSelect(p);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              !isLoadingProducts && <CommandEmpty>No products found.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


export default function BulkReceivePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      supplierName: '',
      purchaseDate: new Date(),
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const addNewItem = () => {
    append({ productId: '', productName: '', quantity: 1, unitCost: 0 });
  };
  
  const items = useWatch({ control: form.control, name: 'items' });
  const totalCost = items.reduce((total, item) => {
    return total + ((item.quantity || 0) * (item.unitCost || 0));
  }, 0);

  const onSubmit = async (values: ShipmentFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    toast({ title: 'Saving Shipment...', description: 'Please wait.' });

    try {
      await runTransaction(firestore, async (transaction) => {
        const totalExpense = values.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

        // Only create an expense if there is a cost.
        if (totalExpense > 0) {
            const expenseRef = doc(collection(firestore, 'expenses'));
            transaction.set(expenseRef, {
                expenseDate: values.purchaseDate.toISOString(),
                amount: totalExpense,
                category: 'Cost of Goods Sold',
                description: `Shipment received from ${values.supplierName}`,
                id: expenseRef.id,
            });
        }
        
        // Use a for...of loop to handle async operations inside correctly
        for (const item of values.items) {
          const productRef = doc(firestore, 'products', item.productId);
          const productDoc = await transaction.get(productRef);

          if (!productDoc.exists()) {
            throw new Error(`Product "${item.productName}" not found.`);
          }

          const productData = productDoc.data();
          const newQuantityOnHand = (productData.quantityOnHand || 0) + item.quantity;

          const newBatch = {
            batchId: doc(collection(firestore, '_')).id,
            purchaseDate: values.purchaseDate.toISOString(),
            originalQty: item.quantity,
            remainingQty: item.quantity,
            unitCost: item.unitCost,
            supplierName: values.supplierName,
          };

          const newStockBatches = [...(productData.stockBatches || []), newBatch];

          transaction.update(productRef, {
            quantityOnHand: newQuantityOnHand,
            stockBatches: newStockBatches,
          });

          const inventoryMovementRef = doc(collection(firestore, 'inventoryMovements'));
          transaction.set(inventoryMovementRef, {
            productId: item.productId,
            quantityChange: item.quantity,
            movementType: 'RESTOCK',
            timestamp: new Date().toISOString(),
            reason: `Bulk receive from ${values.supplierName}`,
          });
        }
      });

      toast({
        title: 'Shipment Saved!',
        description: `The received items have been added to inventory.`,
      });
      form.reset({
        supplierName: '',
        purchaseDate: new Date(),
        items: [],
      });
    } catch (e: any) {
      console.error("Bulk receive transaction failed: ", e);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: e.message || 'Could not save the shipment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Bulk Inventory Receiving</CardTitle>
        <CardDescription>
          Record a new shipment of products received from a supplier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
                <FormLabel>Shipment Items</FormLabel>
                <div className='border rounded-lg'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='w-[40%]'>Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Cost (₱)</TableHead>
                            <TableHead className='w-[50px] text-right'></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell className="font-medium">
                                    {form.watch(`items.${index}.productId`) ? (
                                        <div className='flex items-center justify-between'>
                                            <p>{form.watch(`items.${index}.productName`)}</p>
                                            <Button variant='link' size='sm' onClick={() => form.setValue(`items.${index}.productId`, '')}>Change</Button>
                                        </div>
                                    ) : (
                                        <ProductSearch 
                                            onProductSelect={(product) => {
                                                form.setValue(`items.${index}.productId`, product.id);
                                                form.setValue(`items.${index}.productName`, product.name);
                                            }}
                                        />
                                    )}
                                    <FormMessage>{form.formState.errors?.items?.[index]?.productId?.message}</FormMessage>
                                </TableCell>
                                <TableCell>
                                     <FormField
                                        control={form.control}
                                        name={`items.${index}.quantity`}
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormControl>
                                                <Input type="number" placeholder="100" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                     <FormField
                                        control={form.control}
                                        name={`items.${index}.unitCost`}
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="50.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button type="button" variant='ghost' size='icon' onClick={() => remove(index)}>
                                        <Trash2 className='h-4 w-4 text-destructive'/>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                         {fields.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                No items added. Click "Add Item" to start.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </div>
                 <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>
            </div>
            
            <Button type='button' variant='outline' onClick={addNewItem}>Add Item</Button>

            <div className="pt-4 space-y-2 text-right">
                <p className="text-lg">Total Purchase Cost: <span className="font-bold">₱{totalCost.toFixed(2)}</span></p>
            </div>

            <div className='flex justify-end'>
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Shipment
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
