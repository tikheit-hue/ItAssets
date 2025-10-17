
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { EmployeeTable } from '@/components/employee-table';
import { AddEmployeeForm } from '@/components/add-employee-form';
import { EmployeeExitForm, type EmployeeExitFormValues } from '@/components/employee-exit-form';
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
import { format, parseISO } from 'date-fns';
import type { Asset, Comment, AuditLog } from '@/app/assets/index';
import { useConfiguration } from '@/context/configuration-context';
import * as employeeService from '@/services/employee-service';
import * as assetService from '@/services/asset-service';
import * as awardService from '@/services/award-service';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmployeeDetailsDialog } from '@/components/employee-details-dialog';
import type { Award } from '@/app/awards/page';

export type Employee = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  joiningDate: string; 
  status: 'Active' | 'Inactive';
  comments: Comment[];
  auditLog: AuditLog[];
  exitDate?: string | null;
  exitReason?: string | null;
};

const MAX_FILE_SIZE_MB = 5;
const MAX_EMPLOYEES_LIMIT = 5000;
const MAX_ROWS_PER_IMPORT = 2000;

type EmployeesPageContentProps = {
  initialEmployees: Employee[];
  initialAssets: Asset[];
  initialAwards: Award[];
  initialEditingEmployee?: Employee;
};

export default function EmployeesPageContent({
  initialEmployees,
  initialAssets,
  initialAwards,
  initialEditingEmployee,
}: EmployeesPageContentProps) {
  const { toast } = useToast();
  const { departments, setDepartments, designations, setDesignations } = useConfiguration();
  const { sqlConfig, databaseProvider, isDbConfigured } = useSettings();
  const { tenantId } = useAuth();
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [awards, setAwards] = useState<Award[]>(initialAwards);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProgress, setImportProgress] = useState(0);

  const [exitingEmployee, setExitingEmployee] = useState<Employee | null>(null);
  const [isExitFormOpen, setIsExitFormOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(initialEditingEmployee || null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(!!initialEditingEmployee);
  
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;
  
  useEffect(() => {
      setEmployees(initialEmployees);
      setAssets(initialAssets);
      setAwards(initialAwards);
      setEditingEmployee(initialEditingEmployee || null);
      setIsFormOpen(!!initialEditingEmployee);
  }, [initialEmployees, initialAssets, initialAwards, initialEditingEmployee]);

  
  useEffect(() => {
      const depParam = searchParams.get('department');
      if (depParam) setDepartmentFilter(depParam);
      const statusParam = searchParams.get('status') as 'Active' | 'Inactive';
      if (statusParam) setStatusFilter(statusParam);
  }, [searchParams]);
  
  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      setEditingEmployee(null);
      // If we were editing from a URL param, clear it
      if (searchParams.has('edit')) {
          router.replace('/employees', { scroll: false });
      }
    }
    setIsFormOpen(open);
  };

  const handleExitFormOpenChange = (open: boolean) => {
    if (!open) {
      setExitingEmployee(null);
    }
    setIsExitFormOpen(open);
  }

  const handleMarkAsExited = (employee: Employee) => {
    setExitingEmployee(employee);
    setIsExitFormOpen(true);
  }
  
  const handleSaveEmployee = async (data: Omit<Employee, "id" | "comments" | "auditLog">) => {
    if (!tenantId) return;
    try {
      const formattedData = {
          ...data,
          joiningDate: data.joiningDate ? format(new Date(data.joiningDate), 'yyyy-MM-dd') : '',
      };

      if (editingEmployee) {
        const oldEmployee = employees.find(emp => emp.id === editingEmployee.id);
        const updatedEmployee = { ...editingEmployee, ...formattedData };

        let changes: string[] = [];
        if (oldEmployee) {
            (Object.keys(data) as (keyof typeof data)[]).forEach(key => {
                if (oldEmployee[key] !== updatedEmployee[key]) {
                    changes.push(`'${key}' from '${oldEmployee[key]}' to '${updatedEmployee[key]}'`);
                }
            });
        }
        
        if (changes.length > 0) {
            if (!updatedEmployee.auditLog) {
              updatedEmployee.auditLog = [];
            }
            updatedEmployee.auditLog.unshift({
                id: uuidv4(),
                action: 'Updated',
                date: new Date().toISOString(),
                details: `Updated ${changes.join(', ')}`,
            });
        }
        
        await employeeService.updateEmployee(databaseProvider, dbConfig, tenantId, updatedEmployee);
        
        toast({
          title: 'Employee Updated',
          description: `Employee ${data.name} has been successfully updated.`,
        });
      } else {
         if (employees.length >= MAX_EMPLOYEES_LIMIT) {
             toast({
                variant: 'destructive',
                title: 'Employee Limit Reached',
                description: `You cannot have more than ${MAX_EMPLOYEES_LIMIT} employees.`,
            });
            return;
        }
        await employeeService.addEmployee(databaseProvider, dbConfig, tenantId, formattedData);
        
        toast({
          title: 'Employee Added',
          description: `Employee ${data.name} has been successfully added.`,
        });
      }
      setIsFormOpen(false);
      setEditingEmployee(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem saving the employee. Please try again.',
      });
      throw error;
    }
  };

  const handleDeleteEmployee = async (employeeToDelete: Employee) => {
    if (!tenantId) return;
    try {
      await employeeService.deleteEmployee(databaseProvider, dbConfig, tenantId, employeeToDelete.id);

      // Unassign assets
      const assetsToUpdate = assets.filter(asset => asset.assignedTo === employeeToDelete.id);
      for (const asset of assetsToUpdate) {
        await assetService.updateAsset(databaseProvider, dbConfig, tenantId, { ...asset, assignedTo: null, status: 'Available' });
      }
      
      toast({
        title: 'Employee Deleted',
        description: `Employee ${employeeToDelete.name} has been deleted and their assets have been unassigned.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete the employee from the database.',
      });
    }
  };

  const handleProcessExit = async (data: EmployeeExitFormValues) => {
    if (!exitingEmployee || !tenantId) return;

    try {
        const updatedEmployee: Employee = {
            ...exitingEmployee,
            status: 'Inactive',
            exitDate: data.exitDate,
            exitReason: data.exitReason,
            auditLog: [
                {
                    id: uuidv4(),
                    action: 'Exited',
                    date: new Date().toISOString(),
                    details: `Marked as exited. Reason: ${data.exitReason}. Notes: ${data.notes || 'N/A'}`
                },
                ...exitingEmployee.auditLog,
            ],
            comments: [
                 {
                    id: uuidv4(),
                    text: `All assets collected and verified on ${format(new Date(data.exitDate), 'PPP')}.`,
                    date: new Date().toISOString(),
                },
                ...exitingEmployee.comments
            ]
        };

        await employeeService.updateEmployee(databaseProvider, dbConfig, tenantId, updatedEmployee);

        // Unassign assets
        const assetsToUpdate = assets.filter(asset => asset.assignedTo === exitingEmployee.id);
        for (const asset of assetsToUpdate) {
            await assetService.updateAsset(databaseProvider, dbConfig, tenantId, { 
              ...asset, 
              assignedTo: null,
              status: 'Available',
              auditLog: [
                {
                  id: uuidv4(),
                  action: 'Unassigned',
                  date: new Date().toISOString(),
                  details: `Asset unassigned from exited employee ${exitingEmployee.name}`
                },
                ...asset.auditLog,
              ]
            });
        }

        toast({
            title: 'Employee Exited',
            description: `${exitingEmployee.name} has been marked as inactive and their assets unassigned.`,
        });

        handleExitFormOpenChange(false);
        router.refresh();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Exit Processing Failed',
            description: 'There was a problem processing the employee exit.',
        });
        throw error;
    }
  };


  const sortedAndFilteredEmployees = useMemo(() => {
    let sortableEmployees = [...employees];
    if (sortConfig !== null) {
      sortableEmployees.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined || bValue === null || bValue === undefined) return 0;
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableEmployees
      .filter(emp => {
        if (departmentFilter === 'all') return true;
        return emp.department.toLowerCase() === departmentFilter.toLowerCase();
      })
      .filter(emp => {
        if (statusFilter === 'all') return true;
        return emp.status === statusFilter;
      })
      .filter(emp => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return Object.values(emp).some(value =>
          String(value).toLowerCase().includes(searchLower)
        );
      });
  }, [employees, searchQuery, departmentFilter, statusFilter, sortConfig]);

  const availableDepartments = useMemo(() => {
      const departments = new Set((employees || []).map(e => e.department));
      return Array.from(departments);
  }, [employees]);

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployees(prev => {
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
        setSelectedEmployees(new Set(sortedAndFilteredEmployees.map(e => e.id)));
    } else {
        setSelectedEmployees(new Set());
    }
  };
  
  const handleDeleteSelected = async () => {
    if (!tenantId) return;
    const employeeCount = selectedEmployees.size;
    const employeeIdsToDelete = Array.from(selectedEmployees);

    try {
        await employeeService.deleteEmployees(databaseProvider, dbConfig, tenantId, employeeIdsToDelete);
        
        const assetsToUpdate = assets.filter(asset => selectedEmployees.has(asset.assignedTo || ''));
        for (const asset of assetsToUpdate) {
            await assetService.updateAsset(databaseProvider, dbConfig, tenantId, { ...asset, assignedTo: null, status: 'Available' });
        }
        
        toast({
            title: `${employeeCount} Employee${employeeCount > 1 ? 's' : ''} Deleted`,
            description: 'The selected employees have been permanently removed and their assets unassigned.',
        });
        setSelectedEmployees(new Set());
        setIsDeleteDialogOpen(false);
        router.refresh();

    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the selected employees from the database.',
        });
    }
  };

  const handleExport = () => {
    if (employees.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No employees to export',
        description: 'Add some employees before exporting.',
      });
      return;
    }
    const headers: (keyof Omit<Employee, 'id' | 'comments' | 'auditLog'>)[] = ['employeeId', 'name', 'department', 'designation', 'email', 'phone', 'joiningDate', 'status'];
    const csvContent = [
      headers.join(','),
      ...employees.map(emp => 
        headers.map(header => `"${String(emp[header] ?? '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employees-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: 'Export Successful',
      description: `${employees.length} employees have been exported.`,
    });
  };

  const handleDownloadSample = () => {
    const headers = "employeeId,name,department,designation,email,phone,joiningDate,status";
    const exampleData = "EMP-001,Priya Sharma,Engineering,Software Engineer,priya.sharma@example.com,+919876543210,2023-01-15,Active\nEMP-002,Amit Kumar,Sales,Sales Manager,amit.kumar@example.com,+919876543211,2022-05-20,Active";
    const csvContent = `${headers}\n${exampleData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'employee-sample.csv');
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
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length > MAX_ROWS_PER_IMPORT) {
            throw new Error(`The file has too many rows. Please import a maximum of ${MAX_ROWS_PER_IMPORT} employees at a time.`);
        }

        const headerLine = lines.shift()?.trim();
        if (!headerLine) throw new Error('CSV is empty or missing a header.');
        
        const header = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        const requiredHeaders: (keyof Omit<Employee, 'id' | 'comments' | 'auditLog'>)[] = ['employeeId', 'name', 'department', 'designation', 'email', 'joiningDate', 'status'];
        
        for (const requiredHeader of requiredHeaders) {
          if (!header.includes(requiredHeader)) {
            throw new Error(`CSV is missing required header: ${requiredHeader}`);
          }
        }

        const newDepartments = new Set<string>();
        const newDesignations = new Set<string>();
        const existingDepartments = new Set(departments.map(d => d.toLowerCase()));
        const existingDesignations = new Set(designations.map(d => d.toLowerCase()));

        const importedEmployees = lines.map((line, index) => {
          const rowNum = index + 2;
          const values = (line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [])
            .map(v => v.trim().replace(/^"|"$/g, ''));
          
          if (values.length !== header.length) {
            console.warn(`Skipping malformed row ${rowNum}: ${line}`);
            return null;
          }

          const empData = header.reduce((obj, h, i) => {
            obj[h as keyof Employee] = values[i] || '';
            return obj;
          }, {} as any);
          
          if (!empData.employeeId) throw new Error(`Row ${rowNum}: employeeId is a required field.`);
          if (!empData.name) throw new Error(`Row ${rowNum}: name is a required field.`);
          
          const status = empData.status as string;
          if (status !== 'Active' && status !== 'Inactive') {
             throw new Error(`Row ${rowNum}: status must be either "Active" or "Inactive".`);
          }

          try {
             if (!empData.joiningDate || isNaN(parseISO(empData.joiningDate).getTime())) {
                throw new Error();
             }
          } catch {
            throw new Error(`Row ${rowNum}: joiningDate is invalid. Please use YYYY-MM-DD format.`);
          }

          const department = (empData.department || '').trim();
          if (department && !existingDepartments.has(department.toLowerCase())) {
            newDepartments.add(department);
          }

          const designation = (empData.designation || '').trim();
          if (designation && !existingDesignations.has(designation.toLowerCase())) {
            newDesignations.add(designation);
          }


          return {
            id: uuidv4(),
            employeeId: empData.employeeId.trim(),
            name: empData.name.trim(),
            department: department,
            designation: designation,
            email: (empData.email || '').trim(),
            phone: (empData.phone || '').trim(),
            joiningDate: format(parseISO(empData.joiningDate), 'yyyy-MM-dd'),
            status: status as 'Active' | 'Inactive',
            comments: [],
            auditLog: [{
                id: uuidv4(),
                action: 'Created',
                date: new Date().toISOString(),
                details: 'Employee imported from CSV',
            }],
          } as Employee;
        }).filter((emp): emp is Employee => emp !== null);

        if ((employees?.length || 0) + importedEmployees.length > MAX_EMPLOYEES_LIMIT) {
             throw new Error(`Importing these ${importedEmployees.length} employees would exceed the limit of ${MAX_EMPLOYEES_LIMIT} total employees.`);
        }
        
        if (newDepartments.size > 0) {
            const added = Array.from(newDepartments);
            setDepartments(prev => [...prev, ...added]);
            toast({
                title: 'New Departments Added',
                description: `Automatically added: ${added.join(', ')}`,
            });
        }
        if (newDesignations.size > 0) {
            const added = Array.from(newDesignations);
            setDesignations(prev => [...prev, ...added]);
            toast({
                title: 'New Designations Added',
                description: `Automatically added: ${added.join(', ')}`,
            });
        }

        if (importedEmployees.length > 0) {
          try {
            await employeeService.addEmployees(databaseProvider, dbConfig, tenantId, importedEmployees);
            toast({
              title: 'Import Successful',
              description: `${importedEmployees.length} employees have been added.`,
            });
            router.refresh();
          } catch(e: any) {
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
                    description: e.message || 'Could not save employees to the database.',
                });
            }
          }
        } else {
          throw new Error('No valid employees found in the file.');
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
         if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
  };

  const requestSort = (key: keyof Employee) => {
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
            <h1 className="text-3xl font-bold">Employee Management</h1>
            <p className="text-muted-foreground">
              Add, view, edit, and delete employee records.
            </p>
        </div>
        <div className="w-full md:w-auto flex justify-end">
            <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
            <DialogTrigger asChild>
                <Button className="w-full md:w-auto" onClick={() => setIsFormOpen(true) }>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Employee
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </DialogTitle>
                <DialogDescription>
                    {editingEmployee
                    ? 'Update the details for this employee.'
                    : 'Fill in the form to add a new employee to your records.'}
                </DialogDescription>
                </DialogHeader>
                <AddEmployeeForm
                  onSave={handleSaveEmployee}
                  initialData={editingEmployee}
                  onDone={() => handleFormOpenChange(false)}
                />
            </DialogContent>
            </Dialog>
        </div>
      </div>
      
      <EmployeeTable
        employees={sortedAndFilteredEmployees}
        onEdit={(employee) => { setEditingEmployee(employee); setIsFormOpen(true); }}
        onDelete={(employee) => handleDeleteEmployee(employee)}
        onView={(employee) => setViewingEmployee(employee)}
        onMarkAsExited={handleMarkAsExited}
        isLoading={isLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        departmentFilter={departmentFilter}
        setDepartmentFilter={setDepartmentFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        availableDepartments={availableDepartments}
        selectedEmployees={selectedEmployees}
        onSelectEmployee={handleSelectEmployee}
        onSelectAll={handleSelectAll}
        onDeleteSelected={() => setIsDeleteDialogOpen(true)}
        onImport={() => fileInputRef.current?.click()}
        onExport={handleExport}
        onDownloadSample={handleDownloadSample}
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
        id="employee-file-input"
      />
    </div>
    <EmployeeDetailsDialog
        employee={viewingEmployee}
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        onEdit={(employee) => { setEditingEmployee(employee); setIsFormOpen(true); }}
        assignedAssets={assets.filter(
            (asset) => asset.assignedTo === viewingEmployee?.id
        )}
        onViewAsset={() => {}}
        onAddComment={() => {}}
        awards={awards.filter(
            (award) => award.employeeId === viewingEmployee?.id
        )}
    />
     <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will permanently delete {selectedEmployees.size} selected employee{selectedEmployees.size === 1 ? '' : 's'} and unassign their assets. This cannot be undone.
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
     <Dialog open={isExitFormOpen} onOpenChange={handleExitFormOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Process Employee Exit</DialogTitle>
            <DialogDescription>
              Mark <span className='font-bold'>{exitingEmployee?.name}</span> as exited and unassign their assets.
            </DialogDescription>
          </DialogHeader>
          <EmployeeExitForm
            employee={exitingEmployee}
            assignedAssets={assets.filter(a => a.assignedTo === exitingEmployee?.id)}
            onSave={handleProcessExit}
            onDone={() => handleExitFormOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
