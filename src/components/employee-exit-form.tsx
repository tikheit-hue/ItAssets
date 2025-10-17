
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Laptop, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Employee } from "@/app/employees/index";
import type { Asset } from "@/app/assets/index";
import { useEffect } from "react";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";

const exitFormSchema = z.object({
  exitDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Exit date is required" }),
  exitReason: z.string().min(1, "Exit reason is required"),
  assetsReturned: z.boolean().default(false),
  notes: z.string().optional(),
});

export type EmployeeExitFormValues = z.infer<typeof exitFormSchema>;

type EmployeeExitFormProps = {
  employee: Employee | null;
  assignedAssets: Asset[];
  onSave: (data: EmployeeExitFormValues) => Promise<void>;
  onDone: () => void;
};

export function EmployeeExitForm({ employee, assignedAssets, onSave, onDone }: EmployeeExitFormProps) {
  const form = useForm<EmployeeExitFormValues>({
    resolver: zodResolver(exitFormSchema),
    defaultValues: {
      exitDate: new Date().toISOString(),
      exitReason: "Resigned",
      assetsReturned: assignedAssets.length === 0,
      notes: "",
    },
  });

  useEffect(() => {
    form.reset({
      exitDate: new Date().toISOString(),
      exitReason: "Resigned",
      assetsReturned: assignedAssets.length === 0,
      notes: "",
    });
  }, [employee, assignedAssets, form]);

  const onSubmit = async (data: EmployeeExitFormValues) => {
    try {
      await onSave(data);
      onDone();
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };

  if (!employee) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
            <FormField
                control={form.control}
                name="exitDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Exit Date</FormLabel>
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
                        initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            <FormField
                control={form.control}
                name="exitReason"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Reason for Exit</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Resigned">Resigned</SelectItem>
                        <SelectItem value="Terminated">Terminated</SelectItem>
                        <SelectItem value="Retired">Retired</SelectItem>
                        <SelectItem value="Contract Ended">Contract Ended</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div>
                <h3 className="text-sm font-medium mb-2">Assets Assigned ({assignedAssets.length})</h3>
                <div className="border rounded-md p-4 max-h-40 overflow-y-auto">
                    {assignedAssets.length > 0 ? (
                        <ul className="space-y-2">
                        {assignedAssets.map(asset => (
                            <li key={asset.id} className="flex items-center text-sm">
                                <Laptop className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{asset.make} {asset.model} (Tag: {asset.assetTag})</span>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-4">
                             <CircleAlert className="mx-auto h-6 w-6 mb-2" />
                            No assets are currently assigned to this employee.
                        </div>
                    )}
                </div>
            </div>

             {assignedAssets.length > 0 && (
                <FormField
                    control={form.control}
                    name="assetsReturned"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel>
                            Confirm Asset Return
                        </FormLabel>
                        <FormDescription>
                            Confirm that all assigned assets have been collected from the employee.
                        </FormDescription>
                        </div>
                    </FormItem>
                    )}
                />
            )}
            
            <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Add any relevant notes about the exit process..."
                        className="resize-none"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting || (assignedAssets.length > 0 && !form.getValues("assetsReturned"))}
          >
            Confirm Exit
          </Button>
        </div>
      </form>
    </Form>
  );
}
