'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { addDocumentNonBlocking, updateDocumentNonBlocking, useFirestore } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Order } from "@/app/dashboard/orders/page";
import { useEffect } from "react";

const paymentSchema = z.object({
  paymentDate: z.date({ required_error: "A payment date is required." }),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentMethod: z.string({ required_error: "Please select a payment method." }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface LogPaymentDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethods = ["GCash", "Shopee Platform Payouts", "Cash", "Bank Transfer", "COD Payed"];

export function LogPaymentDialog({ order, open, onOpenChange }: LogPaymentDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date(),
      amount: order.balanceDue > 0 ? order.balanceDue : 0,
      paymentMethod: undefined,
    },
  });

  // When the order prop changes (i.e., when a new order is selected for payment logging),
  // reset the form with the new order's default values.
  useEffect(() => {
    if (order) {
      form.reset({
        paymentDate: new Date(),
        amount: order.balanceDue > 0 ? order.balanceDue : 0,
        paymentMethod: undefined,
      });
    }
  }, [order, form]);

  async function onSubmit(values: PaymentFormValues) {
    if (!firestore) return;
    onOpenChange(false);

    toast({
      title: "Logging Payment...",
      description: `Saving payment for order #${order.id.substring(0, 7)}...`,
    });

    const paymentsCollection = collection(firestore, 'payments');
    const orderRef = doc(firestore, 'orders', order.id);

    // 1. Add payment document
    addDocumentNonBlocking(paymentsCollection, {
      ...values,
      orderId: order.id,
      paymentDate: values.paymentDate.toISOString(),
    });

    // 2. Update order document with new totals and status
    const newAmountPaid = order.amountPaid + values.amount;
    const newBalanceDue = order.totalAmount - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? 'Completed' : order.orderStatus;

    updateDocumentNonBlocking(orderRef, {
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      orderStatus: newStatus,
    });
    
    toast({
        title: "Payment Logged",
        description: `₱${values.amount.toFixed(2)} has been logged successfully.`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Payment for Order</DialogTitle>
          <DialogDescription>
            Balance due: ₱{order.balanceDue.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover modal={false}>
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₱)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
