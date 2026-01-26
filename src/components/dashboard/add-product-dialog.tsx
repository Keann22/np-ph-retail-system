'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { addDocumentNonBlocking, useFirestore, useStorage } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { FileUpload } from "@/components/ui/file-upload";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  supplierLink: z.string().url().optional().or(z.literal('')),
  images: z.custom<File[]>().refine((files) => files?.length > 0, "At least one image is required."),
  costPrice: z.coerce.number().min(0, "Cost price must be positive"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
  stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer"),
});

export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      supplierLink: "",
      images: [],
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
    },
  });

  function onSubmit(values: z.infer<typeof productSchema>) {
    setOpen(false);
    
    toast({
      title: "Adding Product...",
      description: `Your product "${values.name}" is being added in the background.`,
    });

    const uploadAndSave = async () => {
      try {
        const imageUrls = await Promise.all(
          values.images.map(async (file) => {
            const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
          })
        );

        const productData = {
          ...values,
          images: imageUrls,
        };

        const productsCollection = collection(firestore, 'products');
        const newProductRef = await addDocumentNonBlocking(productsCollection, productData);

        if (newProductRef && productData.stock > 0) {
            const inventoryMovementsCollection = collection(firestore, 'inventoryMovements');
            const inventoryMovementData = {
                productId: newProductRef.id,
                quantityChange: productData.stock,
                movementType: 'initial_stock',
                timestamp: new Date().toISOString(),
                reason: 'Initial stock for new product',
            };
            addDocumentNonBlocking(inventoryMovementsCollection, inventoryMovementData);
        }


        toast({
          title: "Product Added",
          description: `${productData.name} has been added to your catalog.`,
        });
        
      } catch (error) {
        console.error("Error uploading images or saving product:", error);
        toast({
          variant: "destructive",
          title: "Action Failed",
          description: `Could not save product "${values.name}". Please try again.`,
        });
      }
    };

    uploadAndSave();
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Product</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new product to your catalog.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-2 py-4 max-h-[70vh] overflow-y-auto px-1">
                <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Product Images</FormLabel>
                        <FormControl>
                            <FileUpload 
                                value={field.value} 
                                onChange={field.onChange} 
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., AeroGrip Silicon Utensil Set" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., AG-SUS-001" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Describe the product" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Kitchenware" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Cost Price (₱)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="20.00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Selling Price (₱)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="49.99" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Stock</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="120" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="supplierLink"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Supplier Link</FormLabel>
                        <FormControl>
                            <Input type="url" placeholder="https://supplier.com/product" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
