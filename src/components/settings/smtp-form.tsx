
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
import type { SmtpConfig } from "@/ai/schemas/email-schema";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { sendEmail } from "@/ai/flows/send-email-flow";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const formSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1, "Port is required"),
  user: z.string().min(1, "Username is required"),
  pass: z.string().min(1, "Password/API key is required"),
  secure: z.boolean(),
});

type SmtpFormValues = z.infer<typeof formSchema>;

type SmtpFormProps = {
  config: SmtpConfig;
  onSave: (config: SmtpConfig) => void;
};

export function SmtpForm({ config, onSave }: SmtpFormProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<SmtpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      host: config.host || "",
      port: config.port || 587,
      user: config.user || "",
      pass: config.pass || "",
      secure: config.secure || false,
    },
  });

  const onSubmit = async (data: SmtpFormValues) => {
    onSave(data);
    setIsVerifying(true);
    toast({
      title: "Verifying connection...",
      description: "Attempting to connect to the SMTP server.",
    });

    const result = await sendEmail({
      smtp: data,
      content: {
        to: [], // Not sending an email, just verifying
        subject: 'AssetGuard Verification',
        html: '',
      },
    });
    
    toast({
      title: result.success ? "Connection Verified" : "Verification Failed",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    setIsVerifying(false);
  };
  
  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Email Settings (SMTP)</CardTitle>
            <CardDescription>
              Configure an SMTP server to send email notifications. Credentials are stored in your browser's local storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP Host</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.gmail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMTP Port</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="587" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username / Sender Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@yourcompany.in" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password / API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••••••••••" {...field} />
                  </FormControl>
                   <FormDescription>
                    For Gmail, this must be an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">App Password</a> if you use 2-Factor Authentication.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="secure"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Use SSL/TLS</FormLabel>
                        <FormDescription>
                            Enable for port 465. Disable for port 587 (uses STARTTLS).
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isVerifying}>
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Verify
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
