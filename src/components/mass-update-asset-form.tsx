
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfiguration } from "@/context/configuration-context";
import { Input } from "./ui/input";
import { Combobox } from "./ui/combobox";

const updateSchema = z.object({
  field: z.enum(['status', 'assetType', 'ownership', 'purchaseFrom', 'processor', 'ram', 'storage']),
  value: z.string().min(1, "Value is required"),
});

export type MassUpdateFormValues = z.infer<typeof updateSchema>;

type MassUpdateAssetFormProps = {
  onSave: (data: MassUpdateFormValues) => Promise<void>;
  onDone: () => void;
};

export function MassUpdateAssetForm({ onSave, onDone }: MassUpdateAssetFormProps) {
  const { processors, rams, storages, assetTypes } = useConfiguration();
  
  const form = useForm<MassUpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
        field: 'status',
        value: '',
    },
  });

  const onSubmit = async (data: MassUpdateFormValues) => {
    try {
      await onSave(data);
      onDone();
    } catch (error) {
      console.error("Mass update failed:", error);
    }
  };
  
  const selectedField = form.watch('field');

  const renderValueField = () => {
    switch (selectedField) {
      case 'status':
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Donated">Donated</SelectItem>
                    <SelectItem value="E-Waste">E-Waste</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'ownership':
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Ownership</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select ownership" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Own">Own</SelectItem>
                    <SelectItem value="Rented">Rented</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'assetType':
         return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Asset Type</FormLabel>
                <Combobox
                    options={assetTypes.map(at => ({ value: at, label: at }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select or add asset type"
                    searchPlaceholder="Search asset types..."
                    noResultsMessage="No asset type found."
                 />
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'processor':
      case 'ram':
      case 'storage':
        const options = {
            processor: processors,
            ram: rams,
            storage: storages,
        }[selectedField];
         return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New {selectedField}</FormLabel>
                <Combobox
                    options={options.map(o => ({ value: o, label: o }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={`Select or add ${selectedField}`}
                    searchPlaceholder={`Search ${selectedField}...`}
                    noResultsMessage="No results found."
                 />
                <FormMessage />
              </FormItem>
            )}
          />
        );
      default:
        return (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Value</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="field"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field to Update</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="assetType">Asset Type</SelectItem>
                  <SelectItem value="ownership">Ownership</SelectItem>
                  <SelectItem value="purchaseFrom">Purchase From (Vendor)</SelectItem>
                  <SelectItem value="processor">Processor</SelectItem>
                  <SelectItem value="ram">RAM</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {renderValueField()}

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Update Assets
          </Button>
        </div>
      </form>
    </Form>
  );
}
