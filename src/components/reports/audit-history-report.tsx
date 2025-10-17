
'use client';

import { useMemo, useState } from 'react';
import type { Asset } from '@/app/assets/index';
import type { Employee } from '@/app/employees/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, ArrowLeft, File as FileIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';
import { useCompanyInfo } from '@/context/company-info-context';

type AuditHistoryReportProps = {
  assets: Asset[];
  employees: Employee[];
  onBack: () => void;
};

type CombinedLog = {
    id: string;
    targetId: string;
    targetName: string;
    targetType: 'Asset' | 'Employee';
    date: string;
    action: string;
    details: string;
}

export function AuditHistoryReport({ assets, employees, onBack }: AuditHistoryReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { companyInfo } = useCompanyInfo();

  const reportData = useMemo(() => {
    const assetLogs: CombinedLog[] = assets.flatMap(asset => 
        asset.auditLog.map(log => ({
            ...log,
            targetId: asset.assetTag,
            targetName: `${asset.make} ${asset.model}`,
            targetType: 'Asset'
        }))
    );

    const employeeLogs: CombinedLog[] = employees.flatMap(employee => 
        (employee.auditLog || []).map(log => ({
            ...log,
            targetId: employee.employeeId,
            targetName: employee.name,
            targetType: 'Employee'
        }))
    );

    return [...assetLogs, ...employeeLogs]
        .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
        .filter(log => {
            if (typeFilter !== 'all' && log.targetType.toLowerCase() !== typeFilter) {
                return false;
            }
            const searchLower = searchQuery.toLowerCase();
            return (
                log.targetId.toLowerCase().includes(searchLower) ||
                log.targetName.toLowerCase().includes(searchLower) ||
                log.details.toLowerCase().includes(searchLower)
            )
        })

  }, [assets, employees, searchQuery, typeFilter]);
  
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Target ID', 'Target Name', 'Action', 'Details'];
    
    const rows = reportData.map(log => [
        format(parseISO(log.date), 'yyyy-MM-dd HH:mm'),
        log.targetType,
        log.targetId,
        log.targetName,
        log.action,
        log.details
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-history-report-${new Date().toISOString().split('T')[0]}.csv`);
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
        doc.text('Audit & History Report', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.map(log => [
            format(parseISO(log.date), 'yy-MM-dd HH:mm'),
            log.targetType,
            log.targetId,
            log.action,
            log.details
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [['Date', 'Type', 'Target ID', 'Action', 'Details']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
          columnStyles: { 4: { cellWidth: 'auto' } }
        });

        doc.save(`audit-history-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className='flex items-center gap-4'>
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <CardTitle>Audit & History Report</CardTitle>
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
        <div className="mt-4 flex flex-col md:flex-row gap-4">
            <Input 
                placeholder="Search by ID, name, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md relative h-[60vh] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(parseISO(log.date), 'Pp')}</TableCell>
                    <TableCell>
                        <Badge variant={log.targetType === 'Asset' ? 'secondary' : 'outline'}>
                            {log.targetType}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{log.targetName}</div>
                        <div className="text-xs text-muted-foreground">{log.targetId}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={
                            log.action === 'Created' ? 'default' : 
                            log.action === 'Updated' ? 'secondary' : 
                            'outline'
                        }>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No audit logs found.
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
