
"use client";

import type { Asset, Comment, AuditLog } from "@/app/assets/index";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Pencil, MessageSquare, History, PlusCircle, User, FileDown } from "lucide-react";
import { useState } from "react";
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useAuth } from "@/context/auth-context";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCompanyInfo } from "@/context/company-info-context";

type AssetDetailsDialogProps = {
  asset: Asset | null;
  employees: Employee[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (asset: Asset) => void;
  onAddComment: (assetId: string, commentText: string) => void;
};

// Simple text sanitizer
const sanitizeText = (text: string) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export function AssetDetailsDialog({ asset, employees, isOpen, onClose, onEdit, onAddComment }: AssetDetailsDialogProps) {
  const [commentText, setCommentText] = useState("");
  const { user } = useAuth();
  const { companyInfo } = useCompanyInfo();

  if (!asset) {
    return null;
  }
  
  const assignedEmployee = employees.find(emp => emp.id === asset.assignedTo);

  const handleEdit = () => {
    if (asset) {
      onEdit(asset);
    }
  };

  const handleAddComment = () => {
    if (asset && commentText.trim()) {
      onAddComment(asset.id, commentText);
      setCommentText(""); // Clear textarea after submitting
    }
  };

  const handleExportPDF = () => {
    if (!asset) return;
    
    const generatePdf = (logoBase64?: string) => {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        let yPos = 20;

        // Add Company Logo if it exists
        if (logoBase64) {
            const img = new Image();
            img.src = logoBase64;
            const imgWidth = 40;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(logoBase64, 'PNG', 14, 15, imgWidth, imgHeight);
            yPos = Math.max(yPos, 15 + imgHeight + 5);
        }

        // Add Company Info
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(companyInfo.name || 'AssetGuard', pageWidth - 14, 20, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const companyAddress = [
            companyInfo.addressStreet,
            `${companyInfo.addressCity}, ${companyInfo.addressState} ${companyInfo.addressPincode}`,
            companyInfo.addressCountry,
            companyInfo.email,
            companyInfo.contactNumber,
        ].filter(Boolean).join('\n');
        doc.text(companyAddress, pageWidth - 14, 25, { align: 'right' });

        // Report Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(`Asset Details: ${asset.assetTag}`, 14, yPos);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, yPos + 6);
        yPos += 12;

        const assetInfo = [
            { title: "Make", value: asset.make },
            { title: "Model", value: asset.model },
            { title: "Serial Number", value: asset.serialNumber },
            { title: "Asset Type", value: asset.assetType },
            { title: "Ownership", value: asset.ownership },
            { title: "Purchase From", value: asset.purchaseFrom },
            { title: "Assigned To", value: assignedEmployee?.name || "Unassigned" },
            { title: "Status", value: asset.status },
            { title: "Processor", value: asset.processor },
            { title: "RAM", value: asset.ram },
            { title: "Storage", value: asset.storage },
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Field', 'Value']],
            body: assetInfo.map(info => [info.title, info.value]),
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181] },
            didDrawPage: (data) => {
                // Header for subsequent pages
                if (data.pageNumber > 1) {
                    if (logoBase64) {
                        const img = new Image();
                        img.src = logoBase64;
                        const imgWidth = 40;
                        const imgHeight = (img.height * imgWidth) / img.width;
                        doc.addImage(logoBase64, 'PNG', 14, 12, imgWidth, imgHeight);
                    }
                    doc.setFontSize(14);
                    doc.setFont("helvetica", "bold");
                    doc.text(companyInfo.name || 'AssetGuard', pageWidth - 14, 20, { align: 'right' });
                }
            }
        });

        let currentY = (doc as any).lastAutoTable.finalY || yPos;

        const addTable = (title: string, head: any[], body: any[], startY: number) => {
            if (body.length > 0) {
                if (startY + 40 > pageHeight) { // check if space is enough for header and some rows
                    doc.addPage();
                    startY = 20;
                }
                doc.setFontSize(14);
                doc.text(title, 14, startY);
                autoTable(doc, {
                    startY: startY + 2,
                    head: head,
                    body: body,
                    theme: 'striped',
                    headStyles: { fillColor: [63, 81, 181] },
                });
                return (doc as any).lastAutoTable.finalY;
            }
            return startY;
        }

        currentY = addTable('Comments', [['Date', 'Comment']], asset.comments.map(c => [c.date ? format(parseISO(c.date), 'Pp') : 'N/A', c.text]), currentY + 10);
        currentY = addTable('Audit History', [['Date', 'Action', 'Details']], asset.auditLog.map(log => [log.date ? format(parseISO(log.date), 'Pp') : 'N/A', log.action, log.details]), currentY + 10);
        
        doc.save(`Asset-Details-${asset.assetTag}.pdf`);
    };

    if (companyInfo.logo) {
        const img = new Image();
        img.src = companyInfo.logo;
        img.onload = () => {
            generatePdf(companyInfo.logo);
        };
        img.onerror = () => {
            console.error("Failed to load company logo for PDF.");
            generatePdf(); 
        };
    } else {
        generatePdf();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Asset Details</DialogTitle>
          <DialogDescription>
            Full details, comments, and history for asset tag: {asset.assetTag}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            {/* Left Side: Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Asset Information</h3>
              <div className="grid gap-2 text-sm border p-4 rounded-md">
                  <DetailRow label="Make" value={asset.make} />
                  <DetailRow label="Model" value={asset.model} />
                  <DetailRow label="Asset Tag" value={asset.assetTag} />
                  <DetailRow label="Serial Number" value={asset.serialNumber} />
                  <DetailRow label="Asset Type" value={asset.assetType} />
                  <DetailRow label="Ownership" value={asset.ownership} />
                   <DetailRow label="Assigned To">
                    {assignedEmployee ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{assignedEmployee.name} ({assignedEmployee.employeeId})</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </DetailRow>
                  <DetailRow label="Purchase From" value={asset.purchaseFrom} />
                  <DetailRow label="Processor" value={asset.processor} />
                  <DetailRow label="RAM" value={asset.ram} />
                  <DetailRow label="Storage" value={asset.storage} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Asset
                </Button>
                 <Button variant="outline" onClick={handleExportPDF}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download PDF
                </Button>
              </div>
            </div>

            {/* Right Side: Comments & Audit Log */}
            <div className="space-y-6">
              {/* Comments Section */}
              <div>
                  <h3 className="font-semibold text-lg flex items-center mb-2">
                      <MessageSquare className="mr-2 h-5 w-5"/> Comments
                  </h3>
                  <div className="space-y-2">
                      <Textarea 
                          placeholder="Add a new comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                      />
                      <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Comment
                      </Button>
                  </div>
                  <Separator className="my-4" />
                  <ScrollArea className="h-40">
                      {asset.comments.length > 0 ? (
                          asset.comments.sort((a,b) => (b.date ? parseISO(b.date).getTime() : 0) - (a.date ? parseISO(a.date).getTime() : 0)).map(comment => (
                              <CommentEntry key={comment.id} comment={comment} userEmail={user?.email} />
                          ))
                      ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
                      )}
                  </ScrollArea>
              </div>

              {/* Audit Log Section */}
              <div>
                  <h3 className="font-semibold text-lg flex items-center mb-2">
                      <History className="mr-2 h-5 w-5"/> Audit Log
                  </h3>
                  <ScrollArea className="h-48 border rounded-md">
                    <div className="p-4 space-y-3">
                      {asset.auditLog.length > 0 ? (
                          asset.auditLog.sort((a,b) => (b.date ? parseISO(b.date).getTime() : 0) - (a.date ? parseISO(a.date).getTime() : 0)).map(log => (
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

const CommentEntry = ({ comment, userEmail }: { comment: Comment, userEmail: string | null | undefined}) => (
    <div className="text-sm mb-3">
        <p className="p-3 bg-muted rounded-md" dangerouslySetInnerHTML={{ __html: sanitizeText(comment.text) }} />
        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
            <span>By {userEmail || 'User'}</span>
            <time title={comment.date ? format(parseISO(comment.date), 'Pp') : 'No date'}>
              {comment.date && !isNaN(new Date(comment.date).getTime())
                ? format(parseISO(comment.date), 'Pp')
                : 'Unknown time'}
            </time>
        </div>
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
            <p className="text-xs text-muted-foreground/70 mt-1" title={log.date ? format(parseISO(log.date), 'Pp') : 'No date'}>
                 {log.date && !isNaN(new Date(log.date).getTime())
                ? format(parseISO(log.date), 'Pp')
                : 'Unknown time'}
            </p>
        </div>
    </div>
);
