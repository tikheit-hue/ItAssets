
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
import { AwardCertificate } from "./award-certificate";
import { ScrollArea } from "../ui/scroll-area";

type AwardCertificatePreviewDialogProps = {
  award: Award | null;
  employee: Employee | undefined;
  isOpen: boolean;
  onClose: () => void;
};

export function AwardCertificatePreviewDialog({ award, employee, isOpen, onClose }: AwardCertificatePreviewDialogProps) {
  if (!award || !employee) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>Certificate Preview</DialogTitle>
          <DialogDescription>
            This is a preview of the certificate for {employee.name}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow bg-muted/50">
            <div className="flex-grow flex items-center justify-center overflow-hidden p-4" style={{ zoom: 0.8, padding: '20px 0'}}>
                <AwardCertificate award={award} employee={employee} />
            </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-2 flex-shrink-0 bg-background border-t">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
