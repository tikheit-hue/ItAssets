
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { VendorTable } from '@/components/vendor-table';
import { AddVendorForm } from '@/components/add-vendor-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog } from '@/app/assets/index';
import * as vendorService from '@/services/vendor-service';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';
import { VendorDetailsDialog } from '@/components/vendor-details-dialog';

export type Vendor = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  products: string[];
  auditLog: AuditLog[];
};

const MAX_VENDORS_LIMIT = 1000;
const MAX_FILE_SIZE_MB = 5;
const MAX_ROWS_PER_IMPORT = 500;

export default function VendorsPageContent() {
  const { toast } = useToast();
  const { sqlConfig, databaseProvider, isDbConfigured } = useSettings();
  const { tenantId } = useAuth();
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vendor; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState(0);

  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

  const fetchVendors = async () => {
    if (!tenantId || !isDbConfigured) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
        const updatedVendors = await vendorService.getVendors(databaseProvider, dbConfig, tenantId);
        setVendors(updatedVendors);
    } catch (e: any) {
        let description = "Could not retrieve vendor data.";
        if (e.message.includes("Connection timed out")) {
            description = "Connection to the database timed out. Please check your database settings and network connection.";
        }
        toast({ variant: 'destructive', title: 'Error fetching vendors', description });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [tenantId, isDbConfigured]);

  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      setEditingVendor?.(null);
    }
    setIsFormOpen?.(open);
  };

  const handleSaveVendor = async (data: Omit<Vendor, 'id' | 'auditLog'>) => {
    if (!tenantId) {
        toast({variant: 'destructive', title: 'Error', description: 'Tenant ID is missing.'});
        return;
    }
    try {
      if (editingVendor) {
        const oldVendor = vendors.find(v => v.id === editingVendor.id);
        const updatedVendor = { ...editingVendor, ...data };

        let changes: string[] = [];
        if (oldVendor) {
            (Object.keys(data) as (keyof typeof data)[]).forEach(key => {
                if (JSON.stringify(oldVendor[key]) !== JSON.stringify(updatedVendor[key])) {
                    changes.push(`'${key}' from '${oldVendor[key]}' to '${updatedVendor[key]}'`);
                }
            });
        }
        
        if (changes.length > 0) {
            updatedVendor.auditLog.unshift({
                id: uuidv4(),
                action: 'Updated',
                date: new Date().toISOString(),
                details: `Updated ${changes.join(', ')}`,
            });
        }
        
        await vendorService.updateVendor(databaseProvider, dbConfig, tenantId, updatedVendor);
        
        toast({
          title: 'Vendor Updated',
          description: `Vendor ${data.name} has been successfully updated.`,
        });
      } else {
         if (vendors.length >= MAX_VENDORS_LIMIT) {
             toast({
                variant: 'destructive',
                title: 'Vendor Limit Reached',
                description: `You cannot have more than ${MAX_VENDORS_LIMIT} vendors.`,
            });
            return;
        }
        await vendorService.addVendor(databaseProvider, dbConfig, tenantId, data);
        
        toast({
          title: 'Vendor Added',
          description: `Vendor ${data.name} has been successfully added.`,
        });
      }
      setIsFormOpen?.(false);
      setEditingVendor?.(null);
      await fetchVendors();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem saving the vendor. Please try again.',
      });
      throw error;
    }
  };

  const handleDeleteVendor = async (vendorToDelete: Vendor) => {
    if (!tenantId) return;
    try {
      await vendorService.deleteVendor(databaseProvider, dbConfig, tenantId, vendorToDelete.id);
      toast({
        title: 'Vendor Deleted',
        description: `Vendor ${vendorToDelete.name} has been deleted.`,
      });
      await fetchVendors();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete the vendor from the database.',
      });
    }
  };

  const sortedAndFilteredVendors = useMemo(() => {
    let sortableVendors = [...vendors];
    if (sortConfig !== null) {
      sortableVendors.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return sortableVendors.filter(vendor => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return Object.values(vendor).some(value =>
          String(value).toLowerCase().includes(searchLower)
        );
      });
  }, [vendors, searchQuery, sortConfig]);

  const handleSelectVendor = (id: string) => {
    setSelectedVendors(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        return newSelected;
    });
  };

  const handleSelectAll = (isChecked: boolean) => {
    setSelectedVendors(isChecked ? new Set(sortedAndFilteredVendors.map(v => v.id)) : new Set());
  };
  
  const handleDeleteSelected = async () => {
    if (!tenantId) return;
    const vendorCount = selectedVendors.size;
    const vendorIdsToDelete = Array.from(selectedVendors);

    try {
        await vendorService.deleteVendors(databaseProvider, dbConfig, tenantId, vendorIdsToDelete);
        toast({
            title: `${vendorCount} Vendor(s) Deleted`,
            description: 'The selected vendors have been permanently removed.',
        });
        setSelectedVendors(new Set());
        setIsDeleteDialogOpen(false);
        await fetchVendors();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the selected vendors.',
        });
    }
  };

  const handleExport = () => {
    if (vendors.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No vendors to export',
        description: 'Add some vendors before exporting.',
      });
      return;
    }
    const headers: (keyof Omit<Vendor, 'id' | 'auditLog'>)[] = ['name', 'contactPerson', 'email', 'phone', 'address', 'website', 'products'];
    const csvContent = [
      headers.join(','),
      ...vendors.map(vendor => 
        headers.map(header => {
            const value = vendor[header];
            if (Array.isArray(value)) {
                return `"${value.join('; ')}"`; // Join array with a separator
            }
            return `"${String(value ?? '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vendors-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: 'Export Successful',
      description: `${vendors.length} vendors have been exported.`,
    });
  };

  const handleDownloadSample = () => {
    const headers = "name,contactPerson,email,phone,address,website,products";
    const exampleData = "ABC Supplies,John Doe,john@abc.com,123-456-7890,123 Supply St,https://abc.com,\"Laptops;Monitors\"\nXYZ Corp,Jane Smith,jane@xyz.com,987-654-3210,456 Corp Ave,https://xyz.com,\"Printers;Keyboards\"";
    const csvContent = `${headers}\n${exampleData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'vendors-sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i+1] === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
  };


  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!tenantId) {
        toast({variant: 'destructive', title: 'Error', description: 'Tenant ID is missing.'});
        return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type && file.type !== 'text/csv') {
       toast({ variant: 'destructive', title: 'Invalid File Type', description: `Expected a .csv file, but got ${file.type}.` });
       return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
       toast({ variant: 'destructive', title: 'File Too Large', description: `Please upload a file smaller than ${MAX_FILE_SIZE_MB}MB.` });
       return;
    }

    setIsLoading(true);
    setImportProgress(0);
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
        if (event.lengthComputable) {
            const percentLoaded = Math.round((event.loaded / event.total) * 100);
            setImportProgress(percentLoaded);
        }
    };

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length > MAX_ROWS_PER_IMPORT) {
            throw new Error(`The file has too many rows. Please import a maximum of ${MAX_ROWS_PER_IMPORT} vendors at a time.`);
        }

        const headerLine = lines.shift()?.trim();
        if (!headerLine) throw new Error('CSV is empty or missing a header.');
        
        const header = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        const requiredHeaders: (keyof Omit<Vendor, 'id'|'auditLog'>)[] = ['name'];
        
        for (const requiredHeader of requiredHeaders) {
          if (!header.includes(requiredHeader)) throw new Error(`CSV is missing required header: ${requiredHeader}`);
        }

        const importedVendors = lines.map((line, index) => {
          const rowNum = index + 2;
          const values = parseCsvLine(line);
          
          if (values.length !== header.length) {
            console.warn(`Skipping malformed row ${rowNum}: ${line}`);
            return null;
          }

          const vendorData = header.reduce((obj, h, i) => {
            obj[h as keyof Vendor] = values[i] || '';
            return obj;
          }, {} as any);
          
          if (!vendorData.name) throw new Error(`Row ${rowNum}: name is a required field.`);

          return {
            id: uuidv4(),
            name: vendorData.name.trim(),
            contactPerson: (vendorData.contactPerson || '').trim(),
            email: (vendorData.email || '').trim(),
            phone: (vendorData.phone || '').trim(),
            address: (vendorData.address || '').trim(),
            website: (vendorData.website || '').trim(),
            products: vendorData.products ? vendorData.products.split(';').map((p: string) => p.trim()) : [],
            auditLog: [{ id: uuidv4(), action: 'Created', date: new Date().toISOString(), details: 'Vendor imported from CSV' }],
          } as Vendor;
        }).filter((v): v is Vendor => v !== null);

        if ((vendors?.length || 0) + importedVendors.length > MAX_VENDORS_LIMIT) {
             throw new Error(`Importing these ${importedVendors.length} vendors would exceed the limit of ${MAX_VENDORS_LIMIT} total vendors.`);
        }

        if (importedVendors.length > 0) {
          try {
            await vendorService.addVendors(databaseProvider, dbConfig, tenantId, importedVendors);
            await fetchVendors();
            toast({ title: 'Import Successful', description: `${importedVendors.length} vendors have been added.` });
          } catch (e: any) {
            if (e.message.includes("Connection timed out")) {
                toast({
                    variant: 'destructive',
                    title: 'Import Failed',
                    description: 'Connection timed out. Please check the server host, port, and network connectivity.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Import Failed',
                    description: e.message || 'Could not save vendors to the database.',
                });
            }
          }
        } else {
          throw new Error('No valid vendors found in the file.');
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'Could not parse the CSV file.' });
      } finally {
        setIsLoading(false);
        setImportProgress(0);
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
       toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not read the file.' });
       setIsLoading(false);
       setImportProgress(0);
    }
    reader.readAsText(file);
  };


  const requestSort = (key: keyof Vendor) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  if (!tenantId || !isDbConfigured) {
      return (
           <div className="container mx-auto py-6">
              <h1 className="text-2xl font-bold">Welcome to AssetGuard</h1>
              <p className="text-muted-foreground">Please configure your database in the settings page to get started.</p>
           </div>
      );
  }

  return (
    <>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Vendor Management</h1>
            <p className="text-muted-foreground">Add, view, and manage your suppliers.</p>
          </div>
          <div className="w-full md:w-auto flex justify-end">
            <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto" onClick={() => { setIsFormOpen?.(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                  <DialogDescription>
                    {editingVendor ? 'Update the details for this vendor.' : 'Fill in the form to add a new vendor.'}
                  </DialogDescription>
                </DialogHeader>
                <AddVendorForm
                  onSave={handleSaveVendor}
                  initialData={editingVendor}
                  onDone={() => handleFormOpenChange(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <VendorTable
          vendors={sortedAndFilteredVendors}
          onEdit={(vendor) => { setEditingVendor(vendor); setIsFormOpen(true); }}
          onDelete={handleDeleteVendor}
          onView={(vendor) => setViewingVendor(vendor)}
          isLoading={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedVendors={selectedVendors}
          onSelectVendor={handleSelectVendor}
          onSelectAll={handleSelectAll}
          onDeleteSelected={() => setIsDeleteDialogOpen(true)}
          sortConfig={sortConfig}
          requestSort={requestSort}
          onImport={() => fileInputRef.current?.click()}
          onExport={handleExport}
          isImporting={isLoading && importProgress > 0}
          importProgress={importProgress}
          onDownloadSample={handleDownloadSample}
        />
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".csv"
            className="hidden"
        />
      </div>
       <VendorDetailsDialog
        vendor={viewingVendor}
        isOpen={!!viewingVendor}
        onClose={() => setViewingVendor(null)}
        onEdit={(vendor) => { setEditingVendor(vendor); setIsFormOpen(true); }}
       />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete {selectedVendors.size} selected vendor(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
