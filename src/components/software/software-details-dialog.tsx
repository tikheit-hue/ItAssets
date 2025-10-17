
"use client";

import type { Software } from "@/app/software/index";
import type { Employee } from "@/app/employees/index";
import type { Vendor } from "@/app/vendors/index";
import type { AuditLog } from "@/app/assets/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Pencil, History, User } from "lucide-react";
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

type SoftwareDetailsDialogProps = {
  software: Software | null;
  employees: Employee[];
  vendors: Vendor[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (software: Software) => void;
};

export function SoftwareDetailsDialog({ software, employees, vendors, isOpen, onClose, onEdit }: SoftwareDetailsDialogProps) {
  if (!software) {
    return null;
  }

  const handleEdit = () => {
    if (software) {
      onEdit(software);
    }
  };
  
  const assignedEmployees = employees.filter(e => software.assignedTo.includes(e.id));
  const vendor = vendors.find(v => v.id === software.vendorId);

  const isValidDate = (date: any) => date && isValid(parseISO(date));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Software Details</DialogTitle>
          <DialogDescription>
            Full details and history for {software.name}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Software Information</h3>
              <div className="grid gap-2 text-sm border p-4 rounded-md">
                  <DetailRow label="Name" value={software.name} />
                  <DetailRow label="Version" value={software.version} />
                  <DetailRow label="License Key" value={software.licenseKey} />
                  <DetailRow label="Vendor" value={vendor?.name} />
                  <DetailRow label="Purchase Date" value={isValidDate(software.purchaseDate) ? format(parseISO(software.purchaseDate), 'PPP') : 'N/A'} />
                  <DetailRow label="Expiry Date" value={isValidDate(software.expiryDate) ? format(parseISO(software.expiryDate as string), 'PPP') : "Perpetual"} />
                  <DetailRow label="Licenses" value={`${software.assignedTo.length} / ${software.totalLicenses}`} />
                  <DetailRow label="License Type" value={software.licenseType} />
                  <DetailRow label="Ownership" value={software.ownership} />
                   <DetailRow label="Status"><Badge variant={software.status === 'Expired' ? 'destructive' : 'default'}>{software.status}</Badge></DetailRow>
              </div>
              <Button variant="outline" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Software
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                  <h3 className="font-semibold text-lg flex items-center mb-2">
                      <User className="mr-2 h-5 w-5"/> Assigned Employees ({assignedEmployees.length})
                  </h3>
                   <ScrollArea className="h-40 border rounded-md">
                      <div className="p-4 space-y-2">
                      {assignedEmployees.length > 0 ? (
                          assignedEmployees.map(emp => (
                              <div key={emp.id} className="text-sm">{emp.name} ({emp.employeeId})</div>
                          ))
                      ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">Not assigned to any employees.</p>
                      )}
                      </div>
                  </ScrollArea>
              </div>
              <div>
                  <h3 className="font-semibold text-lg flex items-center mb-2">
                      <History className="mr-2 h-5 w-5"/> Audit Log
                  </h3>
                  <ScrollArea className="h-48 border rounded-md">
                    <div className="p-4 space-y-3">
                      {software.auditLog && software.auditLog.length > 0 ? (
                          software.auditLog.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(log => (
                            <LogEntry key={log.id} log={log} />
                          ))
                      ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No audit history.</p>
                      )}
                    </div>
                  </ScrollArea>
              </div>
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

const DetailRow = ({ label, value, children }: { label: string; value?: string, children?: React.ReactNode }) => (
  <div className="grid grid-cols-3 items-center gap-4">
    <p className="font-medium text-muted-foreground col-span-1">{label}</p>
    <div className="col-span-2 break-words">{value || children}</div>
  </div>
);

const LogEntry = ({ log }: { log: AuditLog }) => (
    <div className="flex items-start gap-3">
        <div>
            <Badge variant={
                log.action === 'Created' ? 'default' : 
                log.action === 'Updated' ? 'secondary' : 
                'outline'
            }>{log.action}</Badge>
        </div>
        <div className="flex-1 text-sm">
            <p className="text-muted-foreground">{log.details}</p>
            <p className="text-xs text-muted-foreground/70 mt-1" title={new Date(log.date).toLocaleString()}>
                {formatDistanceToNow(new Date(log.date), { addSuffix: true })}
            </p>
        </div>
    </div>
);
