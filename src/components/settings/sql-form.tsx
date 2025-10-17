
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { SqlConfig } from "@/context/settings-context";

const formSchema = z.object({
  host: z.string().min(1, "Host/Server Name is required"),
  port: z.coerce.number().min(1, "Port is required"),
  databaseName: z.string().min(1, "Database Name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  authenticationType: z.enum(["SQL Auth", "Windows Auth"]),
  schema: z.string().optional(),
});

type SqlFormValues = z.infer<typeof formSchema>;

type SqlFormProps = {
  initialData: SqlConfig;
  onSave: (config: SqlFormValues) => Promise<void>;
  onTest: (config: SqlFormValues) => Promise<void>;
};

export function SqlForm({ initialData, onSave, onTest }: SqlFormProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SqlFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  const handleTest = async (data: SqlFormValues) => {
    setIsTesting(true);
    await onTest(data);
    setIsTesting(false);
  };
  
  const handleSave = async (data: SqlFormValues) => {
    setIsSaving(true);
    await onSave(data);
    setIsSaving(false);
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <CardHeader>
            <CardTitle>External SQL Server Connection</CardTitle>
            <CardDescription>
              Configure the connection to your external Microsoft SQL Server database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="host" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host / Server Name</FormLabel>
                      <FormControl><Input placeholder="sql.company.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField control={form.control} name="port" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl><Input type="number" placeholder="1433" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </div>
             <FormField control={form.control} name="databaseName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Database Name</FormLabel>
                    <FormControl><Input placeholder="e.g. AssetDB" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
             )}/>
             <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl><Input placeholder="SQL login username" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                        <FormDescription>Leave blank to keep existing password.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
             </div>
              <FormField control={form.control} name="authenticationType" render={({ field }) => (
                <FormItem>
                    <FormLabel>Authentication Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="SQL Auth">SQL Server Authentication</SelectItem>
                            <SelectItem value="Windows Auth" disabled>Windows Authentication (Not Supported)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )}/>
               <FormField control={form.control} name="schema" render={({ field }) => (
                <FormItem>
                    <FormLabel>Schema (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. dbo" {...field} /></FormControl>
                    <FormDescription>Specify a schema if your setup is multi-schema.</FormDescription>
                    <FormMessage />
                </FormItem>
             )}/>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button type="submit" disabled={isSaving || isTesting}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Configuration
            </Button>
            <Button type="button" variant="outline" onClick={form.handleSubmit(handleTest)} disabled={isTesting || isSaving}>
                 {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Test Connection
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
