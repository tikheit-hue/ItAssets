
'use client';

import { useMemo, useState } from 'react';
import type { Asset } from '@/app/assets/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, ArrowLeft, File as FileIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInYears, parseISO } from 'date-fns';
import { useCompanyInfo } from '@/context/company-info-context';

type AssetLifecycleReportProps = {
  assets: Asset[];
  onBack: () => void;
};

export function AssetLifecycleReport({ assets, onBack }: AssetLifecycleReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { companyInfo } = useCompanyInfo();

  const reportData = useMemo(() => {
    return assets.map(asset => {
        const createdLog = asset.auditLog.find(log => log.action === 'Created');
        const purchaseDate = createdLog ? parseISO(createdLog.date) : new Date();
        const age = differenceInYears(new Date(), purchaseDate);
        return {
            ...asset,
            purchaseDate,
            age
        }
    }).filter(asset => {
        const searchLower = searchQuery.toLowerCase();
        return (
          asset.assetTag.toLowerCase().includes(searchLower) ||
          asset.serialNumber.toLowerCase().includes(searchLower)
        );
      });
  }, [assets, searchQuery]);
  
  const handleExportCSV = () => {
    const headers = ['Asset Tag', 'Make', 'Model', 'Serial Number', 'Purchase Date', 'Age (Years)'];
    
    const rows = reportData.map(asset => [
        asset.assetTag,
        asset.make,
        asset.model,
        asset.serialNumber,
        format(asset.purchaseDate, 'yyyy-MM-dd'),
        asset.age
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `asset-lifecycle-report-${new Date().toISOString().split('T')[0]}.csv`);
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
        doc.text('Asset Lifecycle Report', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.map(asset => [
            asset.assetTag,
            `${asset.make} ${asset.model}`,
            asset.serialNumber,
            format(asset.purchaseDate, 'yyyy-MM-dd'),
            asset.age
        ]);

        autoTable(doc, {
          startY: finalY,
          head: [['Asset Tag', 'Make & Model', 'Serial Number', 'Purchase Date', 'Age (Years)']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`asset-lifecycle-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
                <CardTitle>Asset Lifecycle Report</CardTitle>
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
                placeholder="Search by asset tag or serial..."
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
                <TableHead>Asset Tag</TableHead>
                <TableHead>Make &amp; Model</TableHead>
                <TableHead>Serial No.</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Age (Years)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>{asset.assetTag}</TableCell>
                    <TableCell>{asset.make} {asset.model}</TableCell>
                    <TableCell>{asset.serialNumber}</TableCell>
                    <TableCell>{format(asset.purchaseDate, 'PPP')}</TableCell>
                    <TableCell>{asset.age}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
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
