
'use client';

import { useMemo, useState } from 'react';
import type { Software } from '@/app/software/index';
import type { Vendor } from '@/app/vendors/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, ArrowLeft, File as FileIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, isValid } from 'date-fns';
import { useCompanyInfo } from '@/context/company-info-context';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

type SoftwareInventoryReportProps = {
  software: Software[];
  vendors: Vendor[];
  onBack: () => void;
};

export function SoftwareInventoryReport({ software, vendors, onBack }: SoftwareInventoryReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { companyInfo } = useCompanyInfo();

  const reportData = useMemo(() => {
    return software
      .map(item => {
          const vendor = vendors.find(v => v.id === item.vendorId);
          return {
              ...item,
              vendorName: vendor?.name || 'N/A',
          }
      })
      .filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(searchLower) ||
          item.vendorName.toLowerCase().includes(searchLower);

        const matchesStatus =
          statusFilter === 'all' || item.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
  }, [software, vendors, searchQuery, statusFilter]);
  
  const handleExportCSV = () => {
    const headers = ['Name', 'Version', 'Status', 'License Type', 'Vendor', 'Purchase Date', 'Expiry Date', 'Total Licenses', 'Assigned Licenses'];
    
    const rows = reportData.map(item => [
        item.name,
        item.version,
        item.status,
        item.licenseType,
        item.vendorName,
        isValid(parseISO(item.purchaseDate)) ? format(parseISO(item.purchaseDate), 'yyyy-MM-dd') : 'N/A',
        item.expiryDate && isValid(parseISO(item.expiryDate)) ? format(parseISO(item.expiryDate), 'yyyy-MM-dd') : 'N/A',
        item.totalLicenses,
        item.assignedTo.length,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `software-inventory-report-${new Date().toISOString().split('T')[0]}.csv`);
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
        doc.text('Software Inventory Report', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.map(item => [
            item.name,
            item.status,
            item.licenseType,
            item.vendorName,
            `${item.assignedTo.length} / ${item.totalLicenses}`,
            item.expiryDate && isValid(parseISO(item.expiryDate)) ? format(parseISO(item.expiryDate), 'yyyy-MM-dd') : 'Perpetual',
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [['Name', 'Status', 'Type', 'Vendor', 'Usage', 'Expires']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`software-inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
                <CardTitle>Software Inventory Report</CardTitle>
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
                placeholder="Search by name or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Renewed">Renewed</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md relative h-[calc(60vh)] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>License Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name} {item.version}</TableCell>
                    <TableCell><Badge variant={item.status === 'Expired' ? 'destructive' : 'default'}>{item.status}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{item.licenseType}</Badge></TableCell>
                    <TableCell>{item.vendorName}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <span>{item.assignedTo.length}/{item.totalLicenses}</span>
                            {item.totalLicenses > 0 && <Progress value={(item.assignedTo.length / item.totalLicenses) * 100} className="w-20" />}
                        </div>
                    </TableCell>
                    <TableCell>{item.expiryDate && isValid(parseISO(item.expiryDate)) ? format(parseISO(item.expiryDate), 'PPP') : 'Perpetual'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
