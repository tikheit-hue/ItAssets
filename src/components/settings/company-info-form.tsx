
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
import type { CompanyInfo } from "@/context/company-info-context";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import Image from "next/image";

const formSchema = z.object({
  name: z.string().min(1, "Company Name is required"),
  logo: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPincode: z.string().optional(),
  addressCountry: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
});

type CompanyInfoFormValues = z.infer<typeof formSchema>;

type CompanyInfoFormProps = {
  info: CompanyInfo;
  onSave: (info: CompanyInfo) => void;
};

export function CompanyInfoForm({ info, onSave }: CompanyInfoFormProps) {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState(info.logo || "");

  const form = useForm<CompanyInfoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: info.name || "",
      logo: info.logo || "",
      addressStreet: info.addressStreet || "",
      addressCity: info.addressCity || "",
      addressState: info.addressState || "",
      addressPincode: info.addressPincode || "",
      addressCountry: info.addressCountry || "",
      contactNumber: info.contactNumber || "",
      email: info.email || "",
    },
  });

  const onSubmit = async (data: CompanyInfoFormValues) => {
    onSave(data as CompanyInfo);
    toast({
        title: "Company Info Saved",
        description: "Your company information has been updated.",
    });
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "Image too large",
          description: "Please upload an image smaller than 2MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue("logo", base64String);
        setLogoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              This information will be used across the application in reports, PDFs, and emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Company Pvt. Ltd." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Company Logo</FormLabel>
              <FormControl>
                <Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} />
              </FormControl>
              <FormDescription>
                Upload your company logo. Recommended size: 200x100px. Max 2MB.
              </FormDescription>
              {logoPreview && (
                <div className="mt-4 p-2 border rounded-md max-w-[200px]">
                    <Image src={logoPreview} alt="Logo Preview" width={200} height={100} className="w-auto h-auto" />
                </div>
              )}
              <FormMessage />
            </FormItem>

            <div className="space-y-4 border p-4 rounded-md">
                <h3 className="text-sm font-medium">Company Address</h3>
                <FormField
                control={form.control}
                name="addressStreet"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                        <Input placeholder="221B MG Road" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                    control={form.control}
                    name="addressCity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="Pune" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="addressState"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <FormControl><Input placeholder="Maharashtra" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={form.control}
                    name="addressPincode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>ZIP / Postal Code</FormLabel>
                        <FormControl><Input placeholder="411001" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="addressCountry"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl><Input placeholder="India" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>

             <div className="grid md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Public Email ID</FormLabel>
                    <FormControl>
                        <Input placeholder="contact@yourcompany.in" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Save Company Info</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
