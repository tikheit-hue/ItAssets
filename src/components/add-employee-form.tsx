
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
  FormDescription,
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
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Employee } from "@/app/employees/index";
import { useEffect } from "react";
import { useConfiguration } from "@/context/configuration-context";
import { Combobox } from "./ui/combobox";

const employeeFormSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  joiningDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Joining date is required" }),
  status: z.enum(["Active", "Inactive"]),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

type AddEmployeeFormProps = {
  onSave: (data: Omit<Employee, "id" | "comments" | "auditLog">) => Promise<void>;
  initialData?: Employee | null;
  onDone: () => void;
};

export function AddEmployeeForm({ onSave, initialData, onDone }: AddEmployeeFormProps) {
  const { departments, setDepartments, designations, setDesignations } = useConfiguration();
  
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        joiningDate: initialData.joiningDate ? new Date(initialData.joiningDate).toISOString() : new Date().toISOString(),
    } : {
      employeeId: "",
      name: "",
      department: "",
      designation: "",
      email: "",
      phone: "",
      joiningDate: new Date().toISOString(),
      status: "Active",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        joiningDate: initialData.joiningDate ? new Date(initialData.joiningDate).toISOString() : new Date().toISOString(),
      });
    } else {
      form.reset({
        employeeId: "",
        name: "",
        department: "",
        designation: "",
        email: "",
        phone: "",
        joiningDate: new Date().toISOString(),
        status: "Active",
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: EmployeeFormValues) => {
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
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. EMP-001" {...field} />
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
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Priya Sharma" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Department</FormLabel>
                <Combobox
                  options={departments.map(d => ({ value: d, label: d }))}
                  value={field.value}
                  onChange={(value) => {
                      field.onChange(value);
                      if (value && !departments.find(d => d.toLowerCase() === value.toLowerCase())) {
                          setDepartments(prev => [...prev, value]);
                      }
                  }}
                  placeholder="Select or add department"
                  searchPlaceholder="Search departments..."
                  noResultsMessage="No department found."
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Designation / Role</FormLabel>
                <Combobox
                  options={designations.map(d => ({ value: d, label: d }))}
                  value={field.value}
                  onChange={(value) => {
                      field.onChange(value);
                      if (value && !designations.find(d => d.toLowerCase() === value.toLowerCase())) {
                          setDesignations(prev => [...prev, value]);
                      }
                  }}
                  placeholder="Select or add designation"
                  searchPlaceholder="Search designations..."
                  noResultsMessage="No designation found."
                />
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
                <FormControl>
                  <Input placeholder="e.g. priya.sharma@example.com" type="email" {...field} />
                </FormControl>
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
                <FormControl>
                  <Input placeholder="e.g. +91 9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="joiningDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Joining Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString())}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>The date the employee officially joined.</FormDescription>
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
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                  >
                  <FormControl>
                      <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                  </Select>
                  <FormMessage />
              </FormItem>
              )}
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>{initialData ? 'Update Employee' : 'Save Employee'}</Button>
        </div>
      </form>
    </Form>
  );
}
