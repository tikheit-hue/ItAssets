
'use client';

import { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@/app/employees/index';
import * as awardService from '@/services/award-service';
import { AwardsTable } from '@/components/awards/awards-table';
import { AddAwardForm, type AwardFormValues } from '@/components/awards/add-award-form';
import { AwardCertificate } from '@/components/awards/award-certificate';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSettings } from '@/context/settings-context';
import { AwardDetailsDialog } from '@/components/awards/award-details-dialog';
import { AwardCertificatePreviewDialog } from '@/components/awards/award-certificate-preview-dialog';
import { useAuth } from '@/context/auth-context';

export type Award = {
  id: string;
  name: string;
  type: 'Monthly' | 'Quarterly' | 'Annual' | 'Spot Award';
  employeeId: string;
  department: string;
  awardDate: string;
  awardedBy: string;
  reason: string;
  certificateTemplate: string;
  isLocked?: boolean;
};

type AwardsPageProps = {
    initialAwards?: Award[];
    initialEmployees?: Employee[];
};

export default function AwardsPageContent({ initialAwards = [], initialEmployees = [] }: AwardsPageProps) {
    const { toast } = useToast();
    const { sqlConfig, databaseProvider } = useSettings();
    const { tenantId } = useAuth();
    
    const [awards, setAwards] = useState(initialAwards);
    const [employees, setEmployees] = useState(initialEmployees);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAward, setEditingAward] = useState<Award | null>(null);
    const [viewingAward, setViewingAward] = useState<Award | null>(null);
    const [previewingAward, setPreviewingAward] = useState<Award | null>(null);
    
    const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

    const onDataChange = async () => {
        if (!tenantId) return;
        const [awardsData, employeesData] = await Promise.all([
            awardService.getAwards(databaseProvider, dbConfig, tenantId),
            employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
        ]);
        setAwards(awardsData);
        setEmployees(employeesData);
    };

    const handleFormOpenChange = (open: boolean) => {
        if (!open) {
            setEditingAward(null);
        }
        setIsFormOpen(open);
    };

    const handleSaveAward = async (data: AwardFormValues) => {
        if (!tenantId) return;
        try {
            const employee = employees.find(e => e.id === data.employeeId);
            if (!employee) throw new Error("Employee not found");

            const awardData: Omit<Award, 'id'> = {
                ...data,
                department: employee.department,
            };

            if (editingAward) {
                const updatedAward = { ...editingAward, ...awardData };
                await awardService.updateAward(databaseProvider, dbConfig, tenantId, updatedAward);
                toast({ title: "Award Updated", description: `${data.name} has been successfully updated.` });
            } else {
                const newAward: Award = { ...awardData, id: uuidv4(), isLocked: false };
                await awardService.addAward(databaseProvider, dbConfig, tenantId, newAward);
                toast({ title: "Award Added", description: `${data.name} has been successfully added.` });
            }
            setIsFormOpen(false);
            setEditingAward(null);
            onDataChange();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Something went wrong", description: error.message });
            throw error;
        }
    };

    const handleDeleteAward = async (award: Award) => {
        if (!tenantId) return;
        await awardService.deleteAward(databaseProvider, dbConfig, tenantId, award.id);
        toast({ title: "Award Deleted", description: `Award ${award.name} for ${employees.find(e => e.id === award.employeeId)?.name} has been deleted.` });
        onDataChange();
    };

    const handleLockAward = async (award: Award) => {
        if (!tenantId) return;
        const updatedAward = { ...award, isLocked: true };
        await awardService.updateAward(databaseProvider, dbConfig, tenantId, updatedAward);
        toast({ title: 'Award Locked', description: `The award "${award.name}" is now locked and cannot be edited or deleted.` });
        onDataChange();
    };
    
    const handleDownloadCertificate = async (award: Award) => {
        const certificateElement = document.getElementById(`certificate-${award.id}`);
        if (!certificateElement) {
            toast({ variant: 'destructive', title: 'Error', description: 'Certificate element not found.' });
            return;
        }

        // Temporarily make it visible for capture
        certificateElement.style.display = 'block';
        
        const canvas = await html2canvas(certificateElement, {
            scale: 3, // Increase resolution
            useCORS: true,
            backgroundColor: null,
        });

        // Hide it again
        certificateElement.style.display = 'none';

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        const employee = employees.find(e => e.id === award.employeeId);
        pdf.save(`Certificate-${award.name}-${employee?.name || 'employee'}.pdf`);
    };

    const handleEditAward = (award: Award) => {
        setViewingAward(null);
        setEditingAward(award);
        setIsFormOpen(true);
    };

    return (
        <>
            <div className="container mx-auto py-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Awards & Recognitions</h1>
                        <p className="text-muted-foreground">Nominate, approve, and manage employee awards.</p>
                    </div>
                    <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
                        <Button onClick={() => { setEditingAward(null); setIsFormOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Award
                        </Button>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{editingAward ? 'Edit Award' : 'Create New Award'}</DialogTitle>
                                <DialogDescription>Fill in the details to formally recognize an employee.</DialogDescription>
                            </DialogHeader>
                            <AddAwardForm
                                onSave={handleSaveAward}
                                initialData={editingAward}
                                onDone={() => handleFormOpenChange(false)}
                                employees={employees}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                <AwardsTable 
                    awards={awards}
                    employees={employees}
                    onEdit={(award) => { setEditingAward(award); setIsFormOpen(true); }}
                    onDelete={handleDeleteAward}
                    onDownloadCertificate={handleDownloadCertificate}
                    onView={setViewingAward}
                    onPreviewCertificate={setPreviewingAward}
                    onLock={handleLockAward}
                />
            </div>
             {/* Hidden certificates for PDF generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {awards.map(award => {
                    const employee = employees.find(e => e.id === award.employeeId);
                    if (!employee) return null;
                    return (
                        <div key={`cert-hidden-${award.id}`} id={`certificate-${award.id}`}>
                            <AwardCertificate award={award} employee={employee} />
                        </div>
                    );
                })}
            </div>

            <AwardDetailsDialog
                award={viewingAward}
                employee={viewingAward ? employees.find(e => e.id === viewingAward.employeeId) : undefined}
                isOpen={!!viewingAward}
                onClose={() => setViewingAward(null)}
                onEdit={handleEditAward}
            />

            <AwardCertificatePreviewDialog
                award={previewingAward}
                employee={previewingAward ? employees.find(e => e.id === previewingAward.employeeId) : undefined}
                isOpen={!!previewingAward}
                onClose={() => setPreviewingAward(null)}
            />
        </>
    );
}
