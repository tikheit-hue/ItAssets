
"use client";

import type { Award } from "@/app/awards/page";
import type { Employee } from "@/app/employees/index";
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
import { Pencil } from "lucide-react";
import { format, parseISO } from 'date-fns';

type AwardDetailsDialogProps = {
  award: Award | null;
  employee: Employee | undefined;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (award: Award) => void;
};

export function AwardDetailsDialog({ award, employee, isOpen, onClose, onEdit }: AwardDetailsDialogProps) {
  if (!award) {
    return null;
  }

  const handleEdit = () => {
    if (award) {
      onEdit(award);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Award Details</DialogTitle>
          <DialogDescription>
            Full details for the {award.name}.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="space-y-4 py-4">
              <DetailRow label="Award Name" value={award.name} />
              <DetailRow label="Award Type">
                <Badge variant="secondary">{award.type}</Badge>
              </DetailRow>
              <DetailRow label="Recipient" value={employee?.name || 'Unknown'} />
              <DetailRow label="Department" value={award.department} />
              <DetailRow label="Award Date" value={format(parseISO(award.awardDate), 'PPP')} />
              <DetailRow label="Awarded By" value={award.awardedBy} />
              <DetailRow label="Reason" value={award.reason} />
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
            <Button variant="outline" onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
            </Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DetailRow = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
  <div className="grid grid-cols-3 items-start gap-4">
    <p className="font-medium text-muted-foreground col-span-1">{label}</p>
    <div className="col-span-2 break-words">{value || children}</div>
  </div>
);
