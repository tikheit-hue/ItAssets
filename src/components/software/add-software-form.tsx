
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import type { Software, LicenseType, Ownership, SoftwareStatus } from "@/app/software/index";
import type { Employee } from "@/app/employees/index";
import type { Vendor } from "@/app/vendors/index";
import { useEffect, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(1, "Software name is required"),
  version: z.string().optional(),
  licenseKey: z.string().optional(),
  vendorId: z.string().nullable(),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Purchase date is required" }),
  expiryDate: z.string().nullable(),
  totalLicenses: z.coerce.number().min(0, "Must be a positive number"),
  licenseType: z.enum(["Per User", "Per Device", "Subscription", "Perpetual"]),
  ownership: z.enum(["Purchased", "Rented", "Freeware"]),
  status: z.enum(["Active", "Expired", "Renewed"]),
  assignedTo: z.array(z.string()),
}).refine(data => data.assignedTo.length <= data.totalLicenses, {
    message: "Cannot assign more licenses than the total available.",
    path: ["assignedTo"],
});

type SoftwareFormValues = z.infer<typeof formSchema>;

type AddSoftwareFormProps = {
  onSave: (data: Omit<Software, "id" | "auditLog" | "attachments">) => Promise<void>;
  initialData?: Software | null;
  onDone: () => void;
  employees: Employee[];
  vendors: Vendor[];
};

export function AddSoftwareForm({ onSave, initialData, onDone, employees, vendors }: AddSoftwareFormProps) {
    const form = useForm<SoftwareFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      version: "",
      licenseKey: "",
      vendorId: null,
      purchaseDate: new Date().toISOString(),
      expiryDate: null,
      totalLicenses: 1,
      licenseType: "Subscription",
      ownership: "Purchased",
      status: "Active",
      assignedTo: [],
    },
  });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    form.reset(initialData || {
      name: "",
      version: "",
      licenseKey: "",
      vendorId: null,
      purchaseDate: new Date().toISOString(),
      expiryDate: null,
      totalLicenses: 1,
      licenseType: "Subscription",
      ownership: "Purchased",
      status: "Active",
      assignedTo: [],
    });
  }, [initialData, form]);

  const onSubmit = async (data: SoftwareFormValues) => {
    try {
      await onSave(data);
      onDone();
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };
  
  const assignedTo = form.watch('assignedTo');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] p-1">
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Software Name</FormLabel><FormControl><Input placeholder="e.g. Microsoft 365" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="version" render={({ field }) => (
                <FormItem><FormLabel>Version / Edition</FormLabel><FormControl><Input placeholder="e.g. Business Standard" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>

            <FormField control={form.control} name="licenseKey" render={({ field }) => (
                <FormItem><FormLabel>License Key / Product ID</FormLabel><FormControl><Input placeholder="Enter license key" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem><FormLabel>Vendor</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'none' ? null : value)} value={field.value || 'none'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="none">-- No Vendor --</SelectItem>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                    </Select>
                <FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Purchase Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value && isValid(new Date(field.value)) ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button>
                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date?.toISOString())} initialFocus /></PopoverContent></Popover>
                <FormMessage /></FormItem>
              )}/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="expiryDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Expiry Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant="outline" className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value && isValid(new Date(field.value)) ? format(new Date(field.value), "PPP") : <span>No expiry (Perpetual)</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? date.toISOString() : null)} initialFocus />
                        <div className="p-2 border-t border-border">
                            <Button
                                variant="ghost"
                                className="w-full justify-center"
                                onClick={() => field.onChange(null)}
                                >Clear Date
                            </Button>
                        </div>
                    </PopoverContent></Popover>
                <FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value as SoftwareStatus)} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Expired">Expired</SelectItem>
                            <SelectItem value="Renewed">Renewed</SelectItem>
                        </SelectContent>
                    </Select>
                <FormMessage /></FormItem>
              )}/>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="totalLicenses" render={({ field }) => (
                    <FormItem><FormLabel>Number of Licenses</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="licenseType" render={({ field }) => (
                    <FormItem><FormLabel>License Type</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value as LicenseType)} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select license type" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Per User">Per User</SelectItem>
                                <SelectItem value="Per Device">Per Device</SelectItem>
                                <SelectItem value="Subscription">Subscription</SelectItem>
                                <SelectItem value="Perpetual">Perpetual</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>
            </div>
              <FormField control={form.control} name="ownership" render={({ field }) => (
                    <FormItem><FormLabel>Ownership</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value as Ownership)} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select ownership type" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Purchased">Purchased</SelectItem>
                                <SelectItem value="Rented">Rented</SelectItem>
                                <SelectItem value="Freeware">Freeware</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>

            <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start h-auto min-h-10">
                                <div className="flex gap-1 flex-wrap">
                                    {assignedTo.length > 0 ? employees.filter(e => assignedTo.includes(e.id)).map(e => (
                                        <Badge variant="secondary" key={e.id}>{e.name}</Badge>
                                    )) : "Select employees"}
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                                <CommandInput placeholder="Search employees..." />
                                <CommandList>
                                    <CommandEmpty>No employees found.</CommandEmpty>
                                    <CommandGroup>
                                        {employees.map(employee => (
                                            <CommandItem
                                                key={employee.id}
                                                onSelect={() => {
                                                    const current = field.value || [];
                                                    const next = current.includes(employee.id)
                                                        ? current.filter(id => id !== employee.id)
                                                        : [...current, employee.id];
                                                    field.onChange(next);
                                                }}
                                            >
                                                <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", field.value?.includes(employee.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                                    <X className={cn("h-4 w-4")} />
                                                </div>
                                                {employee.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormDescription>{field.value.length} of {form.getValues('totalLicenses')} licenses assigned.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>{initialData ? 'Update Software' : 'Save Software'}</Button>
        </div>
      </form>
    </Form>
  );
}
