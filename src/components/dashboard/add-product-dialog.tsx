'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { addDocumentNonBlocking, updateDocumentNonBlocking, useFirestore, useStorage, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, getDocs, query, where, limit, orderBy, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { FileUpload } from "@/components/ui/file-upload";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";

type Supplier = { id: string; name: string; [key: string]: any;};

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  images: z.custom<File[]>().refine((files) => files?.length > 0, "At least one image is required."),
  initialUnitCost: z.coerce.number().min(0, "Cost must be positive"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
  quantityOnHand: z.coerce.number().int().min(0, "Stock must be a non-negative integer"),
});

export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const { userProfile } = useUserProfile();

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');

  const canViewCostPrice = userProfile && (userProfile.roles.includes('Owner') || userProfile.roles.includes('Admin'));

  const suppliersQuery = useMemoFirebase(
    () => {
      if (!firestore || !user || supplierSearch.length < 1) return null;
      const searchTermCapitalized = supplierSearch.charAt(0).toUpperCase() + supplierSearch.slice(1);
      return query(
        collection(firestore, 'suppliers'),
        orderBy('name'),
        where('name', '>=', searchTermCapitalized),
        where('name', '<=', searchTermCapitalized + '\uf8ff'),
        limit(10)
      );
    },
    [firestore, user, supplierSearch]
  );
  const { data: supplierResults, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "Uncategorized",
      supplierId: "",
      images: [],
      initialUnitCost: 0,
      sellingPrice: 0,
      quantityOnHand: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof productSchema>) {
    if (!firestore || !storage) return;
    
    const productsCollection = collection(firestore, 'products');
    const q = query(productsCollection, where("sku", "==", values.sku));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      toast({
        variant: "destructive",
        title: "Duplicate SKU",
        description: `A product with SKU "${values.sku}" already exists. Please use a unique SKU.`,
      });
      return;
    }

    setOpen(false);
    
    toast({
      title: "Adding Product...",
      description: `Your product "${values.name}" is being added.`,
    });

    const { images: imageFiles, quantityOnHand, initialUnitCost, ...productCoreData } = values;

    const initialBatches = [];
    if (quantityOnHand > 0) {
      const selectedSupplierName = selectedSupplier ? selectedSupplier.name : 'Initial Stock';
      initialBatches.push({
        batchId: doc(collection(firestore, '_')).id, // generate new id
        purchaseDate: new Date().toISOString(),
        originalQty: quantityOnHand,
        remainingQty: quantityOnHand,
        unitCost: initialUnitCost,
        supplierName: selectedSupplierName,
      });
    }

    addDocumentNonBlocking(productsCollection, {
      ...productCoreData,
      quantityOnHand,
      stockBatches: initialBatches,
      images: [],
    })
    .then(async (newProductRef) => {
      if (!newProductRef) {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: `Could not start saving product "${values.name}".`,
        });
        return;
      }

      try {
        const imageUrls = await Promise.all(
          imageFiles.map(async (file) => {
            const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
          })
        );

        updateDocumentNonBlocking(newProductRef, { images: imageUrls });

        if (quantityOnHand > 0) {
            const inventoryMovementsCollection = collection(firestore, 'inventoryMovements');
            const inventoryMovementData = {
                productId: newProductRef.id,
                quantityChange: quantityOnHand,
                movementType: 'initial_stock',
                timestamp: new Date().toISOString(),
                reason: 'Initial stock for new product',
            };
            addDocumentNonBlocking(inventoryMovementsCollection, inventoryMovementData);
        }

        toast({
          title: "Product Added",
          description: `${productCoreData.name} has been successfully added.`,
        });
        
      } catch (error) {
        console.error("Error during background product update:", error);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: `Product "${values.name}" was created, but image upload failed.`,
        });
      }
    });

    form.reset();
    setSelectedSupplier(null);
    setSupplierSearch('');
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
                    name="supplierId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Supplier</FormLabel>
                            {selectedSupplier ? (
                                <div className="flex items-center justify-between rounded-md border border-input bg-background p-2 text-sm h-10">
                                    <p>{selectedSupplier.name}</p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedSupplier(null);
                                            form.setValue('supplierId', '');
                                        }}
                                    >
                                        Change
                                    </Button>
                                </div>
                            ) : (
                                <Command className="rounded-lg border">
                                    <CommandInput 
                                        placeholder="Search suppliers by name..." 
                                        value={supplierSearch} 
                                        onValueChange={setSupplierSearch}
                                    />
                                    {supplierSearch.length > 0 && (
                                        <CommandList>
                                            {isLoadingSuppliers && <CommandItem disabled>Searching...</CommandItem>}
                                            {supplierResults && supplierResults.length > 0 && (
                                                <CommandGroup>
                                                {supplierResults.map((s) => (
                                                    <CommandItem
                                                        key={s.id}
                                                        value={s.name}
                                                        onSelect={() => {
                                                            form.setValue("supplierId", s.id)
                                                            setSelectedSupplier(s);
                                                            setSupplierSearch('');
                                                        }}
                                                    >
                                                        {s.name}
                                                    </CommandItem>
                                                ))}
                                                </CommandGroup>
                                            )}
                                            {!isLoadingSuppliers && (!supplierResults || supplierResults.length === 0) && supplierSearch.length > 1 && <CommandEmpty>No suppliers found.</CommandEmpty>}
                                        </CommandList>
                                    )}
                                </Command>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {canViewCostPrice && (
                  <FormField
                      control={form.control}
                      name="initialUnitCost"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Initial Unit Cost (₱)</FormLabel>
                          <FormControl>
                              <Input type="number" step="0.01" placeholder="20.00" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                )}
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
                    name="quantityOnHand"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Initial Stock Quantity</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="120" {...field} />
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
