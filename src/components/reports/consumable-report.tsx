
'use client';

import { useMemo, useState } from 'react';
import type { Consumable } from '@/app/consumables/page';
import type { Vendor } from '@/app/vendors/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, ArrowLeft, File as FileIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { useCompanyInfo } from '@/context/company-info-context';
import { Badge } from '../ui/badge';

type ConsumableReportProps = {
  consumables: Consumable[];
  vendors: Vendor[];
  onBack: () => void;
};

export function ConsumableReport({ consumables, vendors, onBack }: ConsumableReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { companyInfo } = useCompanyInfo();

  const availableCategories = useMemo(() => {
    return Array.from(new Set(consumables.map(c => c.category).filter(Boolean)));
  }, [consumables]);

  const reportData = useMemo(() => {
    return consumables
      .map(item => {
          const vendor = vendors.find(v => v.id === item.vendorId);
          const totalCost = (item.costPerItem || 0) * item.quantity;
          return {
              ...item,
              vendorName: vendor?.name || 'N/A',
              totalCost,
          }
      })
      .filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower);

        const matchesCategory =
          categoryFilter === 'all' || item.category === categoryFilter;

        return matchesSearch && matchesCategory;
      });
  }, [consumables, vendors, searchQuery, categoryFilter]);
  
  const handleExportCSV = () => {
    const headers = ['Name', 'Category', 'Quantity', 'Unit', 'Purchase Date', 'Vendor', 'Cost per Item', 'Total Cost'];
    
    const rows = reportData.map(item => [
        item.name,
        item.category,
        item.quantity,
        item.unitType,
        format(parseISO(item.purchaseDate), 'yyyy-MM-dd'),
        item.vendorName,
        item.costPerItem?.toFixed(2) || '0.00',
        item.totalCost.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `consumables-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleExportPDF = () => {
    const generatePdf = (logoBase64?: string) => {
        const doc = new jsPDF();
        
        // jsPDF uses a limited font by default, so we may need to use a different one if characters are missing
        // For Rupee symbol, we will use a font that supports it.
        // This is a simple workaround. For full unicode, a library like pdfmake or a custom font integration is needed.
        doc.setFont('Helvetica');

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
        doc.text('Consumables Inventory Report', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.map(item => [
            item.name,
            item.category,
            item.quantity,
            item.vendorName,
            item.costPerItem ? `Rs. ${item.costPerItem.toFixed(2)}` : 'N/A',
            `Rs. ${item.totalCost.toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [['Name', 'Category', 'Quantity', 'Vendor', 'Cost/Item', 'Total Cost']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`consumables-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
                <CardTitle>Consumables Inventory Report</CardTitle>
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
                placeholder="Search by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
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
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Cost / Item</TableHead>
                <TableHead>Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                    <TableCell>{item.quantity} {item.unitType}</TableCell>
                    <TableCell>{format(parseISO(item.purchaseDate), 'PPP')}</TableCell>
                    <TableCell>{item.vendorName}</TableCell>
                    <TableCell>{item.costPerItem ? `₹${item.costPerItem.toFixed(2)}` : 'N/A'}</TableCell>
                    <TableCell>₹{item.totalCost.toFixed(2)}</TableCell>
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

    
