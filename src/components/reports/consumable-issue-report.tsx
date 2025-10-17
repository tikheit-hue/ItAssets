
'use client';

import { useMemo, useState } from 'react';
import type { Consumable, IssueLog } from '@/app/consumables/page';
import type { Employee } from '@/app/employees/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, ArrowLeft, File as FileIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { useCompanyInfo } from '@/context/company-info-context';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

type ConsumableIssueReportProps = {
  consumables: Consumable[];
  employees: Employee[];
  onBack: () => void;
};

type IssueLogReportItem = {
    id: string;
    itemName: string;
    category: string;
    quantity: number;
    employeeName: string;
    issueDate: string;
    remarks: string;
    status: 'Active' | 'Reversed' | undefined;
}

export function ConsumableIssueReport({ consumables, employees, onBack }: ConsumableIssueReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { companyInfo } = useCompanyInfo();

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Unknown Employee';
  }

  const reportData = useMemo(() => {
    const allIssues: IssueLogReportItem[] = [];
    consumables.forEach(consumable => {
        (consumable.issueLog || []).forEach(log => {
            allIssues.push({
                id: log.id,
                itemName: consumable.name,
                category: consumable.category,
                quantity: log.quantity,
                employeeName: getEmployeeName(log.employeeId),
                issueDate: log.issueDate,
                remarks: log.remarks,
                status: log.status,
            });
        });
    });

    return allIssues
      .sort((a,b) => parseISO(b.issueDate).getTime() - parseISO(a.issueDate).getTime())
      .filter(item => {
        const searchLower = searchQuery.toLowerCase();
        return (
          item.itemName.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          item.employeeName.toLowerCase().includes(searchLower)
        );
      });
  }, [consumables, employees, searchQuery]);
  
  const handleExportCSV = () => {
    const headers = ['Issue Date', 'Item Name', 'Category', 'Quantity', 'Issued To', 'Remarks', 'Status'];
    
    const rows = reportData.map(item => [
        format(parseISO(item.issueDate), 'yyyy-MM-dd HH:mm'),
        item.itemName,
        item.category,
        item.quantity,
        item.employeeName,
        item.remarks,
        item.status || 'Active',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `consumable-issue-report-${new Date().toISOString().split('T')[0]}.csv`);
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
        doc.text('Consumable Item Issue Report', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.map(item => [
            format(parseISO(item.issueDate), 'yyyy-MM-dd HH:mm'),
            item.itemName,
            item.employeeName,
            item.quantity,
            item.status || 'Active'
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [['Date', 'Item Name', 'Issued To', 'Quantity', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`consumable-issue-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
                <CardTitle>Consumable Issue Report</CardTitle>
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
                placeholder="Search by item, employee, category..."
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
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Issued To</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map(item => (
                  <TableRow key={item.id} className={cn(item.status === 'Reversed' && 'text-muted-foreground')}>
                    <TableCell className={cn("font-medium", item.status === 'Reversed' && 'line-through')}>{item.itemName}</TableCell>
                    <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                    <TableCell>{item.employeeName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{format(parseISO(item.issueDate), 'PPP p')}</TableCell>
                    <TableCell>
                         <Badge variant={item.status === 'Reversed' ? 'destructive' : 'default'}>
                            {item.status || 'Active'}
                        </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No issue records found.
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
