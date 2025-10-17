
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Laptop, Fingerprint, Ticket, Wand2, Loader2, FileUp, Download, Search } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import type { Asset } from "@/app/assets/index";

const assetSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  assetTag: z.string().optional(),
  serialNumber: z.string().optional(),
});

const labelSchema = z.object({
  companyName: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  assets: z.array(assetSchema).min(1, "Please provide at least one asset.").refine(data => {
    return data.every(asset => (asset.assetTag && asset.assetTag.trim() !== '') || (asset.serialNumber && asset.serialNumber.trim() !== ''));
  }, {
      message: "Either Asset Tag or Serial Number must be provided for each asset.",
      path: ["assets"],
  }),
});

export type LabelFormValues = z.infer<typeof labelSchema>;

const COMPANY_NAME_STORAGE_KEY = 'asset-labeler-company-name';

type AssetFormProps = {
    onFormSubmit: (values: LabelFormValues) => void;
    isLoading: boolean;
    initialValues?: LabelFormValues;
    existingAssets?: Asset[];
}

export function AssetForm({ onFormSubmit, isLoading, initialValues, existingAssets = [] }: AssetFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [selectedExistingAssets, setSelectedExistingAssets] = useState<Set<string>>(new Set());

  const form = useForm<LabelFormValues>({
    resolver: zodResolver(labelSchema),
    defaultValues: initialValues || {
      companyName: "",
      assets: [
        { make: "", model: "", assetTag: "", serialNumber: "" },
      ],
    },
  });

  const { fields, replace, append } = useFieldArray({
    control: form.control,
    name: "assets",
  });

  const companyName = form.watch("companyName");
  useEffect(() => {
    if (typeof window !== 'undefined' && companyName) {
      localStorage.setItem(COMPANY_NAME_STORAGE_KEY, companyName);
    }
  }, [companyName]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !initialValues) {
      const savedCompanyName = localStorage.getItem(COMPANY_NAME_STORAGE_KEY);
      if (savedCompanyName) {
        form.setValue("companyName", savedCompanyName);
      }
    }
  }, [form, initialValues]);

  const filteredExistingAssets = useMemo(() => {
    return existingAssets.filter(asset => {
        const searchLower = assetSearchQuery.toLowerCase();
        return asset.assetTag.toLowerCase().includes(searchLower) ||
               asset.serialNumber.toLowerCase().includes(searchLower) ||
               asset.make.toLowerCase().includes(searchLower) ||
               asset.model.toLowerCase().includes(searchLower);
    });
  }, [existingAssets, assetSearchQuery]);

  const handleSelectExistingAsset = (assetId: string) => {
    setSelectedExistingAssets(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(assetId)) {
            newSelected.delete(assetId);
        } else {
            newSelected.add(assetId);
        }
        return newSelected;
    });
  };

  useEffect(() => {
    const selectedAssetsData = existingAssets.filter(asset => selectedExistingAssets.has(asset.id));
    
    // Filter out the initial empty asset if it's still there and we are adding selected assets.
    const currentAssets = fields.length === 1 && !fields[0].make && !fields[0].model && !fields[0].assetTag && !fields[0].serialNumber
      ? []
      : fields;

    const newAssets = selectedAssetsData.map(asset => ({
        make: asset.make,
        model: asset.model,
        assetTag: asset.assetTag,
        serialNumber: asset.serialNumber,
    }));
    
    const combined = [...currentAssets, ...newAssets];
    
    const uniqueAssets = Array.from(new Map(combined.map(item => [`${item.assetTag}-${item.serialNumber}`, item])).values());
    
    replace(uniqueAssets.length > 0 ? uniqueAssets : [{ make: "", model: "", assetTag: "", serialNumber: "" }]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExistingAssets, existingAssets]);


  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const headerLine = lines.shift()?.trim();
      
      if (!headerLine) {
        toast({
          variant: "destructive",
          title: "Invalid CSV",
          description: "The CSV file is empty or missing a header.",
        });
        return;
      }
      
      const header = headerLine.split(',').map(h => h.trim());

      if (!['make', 'model', 'assetTag', 'serialNumber'].every(h => header.includes(h))) {
        toast({
          variant: "destructive",
          title: "Invalid CSV format",
          description: "Please make sure the CSV has headers: make, model, assetTag, serialNumber",
        });
        return;
      }
      
      let importedAssets = lines.map(line => {
        const values = line.split(',');
        return {
          make: values[header.indexOf('make')]?.trim() || '',
          model: values[header.indexOf('model')]?.trim() || '',
          assetTag: values[header.indexOf('assetTag')]?.trim() || '',
          serialNumber: values[header.indexOf('serialNumber')]?.trim() || '',
        };
      });

      let finalAssets = importedAssets;
      if (removeDuplicates) {
        const uniqueKeys = new Set<string>();
        finalAssets = importedAssets.filter(asset => {
          const key = `${asset.assetTag}|${asset.serialNumber}`;
          if (!uniqueKeys.has(key)) {
            uniqueKeys.add(key);
            return true;
          }
          return false;
        });
      }

      const numDuplicates = importedAssets.length - finalAssets.length;

      if (finalAssets.length > 0) {
        replace(finalAssets);
        toast({
          title: "Import Successful",
          description: `${finalAssets.length} assets loaded. ${numDuplicates > 0 ? `${numDuplicates} duplicates were removed.` : ''}`.trim(),
        });
      } else {
         toast({
          variant: "destructive",
          title: "No data found",
          description: "The selected CSV file is empty or could not be read.",
        });
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDownloadSample = () => {
    const headers = "make,model,assetTag,serialNumber";
    const exampleData = "Apple,MacBook Pro 16,ASSET-001,C02F1234ABCD\nDell,XPS 15,ASSET-002,DXPS5678WXYZ";
    const csvContent = `${headers}\n${exampleData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="font-headline">Asset Details</CardTitle>
                    <CardDescription>Enter asset details, import a CSV, or select from existing assets.</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                    <Button type="submit" disabled={isLoading} size="sm">
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        Generate Labels
                    </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border p-4 rounded-md">
                  <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); fileInputRef.current?.click();}}>
                          <FileUp className="mr-2 h-4 w-4" />
                          Import CSV
                      </Button>
                      <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileImport}
                          accept=".csv"
                          className="hidden"
                      />
                      <Button variant="secondary" size="sm" onClick={handleDownloadSample}>
                          <Download className="mr-2 h-4 w-4" />
                          Sample
                      </Button>
                  </div>
                  <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                      <Switch
                          id="remove-duplicates"
                          checked={removeDuplicates}
                          onCheckedChange={setRemoveDuplicates}
                      />
                      <Label htmlFor="remove-duplicates" className="text-sm font-normal">Remove Duplicates</Label>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g. Your Company Pvt. Ltd." {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {existingAssets.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                        <h3 className="font-medium">Select from Existing Assets</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search existing assets..."
                                value={assetSearchQuery}
                                onChange={(e) => setAssetSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <ScrollArea className="h-40 border rounded-md">
                           <div className="p-4">
                            {filteredExistingAssets.length > 0 ? filteredExistingAssets.map(asset => (
                                <div key={asset.id} className="flex items-center space-x-2 py-1">
                                    <Checkbox
                                        id={`asset-${asset.id}`}
                                        checked={selectedExistingAssets.has(asset.id)}
                                        onCheckedChange={() => handleSelectExistingAsset(asset.id)}
                                    />
                                    <label htmlFor={`asset-${asset.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {asset.make} {asset.model} ({asset.assetTag})
                                    </label>
                                </div>
                            )) : <p className="text-sm text-center text-muted-foreground">No assets found.</p>}
                           </div>
                        </ScrollArea>
                    </div>
                  </>
                )}
                
                <Separator />
                
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4 border p-4 rounded-md">
                    <h3 className="font-medium">Asset {index + 1}</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                        control={form.control}
                        name={`assets.${index}.make`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Make</FormLabel>
                            <FormControl>
                                <div className="relative">
                                <Laptop className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="e.g. Apple" {...field} className="pl-10" />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name={`assets.${index}.model`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. MacBook Pro 16" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>

                    <FormField
                      control={form.control}
                      name={`assets.${index}.assetTag`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Tag</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="e.g. ASSET-12345" {...field} className="pl-10" />
                            </div>
                          </FormControl>
                          {index === 0 && <FormDescription>The AI will suggest which field to use for the barcode.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`assets.${index}.serialNumber`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="e.g. C02G86R4MD6M" {...field} className="pl-10" />
                            </div>
                          </FormControl>
                          {form.formState.errors.assets?.[index] && <FormMessage>{form.formState.errors.assets.message}</FormMessage>}
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                
                {form.formState.errors.assets && !form.formState.errors.assets.root && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.assets.message}
                  </p>
                )}
            </div>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
