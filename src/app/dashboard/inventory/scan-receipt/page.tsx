'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { collection, doc, runTransaction, query, orderBy, where, limit, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { parseReceipt } from '@/ai/flows/parse-receipt-flow';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AddProductDialog } from '@/components/dashboard/add-product-dialog';

// Zod schemas
const parsedItemSchema = z.object({
  productId: z.string().min(1, "Product must be matched."),
  productName: z.string(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
});

const scanSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required.'),
  purchaseDate: z.date({ required_error: 'A purchase date is required.' }),
  items: z.array(parsedItemSchema).min(1, "The receipt must contain at least one valid item."),
});

type ScanFormValues = z.infer<typeof scanSchema>;
type Product = { id: string; name: string; sku: string; [key: string]: any; };

// Helper to convert File to Data URI
const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

function ProductSearch({ rowIndex, form, onAddNewProduct }: { rowIndex: number; form: any; onAddNewProduct: (searchTerm: string, rowIndex: number) => void; }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(form.getValues(`items.${rowIndex}.productName`) || '');
    const firestore = useFirestore();
    const { toast } = useToast();
    const [productResults, setProductResults] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
    useEffect(() => {
        const handler = setTimeout(async () => {
          if (search.length < 2) {
            setProductResults([]);
            return;
          }
          if (!firestore) return;
          
          setIsLoadingProducts(true);
          const searchTermCapitalized = search.charAt(0).toUpperCase() + search.slice(1);
          
          const nameQuery = query(
            collection(firestore, 'products'),
            orderBy('name'),
            where('name', '>=', searchTermCapitalized),
            where('name', '<=', searchTermCapitalized + '\uf8ff'),
            limit(10)
          );
    
          try {
            const querySnapshot = await getDocs(nameQuery);
            const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProductResults(results);
          } catch (error) {
            console.error("Error searching products:", error);
            toast({ variant: "destructive", title: "Product search failed" });
          } finally {
            setIsLoadingProducts(false);
          }
        }, 300);
    
        return () => clearTimeout(handler);
      }, [search, firestore, toast]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal text-left">
                {form.watch(`items.${rowIndex}.productName`) || 'Search product...'}
            </Button>
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
                {!isLoadingProducts && productResults.length > 0 && (
                    <CommandGroup>
                    {productResults.map((p) => (
                        <CommandItem
                        key={p.id}
                        value={p.name}
                        onSelect={() => {
                            form.setValue(`items.${rowIndex}.productId`, p.id);
                            form.setValue(`items.${rowIndex}.productName`, p.name);
                            setOpen(false);
                        }}
                        >
                        {p.name}
                        </CommandItem>
                    ))}
                    </CommandGroup>
                )}
                {!isLoadingProducts && productResults.length === 0 && search.length > 1 && (
                    <CommandItem
                        onSelect={() => {
                            onAddNewProduct(search, rowIndex);
                            setOpen(false);
                        }}
                        className="text-primary hover:bg-primary/10"
                    >
                        + Add "{search}" as new product
                    </CommandItem>
                )}
                {!isLoadingProducts && productResults.length === 0 && search.length <= 1 && (
                    <CommandEmpty>Type to search products.</CommandEmpty>
                )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

export default function ScanReceiptPage() {
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [receiptImage, setReceiptImage] = useState<File | null>(null);
    const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
    const firestore = useFirestore();
    const { toast } = useToast();

    // State for the AddProductDialog
    const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
    const [addProductInitialValues, setAddProductInitialValues] = useState<any>();
    const [productCreationRowIndex, setProductCreationRowIndex] = useState<number | null>(null);

    const form = useForm<ScanFormValues>({
        resolver: zodResolver(scanSchema),
        defaultValues: {
            supplierName: '',
            purchaseDate: new Date(),
            items: [],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setReceiptImage(file);
        setReceiptImageUrl(URL.createObjectURL(file));
        setIsParsing(true);
        replace([]); // Clear previous items
        toast({ title: 'Parsing Receipt...', description: 'Gemini is processing the receipt. This may take a moment.' });

        try {
            const dataUri = await fileToDataUri(file);
            const result = await parseReceipt({ photoDataUri: dataUri });
            
            if (result.items && result.items.length > 0) {
                const newItems = result.items.map(item => ({...item, productId: '' })); // Add empty productId
                replace(newItems);
                toast({ title: 'Receipt Parsed!', description: 'Please review the items below and match them to your products.' });
            } else {
                toast({ variant: 'destructive', title: 'Parsing Failed', description: 'No items were found on the receipt. Please try another image.' });
            }
        } catch (error) {
            console.error("Error parsing receipt:", error);
            toast({ variant: 'destructive', title: 'Parsing Error', description: 'An error occurred while parsing the receipt.' });
        } finally {
            setIsParsing(false);
        }
    };

    const handleAddNewProduct = (productName: string, rowIndex: number) => {
        const item = form.getValues(`items.${rowIndex}`);
        setAddProductInitialValues({
            name: productName,
            initialUnitCost: item.unitCost || 0,
            sellingPrice: item.unitCost ? item.unitCost * 1.5 : 0, // Suggest markup
            quantityOnHand: 0, // Stock is added when receipt is saved, not here.
        });
        setProductCreationRowIndex(rowIndex);
        setIsAddProductDialogOpen(true);
    };

    const items = useWatch({ control: form.control, name: 'items' });
    const totalCost = items.reduce((total, item) => total + ((item.quantity || 0) * (item.unitCost || 0)), 0);

    const onSubmit = async (values: ScanFormValues) => {
        if (!firestore) return;
        setIsSaving(true);
        toast({ title: 'Saving to Inventory...', description: 'Please wait.' });

        try {
            await runTransaction(firestore, async (transaction) => {
                const totalExpense = values.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
                if (totalExpense > 0) {
                    const expenseRef = doc(collection(firestore, 'expenses'));
                    transaction.set(expenseRef, {
                        expenseDate: values.purchaseDate.toISOString(),
                        amount: totalExpense,
                        category: 'Cost of Goods Sold',
                        description: `Scanned receipt from ${values.supplierName}`,
                        id: expenseRef.id,
                    });
                }
                
                for (const item of values.items) {
                    const productRef = doc(firestore, 'products', item.productId);
                    const productDoc = await transaction.get(productRef);
                    if (!productDoc.exists()) throw new Error(`Product "${item.productName}" not found.`);

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
                        reason: `Scanned receipt from ${values.supplierName}`,
                    });
                }
            });

            toast({ title: 'Inventory Updated!', description: 'The items have been added to your inventory.' });
            form.reset();
            replace([]);
            setReceiptImage(null);
            setReceiptImageUrl(null);
        } catch (e: any) {
            console.error("Scanned receipt transaction failed: ", e);
            toast({ variant: 'destructive', title: 'Save Failed', description: e.message || 'Could not save the items.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Upload /> Upload Receipt to Add Inventory</CardTitle>
                <CardDescription>
                    Upload an image of a supplier receipt, and Gemini will automatically parse the items for you to add to your inventory. This is designed for use on a computer where you have an existing image file.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className='grid md:grid-cols-2 gap-8'>
                            {/* Left column for upload and preview */}
                            <div className='space-y-4'>
                                <Label htmlFor="receipt-upload" className={cn(
                                    "flex flex-col items-center justify-center w-full h-64 px-4 transition bg-background border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none",
                                    receiptImageUrl && "border-solid"
                                )}>
                                    {receiptImageUrl ? (
                                        <Image src={receiptImageUrl} alt="Receipt preview" width={400} height={400} className="max-h-full w-auto object-contain rounded-md" />
                                    ) : (
                                        <div className="flex flex-col items-center space-y-2 text-center">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                            <span className="font-medium text-muted-foreground">Click to upload or drag and drop</span>
                                            <span className="text-xs text-muted-foreground">PNG, JPG, or GIF</span>
                                        </div>
                                    )}
                                    <Input id="receipt-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isParsing} />
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="supplierName" render={({ field }) => (<FormItem><FormLabel>Supplier Name</FormLabel><FormControl><Input placeholder="e.g., Global Imports Inc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="purchaseDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Purchase Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}><> {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /> </></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                </div>
                            </div>

                            {/* Right column for parsed items */}
                            <div className='space-y-2'>
                                <FormLabel>Parsed & Matched Items</FormLabel>
                                <div className='border rounded-lg max-h-96 overflow-y-auto'>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className='w-[45%]'>Product (Match)</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Unit Cost</TableHead>
                                            <TableHead className='w-[50px]'></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isParsing && Array.from({ length: 3 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>))}
                                        {!isParsing && fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell className="font-medium">
                                                    <ProductSearch rowIndex={index} form={form} onAddNewProduct={handleAddNewProduct} />
                                                    <FormMessage>{form.formState.errors?.items?.[index]?.productId?.message}</FormMessage>
                                                </TableCell>
                                                <TableCell>
                                                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                                </TableCell>
                                                <TableCell>
                                                    <FormField control={form.control} name={`items.${index}.unitCost`} render={({ field }) => (<FormItem><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)} />
                                                </TableCell>
                                                <TableCell><Button type="button" variant='ghost' size='icon' onClick={() => remove(index)}><Trash2 className='h-4 w-4 text-destructive'/></Button></TableCell>
                                            </TableRow>
                                        ))}
                                         {!isParsing && fields.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="h-24 text-center"> {receiptImage ? 'No items found on receipt.' : 'Upload a receipt to begin.'} </TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                                <FormMessage>{form.formState.errors.items?.message || form.formState.errors.items?.root?.message}</FormMessage>
                                {fields.length > 0 && (
                                    <div className="pt-4 space-y-2 text-right">
                                        <p className="text-lg">Total Purchase Cost: <span className="font-bold">₱{totalCost.toFixed(2)}</span></p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />
                        
                        <div className='flex justify-end'>
                            <Button type="submit" disabled={isParsing || isSaving || fields.length === 0}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Loader2 className="mr-2 h-4 w-4 animate-spin hidden" />}
                                {isSaving ? 'Adding to Inventory...' : 'Add to Inventory'}
                            </Button>
                        </div>
                    </form>
                </Form>
                <AddProductDialog
                    open={isAddProductDialogOpen}
                    onOpenChange={setIsAddProductDialogOpen}
                    initialValues={addProductInitialValues}
                    onProductAdded={(newProduct) => {
                        if (productCreationRowIndex !== null) {
                            form.setValue(`items.${productCreationRowIndex}.productId`, newProduct.id);
                            form.setValue(`items.${productCreationRowIndex}.productName`, newProduct.name);
                            form.trigger(`items.${productCreationRowIndex}.productId`);
                        }
                        setProductCreationRowIndex(null);
                        setIsAddProductDialogOpen(false);
                        toast({
                            title: `Matched to ${newProduct.name}`,
                            description: 'The new product has been created and matched to the receipt item.',
                        });
                    }}
                />
            </CardContent>
        </Card>
    );
}
