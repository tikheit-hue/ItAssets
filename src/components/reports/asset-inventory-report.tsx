
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
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { useCompanyInfo } from '@/context/company-info-context';

type AssetInventoryReportProps = {
  assets: Asset[];
  employees: Employee[];
  onBack: () => void;
};

export function AssetInventoryReport({ assets, employees, onBack }: AssetInventoryReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { companyInfo } = useCompanyInfo();

  const reportData = useMemo(() => {
    return assets
      .filter(asset => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'assigned') return !!asset.assignedTo;
        if (statusFilter === 'unassigned') return !asset.assignedTo;
        return true;
      })
      .filter(asset => {
        const searchLower = searchQuery.toLowerCase();
        const employee = asset.assignedTo ? employees.find(e => e.id === asset.assignedTo) : null;
        return (
          asset.assetTag.toLowerCase().includes(searchLower) ||
          asset.serialNumber.toLowerCase().includes(searchLower) ||
          asset.make.toLowerCase().includes(searchLower) ||
          asset.model.toLowerCase().includes(searchLower) ||
          (employee && employee.name.toLowerCase().includes(searchLower))
        );
      });
  }, [assets, employees, searchQuery, statusFilter]);

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return <Badge variant="secondary">Unassigned</Badge>;
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : "Unknown";
  };
  
  const handleExportCSV = () => {
    const headers = ['Asset Tag', 'Asset Type', 'Make', 'Model', 'Serial Number', 'Ownership', 'Status', 'Assigned To'];
    
    const rows = reportData.map(asset => [
        asset.assetTag,
        asset.assetType,
        asset.make,
        asset.model,
        asset.serialNumber,
        asset.ownership,
        asset.assignedTo ? 'Assigned' : 'Unassigned',
        asset.assignedTo ? employees.find(e => e.id === asset.assignedTo)?.name || 'Unknown' : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `asset-inventory-report-${new Date().toISOString().split('T')[0]}.csv`);
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
        doc.text('Asset Inventory Report', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.map(asset => [
            asset.assetTag,
            asset.assetType,
            `${asset.make} ${asset.model}`,
            asset.serialNumber,
            asset.assignedTo ? 'Assigned' : 'Unassigned',
            asset.assignedTo ? employees.find(e => e.id === asset.assignedTo)?.name || 'Unknown' : 'N/A'
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [['Asset Tag', 'Type', 'Make & Model', 'Serial Number', 'Status', 'Assigned To']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`asset-inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
        <div className="flex justify-between items-center">
            <div className='flex items-center gap-4'>
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <CardTitle>Asset Inventory Report</CardTitle>
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
                placeholder="Search by tag, serial, make..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md relative h-[calc(60vh)] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b">
              <TableRow>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Make &amp; Model</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.assetTag}</TableCell>
                    <TableCell>{asset.assetType}</TableCell>
                    <TableCell>{asset.make} {asset.model}</TableCell>
                    <TableCell>{asset.serialNumber}</TableCell>
                    <TableCell>{asset.ownership}</TableCell>
                    <TableCell>
                        <Badge variant={asset.status === 'Assigned' ? 'default' : 'secondary'}>
                            {asset.status}
                        </Badge>
                    </TableCell>
                    <TableCell>{getEmployeeName(asset.assignedTo)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
