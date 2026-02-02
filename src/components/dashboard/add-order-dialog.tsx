'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, getDocs, query, where, orderBy, limit, runTransaction } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";

const orderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  costPriceAtSale: z.coerce.number(),
  sellingPriceAtSale: z.coerce.number().min(0, "Price cannot be negative"),
});

const orderSchema = z.object({
  customerId: z.string({ required_error: "Please select a customer." }),
  orderDate: z.date({ required_error: "An order date is required." }),
  orderItems: z.array(orderItemSchema).min(1, "Please add at least one product to the order."),
  paymentType: z.enum(["Full Payment", "Lay-away", "Installment"], { required_error: "You need to select a payment type." }),
  installmentMonths: z.coerce.number().positive("Must be a positive number.").optional(),
  orderStatus: z.enum(["Pending Payment", "Processing", "Shipped", "Completed", "Cancelled"]),
  amountPaid: z.coerce.number().min(0).optional(),
  shippingDetails: z.string().optional(),
  platformFees: z.coerce.number().min(0).optional(),
}).refine(data => {
    if (data.paymentType === 'Installment') {
        return data.installmentMonths && data.installmentMonths > 0;
    }
    return true;
}, {
    message: "Installment months are required for installment plans.",
    path: ["installmentMonths"],
});

type OrderFormValues = z.infer<typeof orderSchema>;

type Customer = { id: string; firstName: string; lastName: string; [key: string]: any;};

type StockBatch = {
  batchId: string;
  purchaseDate: string;
  originalQty: number;
  remainingQty: number;
  unitCost: number;
  supplierName: string;
}
type Product = { id: string; name: string; quantityOnHand: number; sellingPrice: number; stockBatches: StockBatch[]; [key: string]: any;};

export function AddOrderDialog() {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { userProfile } = useUserProfile();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // State for customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  // State for product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      orderDate: new Date(),
      orderItems: [],
      paymentType: "Full Payment",
      orderStatus: "Processing",
      amountPaid: 0,
      platformFees: 0,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset({
            orderDate: new Date(),
            orderItems: [],
            paymentType: "Full Payment",
            orderStatus: "Processing",
            amountPaid: 0,
            platformFees: 0,
        });
        setSelectedCustomer(null);
        setCustomerSearch('');
        setCustomerResults([]);
        setProductSearch('');
        setProductResults([]);
    }
    setOpen(isOpen);
  };

  // Debounced search for customers
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (customerSearch.length < 1) {
        setCustomerResults([]);
        return;
      }
      if (!firestore || !user) return;
      
      setIsSearchingCustomers(true);
      const searchTermCapitalized = customerSearch.charAt(0).toUpperCase() + customerSearch.slice(1);
      
      const nameQuery = query(
        collection(firestore, 'customers'),
        orderBy('firstName'),
        where('firstName', '>=', searchTermCapitalized),
        where('firstName', '<=', searchTermCapitalized + '\uf8ff'),
        limit(10)
      );

      try {
        const querySnapshot = await getDocs(nameQuery);
        const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomerResults(results);
      } catch (error) {
        console.error("Error searching customers:", error);
        toast({ variant: "destructive", title: "Customer search failed" });
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [customerSearch, firestore, user, toast]);

  // Debounced search for products
  useEffect(() => {
    const handler = setTimeout(async () => {
        if (productSearch.length < 1) {
            setProductResults([]);
            return;
        }
        if (!firestore || !user) return;

        setIsSearchingProducts(true);
        const searchTermCapitalized = productSearch.charAt(0).toUpperCase() + productSearch.slice(1);

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
            setIsSearchingProducts(false);
        }
    }, 300);

    return () => clearTimeout(handler);
}, [productSearch, firestore, user, toast]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderItems"
  });

  const totalAmount = form.watch('orderItems').reduce((total, item) => total + (item.sellingPriceAtSale * item.quantity), 0);

  useEffect(() => {
    if (form.watch('paymentType') === 'Full Payment') {
        form.setValue('amountPaid', totalAmount);
    }
  }, [totalAmount, form]);


  async function onSubmit(values: OrderFormValues) {
    if (!userProfile || !firestore) {
      toast({ variant: "destructive", title: "Authentication or Database error", description: "Could not create order." });
      return;
    }
    
    handleOpenChange(false);
    toast({ title: "Creating Order...", description: "Your new order is being saved." });

    try {
      await runTransaction(firestore, async (transaction) => {
        const ordersCollection = collection(firestore, 'orders');
        const orderItemsCollection = collection(firestore, 'orderItems');
        const inventoryMovementsCollection = collection(firestore, 'inventoryMovements');

        const totalAmount = values.orderItems.reduce((total, item) => total + (item.sellingPriceAtSale * item.quantity), 0);
        const balanceDue = totalAmount - (values.amountPaid ?? 0);

        const newOrderRef = doc(ordersCollection);
        
        for (const item of values.orderItems) {
          const productRef = doc(firestore, 'products', item.productId);
          const productDoc = await transaction.get(productRef);

          if (!productDoc.exists()) {
            throw new Error(`Product "${item.productName}" not found.`);
          }

          const productData = productDoc.data() as Product;

          let quantityToDeduct = item.quantity;
          let totalCostOfGoods = 0;
          
          const sortedBatches = (productData.stockBatches || []).sort(
            (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
          );

          const updatedBatches: StockBatch[] = [];

          for (const batch of sortedBatches) {
            if (quantityToDeduct <= 0) {
              updatedBatches.push(batch);
              continue;
            }

            const deductFromThisBatch = Math.min(quantityToDeduct, batch.remainingQty);
            totalCostOfGoods += deductFromThisBatch * batch.unitCost;
            
            const newRemainingQty = batch.remainingQty - deductFromThisBatch;
            quantityToDeduct -= deductFromThisBatch;

            if (newRemainingQty > 0) {
              updatedBatches.push({ ...batch, remainingQty: newRemainingQty });
            }
          }
          
          const newQuantityOnHand = productData.quantityOnHand - item.quantity;
          // This calculation correctly handles cases with partial or no stock.
          // If no stock is available, costPriceAtSale will be 0.
          const costPriceAtSale = item.quantity > 0 ? totalCostOfGoods / item.quantity : 0;

          transaction.update(productRef, {
            quantityOnHand: newQuantityOnHand,
            stockBatches: updatedBatches,
          });

          const newOrderItemRef = doc(orderItemsCollection);
          transaction.set(newOrderItemRef, { 
            ...item, 
            id: newOrderItemRef.id,
            orderId: newOrderRef.id,
            costPriceAtSale: isNaN(costPriceAtSale) ? 0 : costPriceAtSale
          });

          const newMovementRef = doc(inventoryMovementsCollection);
          transaction.set(newMovementRef, {
            id: newMovementRef.id,
            productId: item.productId,
            quantityChange: -item.quantity,
            movementType: 'sale',
            timestamp: new Date().toISOString(),
            reason: `Order ${newOrderRef.id}`,
          });
        }

        const { installmentMonths, ...restOfValues } = values;

        transaction.set(newOrderRef, {
          ...restOfValues,
          installmentMonths: values.paymentType === 'Installment' ? installmentMonths : null,
          id: newOrderRef.id,
          orderDate: values.orderDate.toISOString(),
          totalAmount,
          balanceDue,
          salesPersonId: userProfile.id,
        });
      });

      toast({
        title: "Order Created",
        description: "The new order has been successfully saved and inventory updated.",
      });

    } catch (e: any) {
      console.error("Order creation transaction failed: ", e);
      toast({
        variant: 'destructive',
        title: 'Order Failed',
        description: e.message || 'Could not create the order due to an error.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>New Order</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Fill in the details for the new sales order.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1 md:grid-cols-3 md:gap-8">
                <div className="md:col-span-1 space-y-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Customer</FormLabel>
                            {selectedCustomer ? (
                                <div className="flex items-center justify-between rounded-md border border-input bg-background p-2 text-sm h-10">
                                    <p>{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedCustomer(null);
                                            form.setValue('customerId', '');
                                        }}
                                    >
                                        Change
                                    </Button>
                                </div>
                            ) : (
                                <Command className="rounded-lg border">
                                    <CommandInput 
                                        placeholder="Search customers by first name..." 
                                        value={customerSearch} 
                                        onValueChange={setCustomerSearch}
                                    />
                                    {customerSearch.length > 0 && (
                                        <CommandList>
                                            {isSearchingCustomers && <CommandItem disabled>Searching...</CommandItem>}
                                            {customerResults.length > 0 && (
                                                <CommandGroup>
                                                {customerResults.map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={`${c.firstName} ${c.lastName}`}
                                                        onSelect={() => {
                                                            form.setValue("customerId", c.id)
                                                            setSelectedCustomer(c);
                                                            setCustomerSearch('');
                                                            setCustomerResults([]);
                                                        }}
                                                    >
                                                        {c.firstName} {c.lastName}
                                                    </CommandItem>
                                                ))}
                                                </CommandGroup>
                                            )}
                                            {!isSearchingCustomers && customerResults.length === 0 && customerSearch.length > 1 && <CommandEmpty>No customers found.</CommandEmpty>}
                                        </CommandList>
                                    )}
                                </Command>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="orderDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Order Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                    >
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                    <FormField
                      control={form.control}
                      name="paymentType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Payment Type</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Full Payment" /></FormControl>
                                <FormLabel className="font-normal">Full Payment</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Lay-away" /></FormControl>
                                <FormLabel className="font-normal">Lay-away (Hulugan)</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Installment" /></FormControl>
                                <FormLabel className="font-normal">Installment</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch('paymentType') === 'Installment' && (
                        <FormField
                            control={form.control}
                            name="installmentMonths"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Installment Months</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 3" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    {form.watch('paymentType') !== 'Full Payment' && (
                        <FormField
                            control={form.control}
                            name="amountPaid"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Downpayment (₱)</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                <div className="md:col-span-2 space-y-4">
                    <div>
                        <FormLabel>Order Items</FormLabel>
                        <div className="space-y-2 mt-2 rounded-lg border p-2">
                           {fields.map((field, index) => (
                             <div key={field.id} className="flex gap-2 items-end p-2 rounded-md bg-muted/50">
                                <p className="flex-1 text-sm font-medium">{field.productName}</p>
                                <FormField control={form.control} name={`orderItems.${index}.quantity`} render={({ field }) => (<FormItem><FormControl><Input type="number" className="h-8 w-20" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name={`orderItems.${index}.sellingPriceAtSale`} render={({ field }) => (<FormItem><FormControl><Input type="number" step="0.01" className="h-8 w-24" {...field} /></FormControl></FormItem>)} />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                             </div>
                           ))}
                           {fields.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No items added to order.</p>}
                        </div>
                        <FormMessage>{form.formState.errors.orderItems?.message || form.formState.errors.orderItems?.root?.message}</FormMessage>
                    </div>

                    <Command className="rounded-lg border">
                        <CommandInput 
                            placeholder="Search to add products..." 
                            value={productSearch}
                            onValueChange={setProductSearch}
                        />
                        {productSearch.length > 0 && (
                            <CommandList>
                                {isSearchingProducts && <CommandItem disabled>Searching...</CommandItem>}
                                {productResults.length > 0 && (
                                    <CommandGroup>
                                    {productResults.map((p) => (
                                    <CommandItem
                                        value={p.name}
                                        key={p.id}
                                        onSelect={() => {
                                            const isAlreadyAdded = fields.some(item => item.productId === p.id);
                                            if (isAlreadyAdded) {
                                                toast({
                                                    variant: "default",
                                                    title: "Product already in order",
                                                    description: `${p.name} is already in this order. You can adjust the quantity above.`,
                                                });
                                                setProductSearch('');
                                                setProductResults([]);
                                                return;
                                            }
                                            
                                            const productToAdd = productResults.find(prod => prod.id === p.id);
                                            if (productToAdd) {
                                                // Simplified cost for UI display, actual cost is calculated in the backend transaction
                                                const costPriceAtSale = productToAdd.stockBatches?.length > 0
                                                    ? productToAdd.stockBatches[0].unitCost
                                                    : 0;

                                                append({
                                                    productId: productToAdd.id,
                                                    productName: productToAdd.name,
                                                    quantity: 1,
                                                    costPriceAtSale: costPriceAtSale,
                                                    sellingPriceAtSale: productToAdd.sellingPrice,
                                                });
                                            }
                                            setProductSearch('');
                                            setProductResults([]);
                                        }}
                                    >
                                    <div className="flex justify-between w-full">
                                        <span>{p.name}</span>
                                        <span className="text-xs text-muted-foreground">Stock: {p.quantityOnHand}</span>
                                    </div>
                                    </CommandItem>
                                    ))}
                                    </CommandGroup>
                                )}
                                {!isSearchingProducts && productResults.length === 0 && productSearch.length > 1 && <CommandEmpty>No products found.</CommandEmpty>}
                            </CommandList>
                        )}
                    </Command>
                    
                    <div className="pt-4 space-y-2">
                        <div className="flex justify-between"><p className="text-muted-foreground">Subtotal</p><p>₱{totalAmount.toFixed(2)}</p></div>
                        <div className="flex justify-between font-bold text-lg"><p>Total</p><p>₱{totalAmount.toFixed(2)}</p></div>
                    </div>
                </div>
            </div>
            <DialogFooter className="pt-8">
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button type="submit">Create Order</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
