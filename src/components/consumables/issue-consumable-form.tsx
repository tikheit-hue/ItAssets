
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
import { Textarea } from "@/components/ui/textarea";
import type { Consumable } from "@/app/consumables/page";
import type { Employee } from "@/app/employees/index";
import { useEffect } from "react";

export const issueFormSchema = z.object({
  consumableId: z.string().min(1, "Please select an item"),
  employeeId: z.string().min(1, "Please select an employee"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  remarks: z.string().optional(),
});

export type IssueFormValues = z.infer<typeof issueFormSchema>;

type IssueConsumableFormProps = {
  onSave: (data: IssueFormValues) => Promise<void>;
  onDone: () => void;
  employees: Employee[];
  consumables: Consumable[];
};

export function IssueConsumableForm({ onSave, onDone, employees, consumables }: IssueConsumableFormProps) {
  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      consumableId: "",
      employeeId: "",
      quantity: 1,
      remarks: "",
    },
  });

  const onSubmit = async (data: IssueFormValues) => {
    try {
      await onSave(data);
      onDone();
    } catch (error) {
      // Error is handled by the parent component, but we prevent the form from closing on error.
      console.error("Form submission failed:", error);
    }
  };

  const selectedConsumableId = form.watch("consumableId");
  const selectedConsumable = consumables.find(c => c.id === selectedConsumableId);
  
  useEffect(() => {
    if (selectedConsumable) {
      form.trigger("quantity"); // Re-validate quantity when item changes
    }
  }, [selectedConsumable, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="consumableId" render={({ field }) => (
            <FormItem>
                <FormLabel>Consumable Item</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select an item to issue" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {consumables.filter(c => c.quantity > 0).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} (Available: {c.quantity})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )}/>

        <FormField control={form.control} name="employeeId" render={({ field }) => (
            <FormItem>
                <FormLabel>Issue To Employee</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {employees.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )}/>

        <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl><Input type="number" min="1" max={selectedConsumable?.quantity} {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
        
        <FormField control={form.control} name="remarks" render={({ field }) => (
            <FormItem>
                <FormLabel>Remarks</FormLabel>
                <FormControl><Textarea placeholder="Add any notes..." {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>Issue Item</Button>
        </div>
      </form>
    </Form>
  );
}
