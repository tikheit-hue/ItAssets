
'use client';

import { useMemo, useState } from 'react';
import type { Software } from '@/app/software/index';
import type { Employee } from '@/app/employees/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, ArrowLeft, File as FileIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { useCompanyInfo } from '@/context/company-info-context';
import { Badge } from '../ui/badge';

type SoftwareAssignmentReportProps = {
  software: Software[];
  employees: Employee[];
  onBack: () => void;
};

export function SoftwareAssignmentReport({ software, employees, onBack }: SoftwareAssignmentReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { companyInfo } = useCompanyInfo();

  const reportData = useMemo(() => {
    return software
      .map(sw => ({
        ...sw,
        assignedEmployees: employees.filter(emp => sw.assignedTo.includes(emp.id)),
      }))
      .filter(sw => {
        const searchLower = searchQuery.toLowerCase();
        return (
          sw.name.toLowerCase().includes(searchLower) ||
          sw.assignedEmployees.some(emp => emp.name.toLowerCase().includes(searchLower))
        );
      });
  }, [software, employees, searchQuery]);
  
  const handleExportCSV = () => {
    const headers = ['Software Name', 'Version', 'Employee Name', 'Employee ID', 'Department'];
    
    const rows = reportData.flatMap(sw => {
      if (sw.assignedEmployees.length === 0) {
        return [[sw.name, sw.version, 'N/A', 'N/A', 'N/A']];
      }
      return sw.assignedEmployees.map(emp => [
        sw.name,
        sw.version,
        emp.name,
        emp.employeeId,
        emp.department,
      ]);
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `software-assignment-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleExportPDF = () => {
    const generatePdf = (logoBase64?: string) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        let finalY = 20;

        if (logoBase64) {
            const img = new Image();
            img.src = logoBase64;
            const imgWidth = 30;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(logoBase64, 'PNG', 14, 15, imgWidth, imgHeight);
            finalY = Math.max(finalY, 15 + imgHeight);
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

        finalY += 10;
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text('Software Assignment Report', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.flatMap(sw => {
          if (sw.assignedEmployees.length === 0) {
            return [[sw.name, 'N/A', 'N/A']];
          }
          return sw.assignedEmployees.map((emp, index) => 
            index === 0 
              ? [sw.name, emp.name, emp.department]
              : ['', emp.name, emp.department]
          );
        });

        autoTable(doc, {
          startY: finalY,
          head: [['Software', 'Assigned To', 'Department']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`software-assignment-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className='flex items-center gap-4'>
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <CardTitle>Software Assignment Report</CardTitle>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" onClick={handleExportCSV}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
                 <Button variant="outline" onClick={handleExportPDF}>
                    <FileIcon className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
            </div>
        </div>
        <div className="mt-4 flex gap-4">
            <Input 
                placeholder="Search by software or employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md relative h-[calc(60vh)] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b">
              <TableRow>
                <TableHead>Software</TableHead>
                <TableHead>Assigned Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Employee ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.flatMap(sw => {
                  if (sw.assignedEmployees.length === 0) {
                    return (
                      <TableRow key={sw.id}>
                        <TableCell className="font-medium">{sw.name} {sw.version}</TableCell>
                        <TableCell colSpan={3} className="text-muted-foreground text-center">No employees assigned</TableCell>
                      </TableRow>
                    );
                  }
                  return sw.assignedEmployees.map((emp, index) => (
                    <TableRow key={`${sw.id}-${emp.id}`}>
                      {index === 0 ? (
                        <TableCell rowSpan={sw.assignedEmployees.length} className="font-medium align-top border-b">
                          {sw.name} {sw.version}
                        </TableCell>
                      ) : null}
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>{emp.employeeId}</TableCell>
                    </TableRow>
                  ));
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
