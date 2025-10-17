
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Vendor } from '@/app/vendors/index';
import type { Employee } from '@/app/employees/index';
import type { AuditLog } from '@/app/assets/index';
import * as consumableService from '@/services/consumable-service';
import * as employeeService from '@/services/employee-service';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { ConsumablesTable } from '@/components/consumables/consumables-table';
import { AddConsumableForm, type ConsumableFormValues } from '@/components/consumables/add-consumable-form';
import { IssueConsumableForm, type IssueFormValues } from '@/components/consumables/issue-consumable-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeftRight } from 'lucide-react';
import { ConsumableDetailsDialog } from '@/components/consumables/consumable-details-dialog';
import { useSettings } from '@/context/settings-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/auth-context';

export type IssueLog = {
  id: string;
  employeeId: string;
  quantity: number;
  issueDate: string;
  remarks: string;
  status?: 'Active' | 'Reversed';
};

export type Consumable = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitType: string;
  purchaseDate: string;
  vendorId: string | null;
  costPerItem?: number;
  remarks: string;
  auditLog: AuditLog[];
  issueLog: IssueLog[];
};

type ConsumablesPageProps = {
  initialConsumables: Consumable[];
  initialEmployees: Employee[];
  initialVendors: Vendor[];
};

export default function ConsumablesPageContent({
  initialConsumables,
  initialEmployees,
  initialVendors,
}: ConsumablesPageProps) {
  const { toast } = useToast();
  const { sqlConfig, databaseProvider } = useSettings();
  const { tenantId } = useAuth();

  const [consumables, setConsumables] = useState(initialConsumables);
  const [employees, setEmployees] = useState(initialEmployees);
  const [vendors, setVendors] = useState(initialVendors);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<Consumable | null>(null);
  const [viewingConsumable, setViewingConsumable] = useState<Consumable | null>(null);
  const [revokingIssue, setRevokingIssue] = useState<{ consumableId: string; issueLog: IssueLog } | null>(null);

  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

  const fetchConsumables = async () => {
    if (!tenantId) return;
    const updatedConsumables = await consumableService.getConsumables(databaseProvider, dbConfig, tenantId);
    setConsumables(updatedConsumables);
  };

  const handleFormOpenChange = (open: boolean) => {
    if (!open) setEditingConsumable(null);
    setIsFormOpen(open);
  };

  const handleSaveConsumable = async (data: ConsumableFormValues) => {
    if (!tenantId) return;
    try {
      if (editingConsumable) {
        const updatedConsumable = { ...editingConsumable, ...data, costPerItem: data.costPerItem || 0 };
        await consumableService.updateConsumable(databaseProvider, dbConfig, tenantId, updatedConsumable);
        toast({ title: "Item Updated" });
      } else {
        const newConsumable: Consumable = {
          ...data,
          id: uuidv4(),
          costPerItem: data.costPerItem || 0,
          auditLog: [{ id: uuidv4(), action: 'Created', date: new Date().toISOString(), details: 'Item created' }],
          issueLog: [],
        };
        await consumableService.addConsumable(databaseProvider, dbConfig, tenantId, newConsumable);
        toast({ title: "Item Added" });
      }
      setIsFormOpen(false);
      await fetchConsumables();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save failed' });
      throw error;
    }
  };

  const handleDeleteConsumable = async (id: string) => {
    if (!tenantId) return;
    try {
      await consumableService.deleteConsumable(databaseProvider, dbConfig, tenantId, id);
      toast({ title: 'Item Deleted' });
      await fetchConsumables();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Delete failed' });
    }
  };

  const handleIssueConsumable = async (data: IssueFormValues) => {
    if (!tenantId) return;
    try {
        const item = consumables.find(c => c.id === data.consumableId);
        if (!item || item.quantity < data.quantity) {
            toast({ variant: 'destructive', title: 'Not enough stock' });
            throw new Error('Not enough stock');
        }
        
        const employee = employees.find(e => e.id === data.employeeId);
        if (!employee) {
            toast({ variant: 'destructive', title: 'Employee not found' });
            throw new Error('Employee not found');
        }

        const newIssueLog: IssueLog = {
            id: uuidv4(),
            employeeId: data.employeeId,
            quantity: data.quantity,
            issueDate: new Date().toISOString(),
            remarks: data.remarks || '',
            status: 'Active',
        };

        await consumableService.issueConsumable(databaseProvider, dbConfig, tenantId, data.consumableId, newIssueLog, employee.name);
        
        const employeeLogText = `Issued consumable: ${data.quantity} x ${item.name}.`;
        await employeeService.addCommentToEmployee(databaseProvider, dbConfig, tenantId, data.employeeId, employeeLogText);

        toast({ title: 'Item Issued', description: `${data.quantity} unit(s) of ${item.name} issued to ${employee.name}.` });
        setIsIssueFormOpen(false);
        await fetchConsumables();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Issue failed' });
        throw error;
    }
  };

    const handleRevokeIssue = async () => {
    if (!revokingIssue || !tenantId) return;
    const { consumableId, issueLog } = revokingIssue;
    
    try {
        await consumableService.revokeIssuedConsumable(databaseProvider, dbConfig, tenantId, consumableId, issueLog);
        
        const employee = employees.find(e => e.id === issueLog.employeeId);
        const consumable = consumables.find(c => c.id === consumableId);
        if (employee && consumable) {
            const employeeLogText = `Returned consumable: ${issueLog.quantity} x ${consumable.name}. (Issue from ${new Date(issueLog.issueDate).toLocaleDateString()} revoked)`;
            await employeeService.addCommentToEmployee(databaseProvider, dbConfig, tenantId, employee.id, employeeLogText);
        }

        toast({ title: 'Issue Revoked', description: `Stock for ${consumable?.name} has been restored.` });
        await fetchConsumables();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Revoke Failed', description: 'Could not revoke the item issue.' });
    } finally {
        setRevokingIssue(null);
    }
  };


  const handleEdit = (consumable: Consumable) => {
    setEditingConsumable(consumable);
    setIsFormOpen(true);
  };
  
  const handleView = (consumable: Consumable) => {
    setViewingConsumable(consumable);
  };

  return (
    <>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Consumable Items</h1>
            <p className="text-muted-foreground">Track and manage your consumable inventory.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsIssueFormOpen(true)}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Issue Item
            </Button>
            <Button onClick={() => { setEditingConsumable(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        <ConsumablesTable
          consumables={consumables}
          onEdit={handleEdit}
          onDelete={handleDeleteConsumable}
          onView={handleView}
        />
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingConsumable ? 'Edit' : 'Add'} Consumable Item</DialogTitle>
            <DialogDescription>Fill in the details for the inventory item.</DialogDescription>
          </DialogHeader>
          <AddConsumableForm
            onSave={handleSaveConsumable}
            initialData={editingConsumable}
            onDone={() => setIsFormOpen(false)}
            vendors={vendors}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isIssueFormOpen} onOpenChange={setIsIssueFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Consumable Item</DialogTitle>
            <DialogDescription>Select an employee and item to issue.</DialogDescription>
          </DialogHeader>
          <IssueConsumableForm
            onSave={handleIssueConsumable}
            onDone={() => setIsIssueFormOpen(false)}
            employees={employees}
            consumables={consumables}
          />
        </DialogContent>
      </Dialog>

      <ConsumableDetailsDialog
        consumable={viewingConsumable}
        employees={employees}
        vendors={vendors}
        isOpen={!!viewingConsumable}
        onClose={() => setViewingConsumable(null)}
        onEdit={handleEdit}
        onRevoke={setRevokingIssue}
      />
      
      <AlertDialog open={!!revokingIssue} onOpenChange={(open) => !open && setRevokingIssue(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This will revoke the issue of {revokingIssue?.issueLog.quantity} item(s). Stock will be restored, and an entry will be added to the audit log. This action cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokingIssue(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeIssue}>
                Continue
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
