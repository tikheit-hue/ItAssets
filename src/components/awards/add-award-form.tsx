
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Award } from "@/app/awards/page";
import type { Employee } from "@/app/employees/index";
import { useEffect } from "react";

export const awardFormSchema = z.object({
  name: z.string().min(1, "Award name is required"),
  type: z.enum(["Monthly", "Quarterly", "Annual", "Spot Award"]),
  employeeId: z.string().min(1, "Please select an employee"),
  awardDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Award date is required" }),
  awardedBy: z.string().min(1, "Awarded by is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  certificateTemplate: z.string().optional().default('default'),
});

export type AwardFormValues = z.infer<typeof awardFormSchema>;

type AddAwardFormProps = {
  onSave: (data: AwardFormValues) => Promise<void>;
  initialData?: Award | null;
  onDone: () => void;
  employees: Employee[];
};

export function AddAwardForm({ onSave, initialData, onDone, employees }: AddAwardFormProps) {
  const form = useForm<AwardFormValues>({
    resolver: zodResolver(awardFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        awardDate: new Date(initialData.awardDate).toISOString(),
    } : {
      name: "",
      type: "Spot Award",
      employeeId: "",
      awardDate: new Date().toISOString(),
      awardedBy: "",
      reason: "",
      certificateTemplate: "default",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        awardDate: new Date(initialData.awardDate).toISOString(),
      });
    } else {
      form.reset({
        name: "",
        type: "Spot Award",
        employeeId: "",
        awardDate: new Date().toISOString(),
        awardedBy: "",
        reason: "",
        certificateTemplate: "default",
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: AwardFormValues) => {
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
            <FormItem>
              <FormLabel>Award Name</FormLabel>
              <FormControl><Input placeholder="e.g. Star Performer of the Month" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Award Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Spot Award">Spot Award</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>
        
        <FormField control={form.control} name="employeeId" render={({ field }) => (
          <FormItem>
            <FormLabel>Employee</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger></FormControl>
              <SelectContent>
                {employees.map(employee => (
                  <SelectItem key={employee.id} value={employee.id}>{employee.name} ({employee.employeeId})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}/>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="awardDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Award</FormLabel>
              <Popover>
                <PopoverTrigger asChild><FormControl>
                  <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date?.toISOString())} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="awardedBy" render={({ field }) => (
            <FormItem>
              <FormLabel>Awarded By</FormLabel>
              <FormControl><Input placeholder="e.g. Anand Mahindra, CEO" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}/>
        </div>
        
        <FormField control={form.control} name="reason" render={({ field }) => (
            <FormItem>
              <FormLabel>Reason / Description</FormLabel>
              <FormControl><Textarea placeholder="Describe the reason for the award..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
        )}/>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>{initialData ? 'Update Award' : 'Save Award'}</Button>
        </div>
      </form>
    </Form>
  );
}
