
"use client";

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
import { Pencil, History, Globe } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from 'date-fns';

type VendorDetailsDialogProps = {
  vendor: Vendor | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (vendor: Vendor) => void;
};

const sanitizeText = (text: string) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export function VendorDetailsDialog({ vendor, isOpen, onClose, onEdit }: VendorDetailsDialogProps) {
  if (!vendor) {
    return null;
  }

  const handleEdit = () => {
    if (vendor) {
      onEdit(vendor);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Vendor Details</DialogTitle>
          <DialogDescription>
            Full details and history for {vendor.name}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            {/* Left Side: Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Vendor Information</h3>
              <div className="grid gap-2 text-sm border p-4 rounded-md">
                  <DetailRow label="Vendor Name" value={vendor.name} />
                  <DetailRow label="Contact Person" value={vendor.contactPerson} />
                  <DetailRow label="Email" value={vendor.email} />
                  <DetailRow label="Phone" value={vendor.phone} />
                  <DetailRow label="Address" value={vendor.address} />
                  <DetailRow label="Website">
                    {vendor.website ? 
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {vendor.website} <Globe className="h-3 w-3" />
                      </a> : 'N/A'}
                  </DetailRow>
                  <DetailRow label="Products/Services">
                    <div className="flex flex-wrap gap-1">
                        {vendor.products.length > 0 ? vendor.products.map(p => <Badge key={p} variant="secondary">{p}</Badge>) : 'N/A'}
                    </div>
                  </DetailRow>
              </div>
              <Button variant="outline" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Vendor
              </Button>
            </div>

            {/* Right Side: Audit Log */}
            <div className="space-y-6">
              <div>
                  <h3 className="font-semibold text-lg flex items-center mb-2">
                      <History className="mr-2 h-5 w-5"/> Audit Log
                  </h3>
                  <ScrollArea className="h-96 border rounded-md">
                    <div className="p-4 space-y-3">
                      {vendor.auditLog && vendor.auditLog.length > 0 ? (
                          vendor.auditLog.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(log => (
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
  <div className="grid grid-cols-3 items-start gap-4">
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
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeText(log.details) }} />
            <p className="text-xs text-muted-foreground/70 mt-1" title={format(parseISO(log.date), 'Pp')}>
                {format(parseISO(log.date), 'Pp')}
            </p>
        </div>
    </div>
);
