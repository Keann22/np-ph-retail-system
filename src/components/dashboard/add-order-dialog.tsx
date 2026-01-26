'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { addDocumentNonBlocking, updateDocumentNonBlocking, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, increment } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown, Trash2, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "../ui/textarea";

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
  orderStatus: z.enum(["Pending Payment", "Processing", "Shipped", "Completed", "Cancelled"]),
  amountPaid: z.coerce.number().min(0).optional(),
  shippingDetails: z.string().optional(),
  platformFees: z.coerce.number().min(0).optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

// Mock Data - replace with your actual data fetching logic
type Customer = { id: string; firstName: string; lastName: string; };
type Product = { id: string; name: string; stock: number; costPrice: number; sellingPrice: number; };

export function AddOrderDialog() {
  const [open, setOpen] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const customersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);

  const { data: customers } = useCollection<Omit<Customer, 'id'>>(customersQuery);
  const { data: products } = useCollection<Omit<Product, 'id'>>(productsQuery);

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

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "orderItems"
  });

  const totalAmount = form.watch('orderItems').reduce((total, item) => total + (item.sellingPriceAtSale * item.quantity), 0);

  useEffect(() => {
    // If Full Payment, amount paid should equal total amount
    if (form.watch('paymentType') === 'Full Payment') {
        form.setValue('amountPaid', totalAmount);
    }
  }, [totalAmount, form]);


  async function onSubmit(values: OrderFormValues) {
    setOpen(false);

    toast({
      title: "Creating Order...",
      description: "Your new order is being saved.",
    });

    const balanceDue = totalAmount - (values.amountPaid ?? 0);

    const ordersCollection = collection(firestore, 'orders');
    const orderItemsCollection = collection(firestore, 'orderItems');
    const inventoryMovementsCollection = collection(firestore, 'inventoryMovements');

    addDocumentNonBlocking(ordersCollection, {
        ...values,
        orderDate: values.orderDate.toISOString(),
        totalAmount,
        balanceDue,
    }).then((orderRef) => {
        if(!orderRef) return;

        values.orderItems.forEach(item => {
            // Add to orderItems collection
            addDocumentNonBlocking(orderItemsCollection, {
                ...item,
                orderId: orderRef.id,
            });

            // Decrement product stock
            const productRef = doc(firestore, 'products', item.productId);
            updateDocumentNonBlocking(productRef, {
                stock: increment(-item.quantity)
            });

            // Log inventory movement
            addDocumentNonBlocking(inventoryMovementsCollection, {
                productId: item.productId,
                quantityChange: -item.quantity,
                movementType: 'sale',
                timestamp: new Date().toISOString(),
                reason: `Order ${orderRef.id}`,
            });
        });

        toast({
            title: "Order Created",
            description: "The new order has been successfully saved.",
        });
        form.reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                {/* Order Details Column */}
                <div className="md:col-span-1 space-y-4">
                    <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Customer</FormLabel>
                        <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value
                                    ? customers?.find(
                                        (c) => c.id === field.value
                                    )?.firstName + ' ' + customers?.find(
                                        (c) => c.id === field.value
                                    )?.lastName
                                    : "Select customer"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onPointerDownOutside={(e) => e.preventDefault()}>
                                <Command>
                                    <CommandInput placeholder="Search customers..." />
                                    <CommandList>
                                        <CommandEmpty>No customers found.</CommandEmpty>
                                        <CommandGroup>
                                            {customers?.map((c) => (
                                            <CommandItem
                                                value={`${c.firstName} ${c.lastName}`}
                                                key={c.id}
                                                onSelect={() => {
                                                  form.setValue("customerId", c.id)
                                                  setCustomerPopoverOpen(false)
                                                }}
                                            >
                                                <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    c.id === field.value
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                )}
                                                />
                                                {c.firstName} {c.lastName}
                                            </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
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
                            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start" onPointerDownOutside={(e) => e.preventDefault()}>
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(date) => {
                                        field.onChange(date);
                                        setDatePickerOpen(false);
                                    }}
                                    initialFocus
                                />
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
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Full Payment" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Full Payment
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Lay-away" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Lay-away (Hulugan)
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="Installment" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Installment
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch('paymentType') !== 'Full Payment' && (
                        <FormField
                            control={form.control}
                            name="amountPaid"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Downpayment (₱)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                {/* Order Items Column */}
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <FormLabel>Order Items</FormLabel>
                        <div className="space-y-2 mt-2 rounded-lg border p-2">
                           {fields.map((field, index) => (
                             <div key={field.id} className="flex gap-2 items-end p-2 rounded-md bg-muted/50">
                                <p className="flex-1 text-sm font-medium">{field.productName}</p>
                                <FormField
                                    control={form.control}
                                    name={`orderItems.${index}.quantity`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input type="number" className="h-8 w-20" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`orderItems.${index}.sellingPriceAtSale`}
                                    render={({ field }) => (
                                        <FormItem>
                                             <FormControl>
                                                <Input type="number" step="0.01" className="h-8 w-24" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                           ))}
                           {fields.length === 0 && (
                             <p className="text-sm text-center text-muted-foreground py-4">No items added to order.</p>
                           )}
                        </div>
                        <FormMessage>{form.formState.errors.orderItems?.message}</FormMessage>
                    </div>

                    <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={productPopoverOpen}
                            className="w-full justify-start"
                            >
                            Add product...
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onPointerDownOutside={(e) => e.preventDefault()}>
                            <Command>
                                <CommandInput placeholder="Search products..." />
                                <CommandList>
                                    <CommandEmpty>No products found.</CommandEmpty>
                                    <CommandGroup>
                                        {products?.map((p) => (
                                        <CommandItem
                                            value={p.name}
                                            key={p.id}
                                            onSelect={() => {
                                                const productToAdd = p;
                                                if (productToAdd) {
                                                    append({
                                                        productId: productToAdd.id,
                                                        productName: productToAdd.name,
                                                        quantity: 1,
                                                        costPriceAtSale: productToAdd.costPrice,
                                                        sellingPriceAtSale: productToAdd.sellingPrice,
                                                    });
                                                }
                                                setProductPopoverOpen(false);
                                            }}
                                        >
                                            {p.name}
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    
                    <div className="pt-4 space-y-2">
                        <div className="flex justify-between">
                            <p className="text-muted-foreground">Subtotal</p>
                            <p>₱{totalAmount.toFixed(2)}</p>
                        </div>
                         <div className="flex justify-between font-bold text-lg">
                            <p>Total</p>
                            <p>₱{totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter className="pt-8">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Create Order</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
