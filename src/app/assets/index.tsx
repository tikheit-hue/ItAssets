
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { AssetTable } from '@/components/asset-table';
import { AddAssetForm } from '@/components/add-asset-form';
import { MassUpdateAssetForm, type MassUpdateFormValues } from '@/components/mass-update-asset-form';
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
import type { Employee } from '@/app/employees/index';
import type { Vendor } from '@/app/vendors/index';
import * as assetService from '@/services/asset-service';
import * as employeeService from '@/services/employee-service';
import * as vendorService from '@/services/vendor-service';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';
import { AssetDetailsDialog } from '@/components/asset-details-dialog';
import { useRouter, useSearchParams } from 'next/navigation';

export type Comment = {
  id: string;
  text: string;
  date: string;
};

export type AuditLog = {
  id: string;
  action: string;
  date: string;
  details: string;
};

export type AssetStatus = 'Available' | 'Assigned' | 'Donated' | 'E-Waste';

export type Asset = {
  id: string;
  make: string;
  model: string;
  assetTag: string;
  serialNumber: string;
  purchaseFrom: string;
  ownership: 'Own' | 'Rented';
  processor: string;
  ram: string;
  storage: string;
  assetType: string;
  status: AssetStatus;
  comments: Comment[];
  auditLog: AuditLog[];
  assignedTo: string | null; // Employee ID
};

const MAX_FILE_SIZE_MB = 5;
const MAX_ASSETS_LIMIT = 10000;
const MAX_ROWS_PER_IMPORT = 5000;

type AssetsPageContentProps = {
  initialAssets: Asset[];
  initialEmployees: Employee[];
  initialVendors: Vendor[];
  initialEditingAsset?: Asset;
};

export default function AssetsPageContent({
  initialAssets,
  initialEmployees,
  initialVendors,
  initialEditingAsset
}: AssetsPageContentProps) {
  const { toast } = useToast();
  const { sqlConfig, databaseProvider, isDbConfigured } = useSettings();
  const { tenantId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMassUpdateOpen, setIsMassUpdateOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Asset; direction: 'ascending' | 'descending' } | null>({ key: 'assetTag', direction: 'ascending' });
  
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(initialEditingAsset || null);
  const [isFormOpen, setIsFormOpen] = useState(!!initialEditingAsset);
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');

  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

  const fetchData = async () => {
    if (!tenantId || !isDbConfigured) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
        const [assetsData, employeesData, vendorsData] = await Promise.all([
            assetService.getAssets(databaseProvider, dbConfig, tenantId),
            employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
            vendorService.getVendors(databaseProvider, dbConfig, tenantId),
        ]);
        setAssets(assetsData);
        setEmployees(employeesData);
        setVendors(vendorsData);
    } catch (e: any) {
        let description = "Could not retrieve the latest data.";
        if (e.message.includes("Connection timed out")) {
            description = "Connection to the database timed out. Please check your database settings and network connection.";
        }
        toast({ variant: "destructive", title: "Error fetching data", description });
    } finally {
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Set initial state from props
    setAssets(initialAssets);
    setEmployees(initialEmployees);
    setVendors(initialVendors);
    setEditingAsset(initialEditingAsset || null);
    setIsFormOpen(!!initialEditingAsset);
  }, [initialAssets, initialEmployees, initialVendors, initialEditingAsset]);

  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      setEditingAsset(null);
      if (searchParams.has('edit')) {
        router.replace('/assets', { scroll: false });
      }
    }
    setIsFormOpen(open);
  };
  
  const handleEditAsset = (asset: Asset) => {
    setViewingAsset(null); // Close details view
    setEditingAsset(asset);
    setIsFormOpen(true);
  };

  const handleSaveAsset = async (data: Omit<Asset, 'id' | 'comments' | 'auditLog'>) => {
    if (!tenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Tenant ID is missing.' });
      return;
    }
    try {
      if (editingAsset) {
        // Check for duplicate serial number when updating
        if (assets.some(asset => asset.id !== editingAsset.id && asset.serialNumber.toLowerCase() === data.serialNumber.toLowerCase())) {
          toast({
            variant: 'destructive',
            title: 'Duplicate Serial Number',
            description: `An asset with the serial number "${data.serialNumber}" already exists.`,
          });
          throw new Error('Duplicate serial number');
        }

        // Update existing asset
        const oldAsset = assets.find(asset => asset.id === editingAsset.id);
        const updatedAssetData = { ...data };

        // Handle status logic
        if (updatedAssetData.assignedTo) {
          updatedAssetData.status = 'Assigned';
        } else if (updatedAssetData.status === 'Assigned' || !updatedAssetData.status) {
           updatedAssetData.status = 'Available';
        }

        if (['Donated', 'E-Waste'].includes(updatedAssetData.status)) {
            updatedAssetData.assignedTo = null;
        }

        const updatedAsset = { ...editingAsset, ...updatedAssetData };
        
        let changes: string[] = [];
        if (oldAsset) {
            (Object.keys(data) as (keyof typeof data)[]).forEach(key => {
                if (oldAsset[key] !== updatedAsset[key]) {
                     if (key === 'assignedTo') {
                        const oldEmployeeName = employees.find(e => e.id === oldAsset.assignedTo)?.name || 'Unassigned';
                        const newEmployee = employees.find(e => e.id === updatedAsset.assignedTo);
                        const newEmployeeName = newEmployee?.name || 'Unassigned';
                        
                        // Store name and ID in the audit log for reliable history
                        const changeDetails = `'assignedTo' from '${oldEmployeeName}' to '${newEmployeeName}' (Employee ID: ${newEmployee?.employeeId || 'null'})`;
                        changes.push(changeDetails);

                        // Add to old employee's audit log if they exist
                        if (oldAsset.assignedTo) {
                            const oldEmployee = employees.find(e => e.id === oldAsset.assignedTo);
                            if (oldEmployee) {
                                const details = `Asset collected: ${updatedAsset.make} ${updatedAsset.model} (Tag: ${updatedAsset.assetTag})`;
                                employeeService.addCommentToEmployee(databaseProvider, dbConfig, tenantId, oldEmployee.id, details);
                            }
                        }
                        // Add to new employee's audit log if they exist
                        if (updatedAsset.assignedTo) {
                             if (newEmployee) {
                                const details = `Asset assigned: ${updatedAsset.make} ${updatedAsset.model} (Tag: ${updatedAsset.assetTag})`;
                                employeeService.addCommentToEmployee(databaseProvider, dbConfig, tenantId, newEmployee.id, details);
                            }
                        }
                    } else {
                        changes.push(`'${key}' from '${oldAsset[key]}' to '${updatedAsset[key]}'`);
                    }
                }
            });
        }
        
        if (changes.length > 0) {
            updatedAsset.auditLog.unshift({
                id: uuidv4(),
                action: 'Updated',
                date: new Date().toISOString(),
                details: `Updated ${changes.join(', ')}`,
            });
        }

        await assetService.updateAsset(databaseProvider, dbConfig, tenantId, updatedAsset);
        
        toast({
          title: 'Asset Updated',
          description: `Asset ${data.assetTag} has been successfully updated.`,
        });

      } else {
        // Add new asset
        if (assets.length >= MAX_ASSETS_LIMIT) {
             toast({
                variant: 'destructive',
                title: 'Asset Limit Reached',
                description: `You cannot have more than ${MAX_ASSETS_LIMIT} assets.`,
            });
            return;
        }

        // Check for duplicate serial number when adding
        if (assets.some(asset => asset.serialNumber.toLowerCase() === data.serialNumber.toLowerCase())) {
          toast({
            variant: 'destructive',
            title: 'Duplicate Serial Number',
            description: `An asset with the serial number "${data.serialNumber}" already exists.`,
          });
          throw new Error('Duplicate serial number');
        }

        const newAssetData = {...data};
        if (newAssetData.assignedTo) {
            newAssetData.status = 'Assigned';
        } else {
            newAssetData.status = 'Available';
        }

        const newAsset: Asset = { 
            ...newAssetData, 
            id: uuidv4(), 
            comments: [], 
            auditLog: [{
                id: uuidv4(),
                action: 'Created',
                date: new Date().toISOString(),
                details: 'Asset created manually',
            }]
        };
        await assetService.addAsset(databaseProvider, dbConfig, tenantId, newAsset);

        if (newAsset.assignedTo) {
            const employee = employees.find(e => e.id === newAsset.assignedTo);
            if (employee) {
                const details = `Asset assigned: ${newAsset.make} ${newAsset.model} (Tag: ${newAsset.assetTag})`;
                employeeService.addCommentToEmployee(databaseProvider, dbConfig, tenantId, employee.id, details);
            }
        }
        
        toast({
          title: 'Asset Added',
          description: `Asset ${data.assetTag} has been successfully added.`,
        });
      }
      setIsFormOpen(false);
      setEditingAsset(null);
      router.refresh();
    } catch (error: any) {
      if (error.message !== 'Duplicate serial number') {
          toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description:
              'There was a problem saving the asset. Please try again.',
          });
      }
      // re-throw to keep the form's submitting state correct
      throw error;
    }
  };

  const handleDeleteAsset = async (assetToDelete: Asset) => {
    if (!tenantId) return;
    try {
      await assetService.deleteAsset(databaseProvider, dbConfig, tenantId, assetToDelete.id);
      toast({
        title: 'Asset Deleted',
        description: `Asset ${assetToDelete.assetTag} has been deleted.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the asset from the database.',
      });
    }
  };
  
    const handleAddCommentToAsset = async (assetId: string, commentText: string) => {
        if (!commentText.trim() || !tenantId) return;

        try {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) throw new Error('Asset not found');

        const newAuditLog = {
            id: crypto.randomUUID(),
            action: 'Comment Added',
            date: new Date().toISOString(),
            details: `Added comment: "${commentText.substring(0, 50)}..."`,
        };

        await assetService.addCommentToAsset(
            databaseProvider,
            dbConfig,
            tenantId,
            assetId,
            {
            id: crypto.randomUUID(),
            text: commentText,
            date: new Date().toISOString(),
            },
            newAuditLog
        );
        router.refresh();
        } catch (error) {
            console.error(error);
        }
    };
  
  const sortedAndFilteredAssets = useMemo(() => {
    let sortableAssets = [...assets];
    if (sortConfig !== null) {
      sortableAssets.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || bValue === null) return 0;
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableAssets
      .filter(asset => {
        if (assetTypeFilter === 'all') return true;
        return asset.assetType.toLowerCase() === assetTypeFilter.toLowerCase();
      })
      .filter(asset => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        const employee = (employees || []).find(e => e.id === asset.assignedTo);
        const employeeName = employee ? employee.name.toLowerCase() : '';
        return Object.values(asset).some(value =>
          String(value).toLowerCase().includes(searchLower)
        ) || employeeName.includes(searchLower);
      });
  }, [assets, searchQuery, assetTypeFilter, employees, sortConfig]);

  const availableAssetTypes = useMemo(() => {
      const types = new Set((assets || []).map(a => a.assetType));
      return Array.from(types);
  }, [assets]);

  const handleExport = () => {
    if (assets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No assets to export',
        description: 'Add some assets before exporting.',
      });
      return;
    }
    
    const headers = ['make', 'model', 'assetTag', 'serialNumber', 'assetType', 'ownership', 'purchaseFrom', 'processor', 'ram', 'storage', 'assignedToName', 'status'];
    
    const assetData = assets.map(asset => {
        const employeeName = employees.find(e => e.id === asset.assignedTo)?.name || 'Unassigned';
        return {
            ...asset,
            assignedToName: employeeName
        };
    });

    const csvContent = [
      headers.join(','),
      ...assetData.map(asset => 
        [
            asset.make,
            asset.model,
            asset.assetTag,
            asset.serialNumber,
            asset.assetType,
            asset.ownership,
            asset.purchaseFrom,
            asset.processor,
            asset.ram,
            asset.storage,
            asset.assignedToName,
            asset.status
        ].map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `assets-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: 'Export Successful',
      description: `${assets.length} assets have been exported.`,
    });
  };

  const handleDownloadSample = () => {
    const headers = "make,model,assetTag,serialNumber,assetType,ownership,purchaseFrom,processor,ram,storage,assignedToName,status";
    const exampleData = "Dell,Latitude 5420,IT-00123,S12345XYZ,Laptop,Own,Dell Inc.,Intel i5,16GB,512GB SSD,Priya Sharma,Assigned\nApple,MacBook Pro,IT-00124,S67890ABC,Laptop,Own,Apple Store,Apple M1,16GB,512GB SSD,,Available";
    const csvContent = `${headers}\n${exampleData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'assets-sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!tenantId) {
      toast({ variant: 'destructive', title: 'Import Failed', description: 'Cannot import without a tenant ID.' });
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type && file.type !== 'text/csv') {
       toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: `Expected a .csv file, but got ${file.type}.`,
        });
        return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File Too Large',
          description: `Please upload a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
        });
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
        let text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length > MAX_ROWS_PER_IMPORT) {
            throw new Error(`The file has too many rows. Please import a maximum of ${MAX_ROWS_PER_IMPORT} assets at a time.`);
        }

        let headerLine = lines.shift()?.trim();
        if (!headerLine) throw new Error('CSV is empty or missing a header.');

        // Remove BOM character if present
        if (headerLine.charCodeAt(0) === 0xFEFF) {
          headerLine = headerLine.substring(1);
        }
        
        const header = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        const requiredHeaders: (keyof Omit<Asset, 'id' | 'comments' | 'auditLog' | 'assignedTo'>)[] = ['make', 'model', 'assetTag', 'serialNumber', 'assetType', 'ownership', 'purchaseFrom', 'processor', 'ram', 'storage'];
        
        for (const requiredHeader of requiredHeaders) {
          if (!header.includes(requiredHeader)) {
            throw new Error(`CSV is missing required header: ${requiredHeader}`);
          }
        }

        const importedAssets: Asset[] = [];
        const newSerialNumbersInFile = new Set<string>();
        const existingSerialNumbers = new Set((assets || []).map(a => a.serialNumber.toLowerCase()));
        let skippedCount = 0;

        for (const [index, line] of lines.entries()) {
          const rowNum = index + 2;
          const values = (line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [])
            .map(v => v.trim().replace(/^"|"$/g, ''));
          
          if (values.length !== header.length) {
            console.warn(`Skipping malformed row ${rowNum}: ${line}`);
            continue;
          }

          const assetData = header.reduce((obj, h, i) => {
            obj[h as keyof Asset] = values[i] || '';
            return obj;
          }, {} as any);
          
          if (!assetData.assetTag) { console.warn(`Skipping row ${rowNum}: assetTag is missing.`); skippedCount++; continue; }
          if (!assetData.serialNumber) { console.warn(`Skipping row ${rowNum}: serialNumber is missing.`); skippedCount++; continue; }
          if (!assetData.make) { console.warn(`Skipping row ${rowNum}: make is missing.`); skippedCount++; continue; }
          if (!assetData.model) { console.warn(`Skipping row ${rowNum}: model is missing.`); skippedCount++; continue; }

          const serialNumberLower = assetData.serialNumber.trim().toLowerCase();
          if (existingSerialNumbers.has(serialNumberLower)) {
            throw new Error(`Row ${rowNum}: Serial number "${assetData.serialNumber}" already exists in the database.`);
          }
          if (newSerialNumbersInFile.has(serialNumberLower)) {
            console.warn(`Skipping row ${rowNum}: Duplicate serial number "${assetData.serialNumber}" in CSV.`);
            skippedCount++;
            continue;
          }
          newSerialNumbersInFile.add(serialNumberLower);
          
          const ownership = assetData.ownership as string;
          if (ownership !== 'Own' && ownership !== 'Rented') {
             throw new Error(`Row ${rowNum}: ownership must be either "Own" or "Rented".`);
          }

          const status = (assetData.status as AssetStatus) || 'Available';
          
          const assignedTo = assetData.assignedTo?.trim() || null;
          const details = `
            Make: ${assetData.make},
            Model: ${assetData.model},
            Serial Number: ${assetData.serialNumber},
            Asset Type: ${assetData.assetType},
            Ownership: ${assetData.ownership},
            Purchase From: ${assetData.purchaseFrom},
            Assigned To: ${assignedTo || 'Unassigned'},
            Status: ${status},
            Processor: ${assetData.processor},
            RAM: ${assetData.ram},
            Storage: ${assetData.storage}
          `;

          importedAssets.push({
            id: uuidv4(),
            make: assetData.make.trim(),
            model: assetData.model.trim(),
            assetTag: assetData.assetTag.trim(),
            serialNumber: assetData.serialNumber.trim(),
            purchaseFrom: (assetData.purchaseFrom || '').trim(),
            ownership: ownership as 'Own' | 'Rented',
            processor: (assetData.processor || '').trim(),
            ram: (assetData.ram || '').trim(),
            storage: (assetData.storage || '').trim(),
            assetType: (assetData.assetType || 'Laptop').trim(),
            status: ['Available', 'Assigned', 'Donated', 'E-Waste'].includes(status) ? status : 'Available',
            comments: [],
            auditLog: [{
                id: uuidv4(),
                action: 'Created',
                date: new Date().toISOString(),
                details: `Asset imported from CSV. Details: ${details}`,
            }],
            assignedTo: assignedTo,
          });
        }

        if ((assets?.length || 0) + importedAssets.length > MAX_ASSETS_LIMIT) {
             throw new Error(`Importing these ${importedAssets.length} assets would exceed the limit of ${MAX_ASSETS_LIMIT} total assets.`);
        }

        if (importedAssets.length > 0) {
          try {
            await assetService.addAssets(databaseProvider, dbConfig, tenantId, importedAssets);
            router.refresh();
            toast({
              title: 'Import Successful',
              description: `${importedAssets.length} assets added. ${skippedCount > 0 ? `${skippedCount} duplicate(s) skipped.` : ''}`,
            });
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
                    description: e.message || 'Could not save assets to the database.',
                });
            }
          }
        } else if (skippedCount > 0) {
          toast({
            variant: 'destructive',
            title: 'Import Finished',
            description: `No new assets were added. ${skippedCount} rows were skipped due to missing data or duplicates.`,
          });
        }
         else {
          throw new Error('No valid assets found in the file.');
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: error.message || 'Could not parse the CSV file. Please check its format.',
        });
      } finally {
        setIsLoading(false);
        setImportProgress(0);
      }
    };
    reader.onerror = () => {
       toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: 'Could not read the file.',
        });
       setIsLoading(false);
       setImportProgress(0);
    }
    reader.readAsText(file);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSelectAsset = (id: string) => {
    setSelectedAssets(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        return newSelected;
    });
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
        setSelectedAssets(new Set(sortedAndFilteredAssets.map(a => a.id)));
    } else {
        setSelectedAssets(new Set());
    }
  };
  
  const handleDeleteSelected = async () => {
    if (!tenantId) return;
    const assetCount = selectedAssets.size;
    const assetIdsToDelete = Array.from(selectedAssets);

    try {
        await assetService.deleteAssets(databaseProvider, dbConfig, tenantId, assetIdsToDelete);
        toast({
            title: `${assetCount} Asset${assetCount > 1 ? 's' : ''} Deleted`,
            description: 'The selected assets have been permanently removed.',
        });
        setSelectedAssets(new Set());
        setIsDeleteDialogOpen(false);
        router.refresh();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'Could not delete the selected assets from the database.',
        });
    }
  };
  
  const handleMassUpdate = async (values: MassUpdateFormValues) => {
    if (!tenantId) return;
    try {
      const assetIdsToUpdate = Array.from(selectedAssets);
      const { field, value } = values;

      const updateData = { [field]: value };

      await assetService.updateAssets(databaseProvider, dbConfig, tenantId, assetIdsToUpdate, updateData);

      toast({
        title: 'Mass Update Successful',
        description: `Updated ${assetIdsToUpdate.length} assets.`,
      });
      setSelectedAssets(new Set());
      setIsMassUpdateOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Mass Update Failed',
        description: 'Could not update the selected assets.',
      });
      throw error;
    }
  };


  const requestSort = (key: keyof Asset) => {
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
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="w-full">
            <h1 className="text-3xl font-bold">Asset Management</h1>
            <p className="text-muted-foreground">
              Add, view, edit, and delete your assets here.
            </p>
        </div>
        <div className="w-full md:w-auto flex justify-end">
            <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
            <DialogTrigger asChild>
                <Button className="w-full md:w-auto" onClick={() => { setEditingAsset(null); setIsFormOpen(true); } }>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Asset
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>
                    {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                </DialogTitle>
                <DialogDescription>
                    {editingAsset
                    ? 'Update the details for this asset.'
                    : 'Fill in the form to add a new asset to your inventory.'}
                </DialogDescription>
                </DialogHeader>
                <AddAssetForm
                  onSave={handleSaveAsset}
                  initialData={editingAsset}
                  onDone={() => handleFormOpenChange(false)}
                  employees={employees}
                  vendors={vendors}
                />
            </DialogContent>
            </Dialog>
        </div>
      </div>
      
      <AssetTable
        assets={sortedAndFilteredAssets}
        employees={employees}
        onEdit={handleEditAsset}
        onDelete={(asset) => handleDeleteAsset(asset)}
        onView={setViewingAsset}
        isLoading={isLoading && importProgress === 0}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        assetTypeFilter={assetTypeFilter}
        setAssetTypeFilter={setAssetTypeFilter}
        availableAssetTypes={availableAssetTypes}
        onExport={handleExport}
        onImport={() => fileInputRef.current?.click()}
        onDownloadSample={handleDownloadSample}
        selectedAssets={selectedAssets}
        onSelectAsset={handleSelectAsset}
        onSelectAll={handleSelectAll}
        onDeleteSelected={() => setIsDeleteDialogOpen(true)}
        onMassUpdate={() => setIsMassUpdateOpen(true)}
        isImporting={isLoading && importProgress > 0}
        importProgress={importProgress}
        sortConfig={sortConfig}
        requestSort={requestSort}
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
                This action cannot be undone. This will permanently delete {selectedAssets.size} selected asset{selectedAssets.size === 1 ? '' : 's'}.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>
                Continue
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <Dialog open={isMassUpdateOpen} onOpenChange={setIsMassUpdateOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mass Update Assets</DialogTitle>
          <DialogDescription>Update a field for all {selectedAssets.size} selected assets.</DialogDescription>
        </DialogHeader>
        <MassUpdateAssetForm
          onSave={handleMassUpdate}
          onDone={() => setIsMassUpdateOpen(false)}
        />
      </DialogContent>
    </Dialog>
    <AssetDetailsDialog
        asset={viewingAsset}
        employees={employees}
        isOpen={!!viewingAsset}
        onClose={() => setViewingAsset(null)}
        onEdit={handleEditAsset}
        onAddComment={handleAddCommentToAsset}
    />
    </>
  );
}
