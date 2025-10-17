
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Vendor } from '@/app/vendors/index';
import type { Employee } from '@/app/employees/index';
import type { AuditLog } from '@/app/assets/index';
import * as softwareService from '@/services/software-service';
import * as employeeService from '@/services/employee-service';
import * as vendorService from '@/services/vendor-service';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { SoftwareTable } from '@/components/software/software-table';
import { AddSoftwareForm } from '@/components/software/add-software-form';
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
import { SoftwareDetailsDialog } from '@/components/software/software-details-dialog';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';

export type SoftwareStatus = 'Active' | 'Expired' | 'Renewed';
export type LicenseType = 'Per User' | 'Per Device' | 'Subscription' | 'Perpetual';
export type Ownership = 'Purchased' | 'Rented' | 'Freeware';

export type Software = {
  id: string;
  name: string;
  version: string;
  licenseKey: string;
  vendorId: string | null;
  purchaseDate: string;
  expiryDate: string | null;
  totalLicenses: number;
  licenseType: LicenseType;
  ownership: Ownership;
  status: SoftwareStatus;
  attachments: string[];
  assignedTo: string[]; // Array of employee IDs
  auditLog: AuditLog[];
};

const MAX_FILE_SIZE_MB = 5;
const MAX_SOFTWARE_LIMIT = 2000;
const MAX_ROWS_PER_IMPORT = 1000;

export default function SoftwarePageContent() {
  const { toast } = useToast();
  const { sqlConfig, databaseProvider, isDbConfigured } = useSettings();
  const { tenantId } = useAuth();
  
  const [software, setSoftware] = useState<Software[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Software; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null);
  const [viewingSoftware, setViewingSoftware] = useState<Software | null>(null);
  const [selectedSoftware, setSelectedSoftware] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState(0);

  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

  const fetchData = async () => {
    if (!tenantId || !isDbConfigured) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [softwareData, vendorsData, employeesData] = await Promise.all([
            softwareService.getSoftware(databaseProvider, dbConfig, tenantId),
            vendorService.getVendors(databaseProvider, dbConfig, tenantId),
            employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
        ]);
        setSoftware(softwareData);
        setVendors(vendorsData);
        setEmployees(employeesData);
    } catch (e: any) {
        let description = "Could not retrieve software data.";
        if (e.message.includes("Connection timed out")) {
            description = "Connection to the database timed out. Please check your database settings and network connection.";
        }
        toast({ variant: 'destructive', title: 'Error fetching data', description });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId, isDbConfigured]);

  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      setEditingSoftware(null);
    }
    setIsFormOpen(open);
  };
  
  const handleSaveSoftware = async (data: Omit<Software, 'id' | 'auditLog' | 'attachments'>) => {
    if (!tenantId) return;
     try {
      if (editingSoftware) {
        const updatedSoftware = { ...editingSoftware, ...data };
        
        // Find newly assigned or unassigned employees
        const oldAssignedIds = new Set(editingSoftware.assignedTo || []);
        const newAssignedIds = new Set(data.assignedTo || []);

        const newlyAssigned = Array.from(newAssignedIds).filter(id => !oldAssignedIds.has(id));
        const unassigned = Array.from(oldAssignedIds).filter(id => !newAssignedIds.has(id));
        
        await softwareService.updateSoftware(databaseProvider, dbConfig, tenantId, updatedSoftware);
        
        // Log for newly assigned
        for (const employeeId of newlyAssigned) {
            const employee = employees.find(e => e.id === employeeId);
            if (employee) {
                const logText = `Assigned software license: ${updatedSoftware.name} ${updatedSoftware.version}`;
                await employeeService.addCommentToEmployee(databaseProvider, dbConfig, tenantId, employeeId, logText);
            }
        }
        // Log for unassigned
        for (const employeeId of unassigned) {
            const employee = employees.find(e => e.id === employeeId);
            if (employee) {
                const logText = `Unassigned software license: ${updatedSoftware.name} ${updatedSoftware.version}`;
                await employeeService.addCommentToEmployee(databaseProvider, dbConfig, tenantId, employeeId, logText);
            }
        }

        toast({
          title: 'Software Updated',
          description: `${data.name} has been successfully updated.`,
        });
      } else {
        const newSoftware: Software = { 
            ...data, 
            id: uuidv4(),
            attachments: [], 
            auditLog: [{
                id: uuidv4(),
                action: 'Created',
                date: new Date().toISOString(),
                details: 'Software created manually',
            }]
        };
        await softwareService.addSoftware(databaseProvider, dbConfig, tenantId, newSoftware);
        
        // Log for all assigned employees on creation
        for (const employeeId of newSoftware.assignedTo) {
            const employee = employees.find(e => e.id === employeeId);
            if (employee) {
                const logText = `Assigned software license: ${newSoftware.name} ${newSoftware.version}`;
                await employeeService.addCommentToEmployee(databaseProvider, dbConfig, tenantId, employeeId, logText);
            }
        }

        toast({
          title: 'Software Added',
          description: `${data.name} has been successfully added.`,
        });
      }
      setIsFormOpen(false);
      setEditingSoftware(null);
      await fetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem saving the software. Please try again.',
      });
      throw error;
    }
  };
  
  const handleDeleteSoftware = async (softwareToDelete: Software) => {
    if (!tenantId) return;
    try {
      await softwareService.deleteSoftware(databaseProvider, dbConfig, tenantId, softwareToDelete.id);
      toast({
        title: 'Software Deleted',
        description: `Software ${softwareToDelete.name} has been deleted.`,
      });
      await fetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete the software from the database.',
      });
    }
  };

  const sortedAndFilteredSoftware = useMemo(() => {
    let sortableSoftware = [...software];
    if (sortConfig !== null) {
      sortableSoftware.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return sortableSoftware.filter(item => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchLower)
        );
      });
  }, [software, searchQuery, sortConfig]);

  const requestSort = (key: keyof Software) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleEditSoftware = (sw: Software) => {
    setViewingSoftware(null);
    setEditingSoftware(sw);
    setIsFormOpen(true);
  }

  const handleSelectSoftware = (id: string) => {
    setSelectedSoftware(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        return newSelected;
    });
  };

  const handleSelectAll = (isChecked: boolean) => {
    setSelectedSoftware(isChecked ? new Set(sortedAndFilteredSoftware.map(s => s.id)) : new Set());
  };
  
  const handleDeleteSelected = async () => {
    if (!tenantId) return;
    const softwareCount = selectedSoftware.size;
    const softwareIdsToDelete = Array.from(selectedSoftware);

    try {
        await softwareService.deleteSoftwareList(databaseProvider, dbConfig, tenantId, softwareIdsToDelete);
        toast({
            title: `${softwareCount} Software item(s) Deleted`,
            description: 'The selected software have been permanently removed.',
        });
        setSelectedSoftware(new Set());
        setIsDeleteDialogOpen(false);
        await fetchData();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the selected software.',
        });
    }
  };

  const handleExport = () => {
    if (software.length === 0) {
      toast({ variant: 'destructive', title: 'No software to export' });
      return;
    }
    const headers: (keyof Software)[] = ['id', 'name', 'version', 'licenseKey', 'vendorId', 'purchaseDate', 'expiryDate', 'totalLicenses', 'licenseType', 'ownership', 'status', 'assignedTo'];
    const csvContent = [
      headers.join(','),
      ...software.map(item => 
        headers.map(header => {
            const value = item[header];
            if (Array.isArray(value)) return `"${value.join(';')}"`;
            return `"${String(value ?? '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `software-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: `${software.length} software items exported.` });
  };

  const handleDownloadSample = () => {
    const headers = "name,version,licenseKey,vendorName,purchaseDate,expiryDate,totalLicenses,licenseType,ownership,status,assignedTo";
    const exampleData = "Microsoft Office 365,2024,ABCDE-12345-FGHIJ-67890,Microsoft,2024-01-01,2025-01-01,50,Subscription,Purchased,Active,\"EMP-001;EMP-002\"\nAdobe Photoshop,2024,KLMNO-54321-PQRST-09876,Adobe,2023-11-15,,10,Perpetual,Purchased,Active,EMP-003";
    const csvContent = `${headers}\n${exampleData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'software-sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!tenantId) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type && file.type !== 'text/csv') {
       toast({ variant: 'destructive', title: 'Invalid File Type' });
       return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
       toast({ variant: 'destructive', title: 'File Too Large' });
       return;
    }

    setIsLoading(true);
    setImportProgress(0);
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setImportProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length > MAX_ROWS_PER_IMPORT) {
          throw new Error(`The file has too many rows. Maximum is ${MAX_ROWS_PER_IMPORT}.`);
        }

        const headerLine = lines.shift()?.trim();
        if (!headerLine) throw new Error('CSV is empty or missing a header.');
        
        const header = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        
        const importedSoftware: Software[] = lines.map((line, index) => {
          const rowNum = index + 2;
          const values = (line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || []).map(v => v.trim().replace(/^"|"$/g, ''));
          
          const data = header.reduce((obj, h, i) => {
            obj[h] = values[i] || '';
            return obj;
          }, {} as any);

          if (!data.name) throw new Error(`Row ${rowNum}: 'name' is required.`);
          
          const assignedToIds = data.assignedTo 
            ? data.assignedTo.split(';').map((empId: string) => {
                const employee = employees.find(e => e.employeeId.trim() === empId.trim());
                return employee ? employee.id : null;
            }).filter((id: string | null): id is string => id !== null)
            : [];

          return {
            id: uuidv4(),
            name: data.name,
            version: data.version || '',
            licenseKey: data.licenseKey || '',
            vendorId: vendors.find(v => v.name === data.vendorName)?.id || null,
            purchaseDate: data.purchaseDate || new Date().toISOString(),
            expiryDate: data.expiryDate || null,
            totalLicenses: parseInt(data.totalLicenses) || 0,
            licenseType: (data.licenseType as LicenseType) || 'Subscription',
            ownership: (data.ownership as Ownership) || 'Purchased',
            status: (data.status as SoftwareStatus) || 'Active',
            attachments: [],
            assignedTo: assignedToIds,
            auditLog: [{ id: uuidv4(), action: 'Created', date: new Date().toISOString(), details: 'Imported from CSV' }],
          };
        });

        if ((software?.length || 0) + importedSoftware.length > MAX_SOFTWARE_LIMIT) {
             throw new Error(`Import would exceed the limit of ${MAX_SOFTWARE_LIMIT} total software items.`);
        }

        if (importedSoftware.length > 0) {
          await softwareService.addSoftwareList(databaseProvider, dbConfig, tenantId, importedSoftware);
          await fetchData();
          toast({ title: 'Import Successful', description: `${importedSoftware.length} software items added.` });
        } else {
          throw new Error('No valid software found in the file.');
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
       toast({ variant: 'destructive', title: 'Import Error', description: 'Could not read the file.' });
       setIsLoading(false);
    }
    reader.readAsText(file);
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
            <h1 className="text-3xl font-bold">Software Management</h1>
            <p className="text-muted-foreground">Manage software licenses, assignments, and renewals.</p>
          </div>
          <div className="w-full md:w-auto flex justify-end">
            <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto" onClick={() => { setEditingSoftware(null); setIsFormOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Software
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>{editingSoftware ? 'Edit Software' : 'Add New Software'}</DialogTitle>
                  <DialogDescription>
                    {editingSoftware ? 'Update the details for this software license.' : 'Fill in the form to add a new software license.'}
                  </DialogDescription>
                </DialogHeader>
                <AddSoftwareForm
                    onSave={handleSaveSoftware}
                    initialData={editingSoftware}
                    onDone={() => handleFormOpenChange(false)}
                    employees={employees}
                    vendors={vendors}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <SoftwareTable
            software={sortedAndFilteredSoftware}
            employees={employees}
            vendors={vendors}
            onEdit={handleEditSoftware}
            onDelete={handleDeleteSoftware}
            onView={(sw) => setViewingSoftware(sw)}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortConfig={sortConfig}
            requestSort={requestSort}
            selectedSoftware={selectedSoftware}
            onSelectSoftware={handleSelectSoftware}
            onSelectAll={handleSelectAll}
            onDeleteSelected={() => setIsDeleteDialogOpen(true)}
            onImport={() => fileInputRef.current?.click()}
            onExport={handleExport}
            onDownloadSample={handleDownloadSample}
            isImporting={isLoading && importProgress > 0}
            importProgress={importProgress}
        />
         <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".csv"
            className="hidden"
        />
      </div>

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will permanently delete {selectedSoftware.size} selected software item(s).
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

      <SoftwareDetailsDialog
        software={viewingSoftware}
        employees={employees}
        vendors={vendors}
        isOpen={!!viewingSoftware}
        onClose={() => setViewingSoftware(null)}
        onEdit={handleEditSoftware}
      />
    </>
  );
}
