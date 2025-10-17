
'use client';

import type { Consumable, IssueLog } from "@/app/consumables/index";
import type { Employee } from "@/app/employees/index";
import type { Vendor } from "@/app/vendors/index";
import type { AuditLog } from "@/app/assets/index";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Pencil, History, User, ShoppingCart, RotateCcw } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ConsumableDetailsDialogProps = {
  consumable: Consumable | null;
  employees: Employee[];
  vendors: Vendor[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (consumable: Consumable) => void;
  onRevoke: (data: { consumableId: string; issueLog: IssueLog }) => void;
};

const sanitizeText = (text: string) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export function ConsumableDetailsDialog({ consumable, employees, vendors, isOpen, onClose, onEdit, onRevoke }: ConsumableDetailsDialogProps) {
  if (!consumable) {
    return null;
  }

  const handleEdit = () => {
    if (consumable) {
      onEdit(consumable);
    }
  };
  
  const vendor = vendors.find(v => v.id === consumable.vendorId);
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Consumable Item Details</DialogTitle>
          <DialogDescription>
            Full details and history for {consumable.name}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mt-4">
            {/* Column 1: Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Item Information</h3>
              <div className="grid gap-2 text-sm border p-4 rounded-md">
                  <DetailRow label="Item Name" value={consumable.name} />
                  <DetailRow label="Category"><Badge variant="secondary">{consumable.category}</Badge></DetailRow>
                  <DetailRow label="Quantity Left" value={`${consumable.quantity} ${consumable.unitType}`} />
                  <DetailRow label="Purchase Date" value={format(parseISO(consumable.purchaseDate), 'PPP')} />
                  <DetailRow label="Vendor" value={vendor?.name || 'N/A'} />
                  <DetailRow label="Cost per Item" value={consumable.costPerItem ? `₹${consumable.costPerItem.toFixed(2)}` : 'N/A'} />
                  <DetailRow label="Remarks" value={consumable.remarks || 'N/A'} />
              </div>
              <Button variant="outline" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Item
              </Button>
            </div>

            {/* Column 2: Issue Log */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5"/> Issue History
              </h3>
              <div className="border rounded-md">
                <ScrollArea className="h-40">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/50">
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {consumable.issueLog && consumable.issueLog.length > 0 ? (
                            [...consumable.issueLog].sort((a, b) => parseISO(b.issueDate).getTime() - parseISO(a.issueDate).getTime()).map(log => (
                                <TableRow key={log.id} className={cn(log.status === 'Reversed' && 'text-muted-foreground line-through')}>
                                    <TableCell>{getEmployeeName(log.employeeId)}</TableCell>
                                    <TableCell>{log.quantity}</TableCell>
                                    <TableCell>{format(parseISO(log.issueDate), 'PPP')}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRevoke({ consumableId: consumable.id, issueLog: log })}
                                            disabled={log.status === 'Reversed'}
                                            title="Revoke Issue"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No issue history.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>

            {/* Full Width Audit Log */}
             <div className="md:col-span-2 space-y-4">
                 <h3 className="font-semibold text-lg flex items-center">
                    <History className="mr-2 h-5 w-5"/> Audit Log
                 </h3>
                 <ScrollArea className="h-48 border rounded-md">
                    <div className="p-4 space-y-3">
                      {consumable.auditLog && consumable.auditLog.length > 0 ? (
                          [...consumable.auditLog].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(log => (
                            <LogEntry key={log.id} log={log} />
                          ))
                      ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No audit history.</p>
                      )}
                    </div>
                  </ScrollArea>
             </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
            <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DetailRow = ({ label, value, children }: { label: string; value?: string | number, children?: React.ReactNode }) => (
  <div className="grid grid-cols-3 items-start gap-4">
    <p className="font-medium text-muted-foreground col-span-1">{label}</p>
    <div className="col-span-2 break-words">{value ?? children}</div>
  </div>
);

const LogEntry = ({ log }: { log: AuditLog }) => (
    <div className="flex items-start gap-3">
        <div>
            <Badge variant={
                log.action === 'Created' ? 'default' : 
                log.action.includes('Revoked') ? 'destructive' :
                log.action === 'Updated' || log.action === 'Issued' ? 'secondary' : 
                'outline'
            }>{log.action}</Badge>
        </div>
        <div className="flex-1 text-sm">
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeText(log.details) }} />
            <p className="text-xs text-muted-foreground/70 mt-1" title={format(parseISO(log.date), 'Pp')}>
                {format(parseISO(log.date), 'Pp')}
            </p>
        </div>
    </div>
);
