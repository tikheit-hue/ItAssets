
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { Consumable } from "@/app/consumables/page";
import type { Vendor } from "@/app/vendors/index";
import { useEffect } from "react";

export const consumableFormSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(0, "Quantity must be a positive number"),
  unitType: z.string().min(1, "Unit type is required"),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Purchase date is required" }),
  vendorId: z.string().nullable(),
  costPerItem: z.coerce.number().optional(),
  remarks: z.string().optional(),
});

export type ConsumableFormValues = z.infer<typeof consumableFormSchema>;

type AddConsumableFormProps = {
  onSave: (data: ConsumableFormValues) => Promise<void>;
  initialData?: Consumable | null;
  onDone: () => void;
  vendors: Vendor[];
};

export function AddConsumableForm({ onSave, initialData, onDone, vendors }: AddConsumableFormProps) {
  const form = useForm<ConsumableFormValues>({
    resolver: zodResolver(consumableFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        purchaseDate: new Date(initialData.purchaseDate).toISOString(),
    } : {
      name: "",
      category: "",
      quantity: 0,
      unitType: "pcs",
      purchaseDate: new Date().toISOString(),
      vendorId: null,
      costPerItem: 0,
      remarks: "",
    },
  });

  useEffect(() => {
    form.reset(initialData ? {
        ...initialData,
        purchaseDate: new Date(initialData.purchaseDate).toISOString(),
    } : {
      name: "",
      category: "",
      quantity: 0,
      unitType: "pcs",
      purchaseDate: new Date().toISOString(),
      vendorId: null,
      costPerItem: 0,
      remarks: "",
    });
  }, [initialData, form]);

  const onSubmit = async (data: ConsumableFormValues) => {
    try {
      await onSave(data);
      onDone();
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="e.g. HDMI Cable" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g. Cables & Adapters" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="unitType" render={({ field }) => (
                <FormItem><FormLabel>Unit Type</FormLabel><FormControl><Input placeholder="e.g. pcs, box, meter" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="costPerItem" render={({ field }) => (
                <FormItem><FormLabel>Cost per Item (₹)</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Purchase Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button>
                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date?.toISOString())} initialFocus /></PopoverContent></Popover>
                <FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem><FormLabel>Vendor</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'none' ? null : value)} value={field.value || 'none'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="none">-- No Vendor --</SelectItem>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                    </Select>
                <FormMessage /></FormItem>
            )}/>
        </div>
        <FormField control={form.control} name="remarks" render={({ field }) => (
            <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Add any notes or reference information..." {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>{initialData ? 'Update Item' : 'Save Item'}</Button>
        </div>
      </form>
    </Form>
  );
}
