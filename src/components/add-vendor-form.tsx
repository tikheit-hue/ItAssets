
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
import type { Vendor } from "@/app/vendors/index";
import { useEffect } from "react";
import { Textarea } from "./ui/textarea";

const vendorFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contactPerson: z.string().optional(),
  email: z.string().email("Please enter a valid email").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
  products: z.array(z.string()).optional(),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

type AddVendorFormProps = {
  onSave: (data: Omit<Vendor, "id" | "auditLog">) => Promise<void>;
  initialData?: Vendor | null;
  onDone: () => void;
};

export function AddVendorForm({ onSave, initialData, onDone }: AddVendorFormProps) {
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: initialData || {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      products: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        website: "",
        products: [],
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: VendorFormValues) => {
    try {
      await onSave({ ...data, products: data.products || [] });
      onDone();
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Name</FormLabel>
                <FormControl><Input placeholder="e.g. Chroma IT Solutions" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl><Input placeholder="e.g. Rajesh Kumar" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="e.g. sales@chroma.in" type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input placeholder="e.g. +91 80 4012 3456" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl><Textarea placeholder="123, Koramangala, Bangalore, Karnataka 560034" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl><Input placeholder="https://www.chroma.in" type="url" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="products"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Products / Services</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Laptops, Monitors, Servers (comma-separated)"
                  value={field.value?.join(', ')}
                  onChange={e => field.onChange(e.target.value.split(',').map(p => p.trim()))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>{initialData ? 'Update Vendor' : 'Save Vendor'}</Button>
        </div>
      </form>
    </Form>
  );
}
