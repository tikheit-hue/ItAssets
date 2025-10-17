
"use client";

import type { Employee } from "@/app/employees/index";
import type { Asset, Comment, AuditLog } from "@/app/assets/index";
import type { Award } from "@/app/awards/page";
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
import { Badge } from "@/components/ui/badge";
import { Pencil, Laptop, CircleAlert, MessageSquare, History, PlusCircle, FileDown, Award as AwardIcon, Trophy } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Separator } from "./ui/separator";
import { useState, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCompanyInfo } from "@/context/company-info-context";
import * as employeeService from '@/services/employee-service';
import { useSettings } from "@/context/settings-context";

type EmployeeDetailsDialogProps = {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
  assignedAssets: Asset[];
  onViewAsset: (asset: Asset) => void;
  onAddComment: (employeeId: string, commentText: string) => void;
  awards: Award[];
};

// Simple text sanitizer
const sanitizeText = (text: string) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

type ActivityItem = (Comment & { type: 'comment' }) | (AuditLog & { type: 'log' });


export function EmployeeDetailsDialog({ employee, isOpen, onClose, onEdit, assignedAssets, onViewAsset, onAddComment, awards }: EmployeeDetailsDialogProps) {
  const [commentText, setCommentText] = useState("");
  const { user } = useAuth();
  const { companyInfo } = useCompanyInfo();

  const combinedActivity = useMemo(() => {
    if (!employee) return [];
    
    const comments: ActivityItem[] = (employee.comments || []).map(c => ({ ...c, type: 'comment' }));
    const auditLogs: ActivityItem[] = (employee.auditLog || []).map(l => ({ ...l, type: 'log' }));

    return [...comments, ...auditLogs].sort((a, b) => {
        const dateA = a.date ? parseISO(a.date).getTime() : 0;
        const dateB = b.date ? parseISO(b.date).getTime() : 0;
        return dateB - dateA;
    });
  }, [employee]);
  
  if (!employee) {
    return null;
  }

  const handleEdit = () => {
    if (employee) {
      onEdit(employee);
    }
  };

  const handleViewAsset = (asset: Asset) => {
    onClose(); // Close current dialog
    onViewAsset(asset); // Open asset dialog
  };

  const handleAddComment = () => {
    if (employee && commentText.trim()) {
      onAddComment(employee.id, commentText);
      setCommentText(""); // Clear textarea after submitting
    }
  };

  const handleExportPDF = () => {
    if (!employee) return;
    
    const generatePdf = (logoBase64?: string) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        let yPos = 20;

        if (logoBase64) {
            const img = new Image();
            img.src = logoBase64;
            const imgWidth = 40;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(logoBase64, 'PNG', 14, 15, imgWidth, imgHeight);
            yPos = Math.max(yPos, 15 + imgHeight + 5);
        }

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

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(`Employee Details: ${employee.name}`, 14, yPos);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, yPos + 6);
        yPos += 12;

        const employeeInfo = [
            { title: "Employee ID", value: employee.employeeId },
            { title: "Full Name", value: employee.name },
            { title: "Department", value: employee.department },
            { title: "Designation", value: employee.designation },
            { title: "Email", value: employee.email },
            { title: "Phone", value: employee.phone },
            { title: "Joining Date", value: format(new Date(employee.joiningDate), 'PPP') },
            { title: "Status", value: employee.status },
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Field', 'Value']],
            body: employeeInfo.map(info => [info.title, info.value]),
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181] },
             didDrawPage: (data) => {
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
                if (startY + 40 > doc.internal.pageSize.height) { // check if space is enough for header and some rows
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
        };

        const assetsWithIssueDate = assignedAssets.map(asset => {
            const assignmentLogs = (asset.auditLog || [])
                .filter(log => log.details.includes(`'assignedTo' from`) && log.details.includes(`to '${employee.name}'`))
                .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
            
            const issueDate = assignmentLogs.length > 0 ? format(parseISO(assignmentLogs[0].date), 'PPP') : 'N/A';
            return {
                ...asset,
                issueDate
            };
        });

        currentY = addTable('Assigned Assets', [['Asset Tag', 'Make', 'Model', 'Serial No.', 'Issue Date']], assetsWithIssueDate.map(a => [a.assetTag, a.make, a.model, a.serialNumber, a.issueDate]), currentY + 10);
        currentY = addTable('Awards & Recognitions', [['Award Name', 'Type', 'Date']], (awards || []).map(a => [a.name, a.type, format(parseISO(a.awardDate), 'PPP')]), currentY + 10);
        
        const activityForPdf = combinedActivity.map(item => {
            const date = item.date ? format(parseISO(item.date), 'Pp') : 'N/A';
            if (item.type === 'comment') {
                return [date, 'Comment', item.text];
            } else {
                return [date, item.action, item.details];
            }
        });
        currentY = addTable('Activity', [['Date', 'Type/Action', 'Details']], activityForPdf, currentY + 10);
        
        doc.save(`Employee-Details-${employee.name.replace(/\s/g, '_')}.pdf`);
    };
    
    if (companyInfo.logo) {
        const img = new Image();
        img.src = companyInfo.logo;
        img.onload = () => generatePdf(companyInfo.logo);
        img.onerror = () => generatePdf();
    } else {
        generatePdf();
    }
  };

  const handleExportExitCertificatePDF = () => {
    if (!employee) return;

    const generatePdf = (logoBase64?: string) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        let yPos = 20;

        // Add a border
        doc.setLineWidth(0.5);
        doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

        // Header
        if (logoBase64) {
            const img = new Image();
            img.src = logoBase64;
            const imgWidth = 35;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(logoBase64, 'PNG', (pageWidth - imgWidth) / 2, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 5;
        }
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(companyInfo.name || 'Your Company Name', pageWidth / 2, yPos, { align: 'center' });
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const fullAddress = [companyInfo.addressStreet, companyInfo.addressCity, companyInfo.addressState, companyInfo.addressPincode, companyInfo.addressCountry].filter(Boolean).join(', ');
        doc.text(fullAddress, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Title
        doc.setFontSize(22);
        doc.setFont("times", "bold");
        doc.text("Certificate of Clearance", pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        
        // Date
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${format(new Date(), 'PPP')}`, pageWidth - 20, yPos, { align: 'right' });
        yPos += 20;
        
        // Body
        const bodyText = `This is to certify that ${employee.name} (Employee ID: ${employee.employeeId}), formerly employed as a ${employee.designation}, has completed all exit formalities and has cleared all outstanding dues with the company as of their last working day.

The employee's tenure with the company was from ${format(new Date(employee.joiningDate), 'PPP')} to ${employee.exitDate ? format(parseISO(employee.exitDate), 'PPP') : 'N/A'}.

All company property and assets assigned to the employee have been returned in satisfactory condition. There are no outstanding financial obligations between the employee and the company.

We wish ${employee.name} all the best in their future endeavors.`;
        
        doc.setFontSize(12);
        const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
        doc.text(splitBody, 20, yPos);
        yPos += (splitBody.length * 7) + 30;
        
        // Signature section
        const signatureY = pageHeight - 60;
        doc.line(20, signatureY, 90, signatureY);
        doc.text("HR Manager", 20, signatureY + 8);
        doc.text(companyInfo.name || 'Your Company Name', 20, signatureY + 13);


        doc.line(pageWidth - 90, signatureY, pageWidth - 20, signatureY);
        doc.text("Department Head", pageWidth - 90, signatureY + 8);
        
        doc.save(`Exit-Clearance-${employee.name.replace(/\s/g, '_')}.pdf`);
    };

    if (companyInfo.logo) {
        const img = new Image();
        img.src = companyInfo.logo;
        img.onload = () => generatePdf(companyInfo.logo);
        img.onerror = () => generatePdf();
    } else {
        generatePdf();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
          <DialogDescription>
            Full details for {employee.name} ({employee.employeeId})
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {/* Column 1: Employee Info */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-semibold text-lg">Employee Information</h3>
              <div className="grid gap-2 text-sm border p-4 rounded-md">
                  <DetailRow label="Employee ID" value={employee.employeeId} />
                  <DetailRow label="Full Name" value={employee.name} />
                  <DetailRow label="Department" value={employee.department} />
                  <DetailRow label="Designation" value={employee.designation} />
                  <DetailRow label="Email" value={employee.email} />
                  <DetailRow label="Phone" value={employee.phone} />
                  <DetailRow label="Joining Date" value={format(new Date(employee.joiningDate), 'PPP')} />
                  <DetailRow label="Status">
                     <Badge variant={employee.status === 'Active' ? 'default' : 'destructive'}>{employee.status}</Badge>
                  </DetailRow>
                  {employee.status === 'Inactive' && (
                    <>
                        <DetailRow label="Exit Date" value={employee.exitDate ? format(parseISO(employee.exitDate), 'PPP') : 'N/A'} />
                        <DetailRow label="Exit Reason" value={employee.exitReason || 'N/A'} />
                    </>
                  )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Employee
                </Button>
                <Button variant="outline" onClick={handleExportPDF}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Details
                </Button>
                {employee.status === 'Inactive' && (
                  <Button variant="outline" onClick={handleExportExitCertificatePDF}>
                      <AwardIcon className="mr-2 h-4 w-4" />
                      Download Certificate
                  </Button>
                )}
              </div>
            </div>
            
            {/* Column 2: Assigned Assets & Awards */}
            <div className="lg:col-span-1 space-y-6">
                <div>
                    <h3 className="font-semibold text-lg mb-2">Assigned Assets ({assignedAssets.length})</h3>
                    <div className="border rounded-md">
                        <ScrollArea className="h-40">
                            <div className="p-4 space-y-3">
                            {assignedAssets.length > 0 ? (
                                assignedAssets.map(asset => (
                                <div 
                                    key={asset.id} 
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                                    onClick={() => handleViewAsset(asset)}
                                >
                                    <Laptop className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1 text-sm">
                                    <p className="font-medium">{asset.make} {asset.model}</p>
                                    <p className="text-xs text-muted-foreground">Tag: {asset.assetTag}</p>
                                    </div>
                                </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <CircleAlert className="mx-auto h-8 w-8 text-muted-foreground" />
                                    <p className="mt-2 text-sm text-muted-foreground">No assets assigned.</p>
                                </div>
                            )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-lg mb-2">Awards & Recognitions ({awards.length})</h3>
                    <div className="border rounded-md">
                        <ScrollArea className="h-40">
                            <div className="p-4 space-y-3">
                            {awards.length > 0 ? (
                                awards.map(award => (
                                <div key={award.id} className="flex items-center gap-3 p-2 rounded-md">
                                    <Trophy className="h-5 w-5 text-amber-500" />
                                    <div className="flex-1 text-sm">
                                    <p className="font-medium">{award.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {award.type} - {format(parseISO(award.awardDate), 'PPP')}
                                    </p>
                                    </div>
                                </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <CircleAlert className="mx-auto h-8 w-8 text-muted-foreground" />
                                    <p className="mt-2 text-sm text-muted-foreground">No awards found.</p>
                                </div>
                            )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </div>

            {/* Column 3: Activity Feed */}
            <div className="lg:col-span-1 space-y-6">
                <div>
                <h3 className="font-semibold text-lg flex items-center mb-2">
                    <History className="mr-2 h-5 w-5"/> Activity
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
                <ScrollArea className="h-80">
                    <div className="pr-4 space-y-4">
                    {combinedActivity.length > 0 ? (
                        combinedActivity.map(item =>
                            item.type === 'comment'
                                ? <CommentEntry key={`comment-${item.id}`} comment={item} userEmail={user?.email}/>
                                : <LogEntry key={`log-${item.id}`} log={item} />
                        )
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
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
    <div className="col-span-2 break-words">
        {value}
        {children}
    </div>
  </div>
);

const CommentEntry = ({ comment, userEmail }: { comment: Comment, userEmail: string | null | undefined}) => (
    <div className="text-sm">
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
                log.action === 'Created' || log.action === 'Exited' ? 'default' : 
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



    

    