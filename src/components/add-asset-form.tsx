
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
import type { Asset, AssetStatus } from "@/app/assets/index";
import type { Employee } from "@/app/employees/index";
import type { Vendor } from "@/app/vendors/index";
import { useEffect } from "react";
import { Combobox } from "./ui/combobox";
import { useConfiguration } from "@/context/configuration-context";
import * as vendorService from '@/services/vendor-service';
import { v4 as uuidv4 } from 'uuid';
import { useSettings } from "@/context/settings-context";
import { useAuth } from "@/context/auth-context";

const assetFormSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  assetTag: z.string().min(1, "Asset Tag is required"),
  serialNumber: z.string().min(1, "Serial Number is required"),
  purchaseFrom: z.string().min(1, "Purchase From is required"),
  ownership: z.enum(["Own", "Rented"]),
  processor: z.string().min(1, "Processor is required"),
  ram: z.string().min(1, "RAM is required"),
  storage: z.string().min(1, "Storage is required"),
  assetType: z.string().min(1, "Asset Type is required"),
  status: z.enum(["Available", "Assigned", "Donated", "E-Waste"]),
  assignedTo: z.string().nullable(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

type AddAssetFormProps = {
  onSave: (data: Omit<Asset, "id" | "comments" | "auditLog">) => Promise<void>;
  initialData?: Asset | null;
  onDone: () => void;
  employees: Employee[];
  vendors: Vendor[];
};

export function AddAssetForm({ onSave, initialData, onDone, employees, vendors = [] }: AddAssetFormProps) {
  const {
    processors,
    setProcessors,
    rams,
    setRams,
    storages,
    setStorages,
    assetTypes,
    setAssetTypes,
  } = useConfiguration();
  const { databaseProvider, sqlConfig } = useSettings();
  const { tenantId } = useAuth();
  
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: initialData || {
      make: "",
      model: "",
      assetTag: "",
      serialNumber: "",
      purchaseFrom: "",
      ownership: "Own",
      processor: "",
      ram: "",
      storage: "",
      assetType: "Laptop",
      status: "Available",
      assignedTo: null,
    },
  });

  useEffect(() => {
    if (initialData) {
        form.reset(initialData);
    } else {
        form.reset({
          make: "",
          model: "",
          assetTag: "",
          serialNumber: "",
          purchaseFrom: "",
          ownership: "Own",
          processor: "",
          ram: "",
          storage: "",
          assetType: "Laptop",
          status: "Available",
          assignedTo: null,
        });
    }
  }, [initialData, form]);

  const onSubmit = async (data: AssetFormValues) => {
    try {
      await onSave(data);
      onDone();
    } catch (error) {
      console.error("Form submission failed, button state will be reset.");
    }
  };

  const status = form.watch('status');
  const assignedTo = form.watch('assignedTo');

  useEffect(() => {
    if (assignedTo && status !== 'Assigned') {
      form.setValue('status', 'Assigned');
    } else if (!assignedTo && status === 'Assigned') {
      form.setValue('status', 'Available');
    }
  }, [assignedTo, status, form]);
  
  useEffect(() => {
    if (['Donated', 'E-Waste'].includes(status) && assignedTo) {
      form.setValue('assignedTo', null);
    }
  }, [status, assignedTo, form]);
  
  const handleVendorChange = async (value: string) => {
    form.setValue('purchaseFrom', value);
    const isNew = value && !vendors.find(v => v.name.toLowerCase() === value.toLowerCase());
    if (isNew && tenantId) {
      const newVendor: Vendor = {
        id: uuidv4(),
        name: value,
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        products: [],
        auditLog: [{
            id: uuidv4(),
            action: 'Created',
            date: new Date().toISOString(),
            details: 'Vendor created via asset form',
        }]
      };
      await vendorService.addVendor(databaseProvider, sqlConfig, tenantId, newVendor);
    }
  };
  
  const activeEmployees = employees.filter(e => e.status === 'Active');
  const currentAssignee = initialData?.assignedTo ? employees.find(e => e.id === initialData.assignedTo) : undefined;
  
  // Ensure the current assignee is in the list, even if they are now inactive
  const employeeOptions = [
    { value: "unassigned", label: "-- Unassigned --" },
    ...activeEmployees.map((employee) => ({
      value: employee.id,
      label: `${employee.name} (${employee.employeeId})`,
    })),
  ];

  // If editing and the current assignee is inactive, add them to the list so they can be displayed
  if (currentAssignee && currentAssignee.status === 'Inactive') {
      employeeOptions.push({
          value: currentAssignee.id,
          label: `${currentAssignee.name} (${currentAssignee.employeeId}) [Inactive]`,
      })
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Lenovo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. ThinkPad T14" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assetTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Tag</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. IT-00123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input placeholder="Manufacturer's serial" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Assigned To</FormLabel>
                <Combobox
                  options={employeeOptions}
                  value={field.value || 'unassigned'}
                  onChange={(value) => field.onChange(value === "unassigned" ? null : value)}
                  placeholder="Select an employee"
                  searchPlaceholder="Search employees..."
                  noResultsMessage="No employee found."
                  disabled={['Donated', 'E-Waste'].includes(status)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value as AssetStatus)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Available" disabled={!!assignedTo}>Available</SelectItem>
                    <SelectItem value="Assigned" disabled={!assignedTo}>Assigned</SelectItem>
                    <SelectItem value="Donated">Donated</SelectItem>
                    <SelectItem value="E-Waste">E-Waste</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="purchaseFrom"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Purchase From (Vendor)</FormLabel>
                <Combobox
                  options={(vendors || []).map(v => ({ value: v.name, label: v.name, key: v.id }))}
                  value={field.value}
                  onChange={handleVendorChange}
                  placeholder="Select or add vendor"
                  searchPlaceholder="Search vendors..."
                  noResultsMessage="No vendor found."
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ownership"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ownership</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ownership" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Own">Own</SelectItem>
                    <SelectItem value="Rented">Rented</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="processor"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Processor with Generation</FormLabel>
                 <Combobox
                    options={processors.map(p => ({ value: p, label: p }))}
                    value={field.value}
                    onChange={(value) => {
                        field.onChange(value);
                        if (value && !processors.find(p => p.toLowerCase() === value.toLowerCase())) {
                            setProcessors(prev => [...prev, value]);
                        }
                    }}
                    placeholder="Select or add processor"
                    searchPlaceholder="Search processors..."
                    noResultsMessage="No processor found."
                 />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ram"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>RAM</FormLabel>
                <Combobox
                    options={rams.map(r => ({ value: r, label: r }))}
                    value={field.value}
                    onChange={(value) => {
                        field.onChange(value);
                        if (value && !rams.find(r => r.toLowerCase() === value.toLowerCase())) {
                            setRams(prev => [...prev, value]);
                        }
                    }}
                    placeholder="Select or add RAM"
                    searchPlaceholder="Search RAM..."
                    noResultsMessage="No RAM size found."
                 />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="storage"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Storage (HDD/SSD)</FormLabel>
                <Combobox
                    options={storages.map(s => ({ value: s, label: s }))}
                    value={field.value}
                    onChange={(value) => {
                        field.onChange(value);
                        if (value && !storages.find(s => s.toLowerCase() === value.toLowerCase())) {
                            setStorages(prev => [...prev, value]);
                        }
                    }}
                    placeholder="Select or add storage"
                    searchPlaceholder="Search storage..."
                    noResultsMessage="No storage type found."
                 />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assetType"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Asset Type</FormLabel>
                 <Combobox
                    options={assetTypes.map(at => ({ value: at, label: at }))}
                    value={field.value}
                    onChange={(value) => {
                        field.onChange(value);
                        if (value && !assetTypes.find(at => at.toLowerCase() === value.toLowerCase())) {
                            setAssetTypes(prev => [...prev, value]);
                        }
                    }}
                    placeholder="Select or add asset type"
                    searchPlaceholder="Search asset types..."
                    noResultsMessage="No asset type found."
                 />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>{initialData ? 'Update Asset' : 'Save Asset'}</Button>
        </div>
      </form>
    </Form>
  );
}
