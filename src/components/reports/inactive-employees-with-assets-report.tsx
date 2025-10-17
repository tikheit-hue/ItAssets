
'use client';

import { useMemo, useState } from 'react';
import type { Asset } from '@/app/assets/index';
import type { Employee } from '@/app/employees/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, ArrowLeft, File as FileIcon, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { useCompanyInfo } from '@/context/company-info-context';

type InactiveEmployeesWithAssetsReportProps = {
  employees: Employee[];
  assets: Asset[];
  onBack: () => void;
};

export function InactiveEmployeesWithAssetsReport({ employees, assets, onBack }: InactiveEmployeesWithAssetsReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { companyInfo } = useCompanyInfo();

  const reportData = useMemo(() => {
    // 1. Find all inactive employees
    const inactiveEmployees = employees.filter(e => e.status === 'Inactive');
    
    // 2. Create a map of assets by assignedTo ID for quick lookup
    const assetsByEmployee = new Map<string, Asset[]>();
    assets.forEach(asset => {
      if (asset.assignedTo) {
        if (!assetsByEmployee.has(asset.assignedTo)) {
          assetsByEmployee.set(asset.assignedTo, []);
        }
        assetsByEmployee.get(asset.assignedTo)!.push(asset);
      }
    });

    // 3. Filter inactive employees to find those who still have assets
    return inactiveEmployees
      .map(employee => ({
        ...employee,
        assignedAssets: assetsByEmployee.get(employee.id) || [],
      }))
      .filter(employee => employee.assignedAssets.length > 0)
      .filter(employee => { // Apply search query
        const searchLower = searchQuery.toLowerCase();
        return (
          employee.name.toLowerCase().includes(searchLower) ||
          employee.employeeId.toLowerCase().includes(searchLower) ||
          employee.assignedAssets.some(a => a.assetTag.toLowerCase().includes(searchLower))
        );
      });
  }, [employees, assets, searchQuery]);
  
  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Exit Date', 'Asset Tag', 'Asset Type', 'Make', 'Model'];
    
    const rows = reportData.flatMap(employee => 
        employee.assignedAssets.map(asset => [
            employee.employeeId,
            employee.name,
            employee.department,
            employee.exitDate ? format(parseISO(employee.exitDate), 'yyyy-MM-dd') : 'N/A',
            asset.assetTag,
            asset.assetType,
            asset.make,
            asset.model,
        ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inactive-employees-with-assets-report-${new Date().toISOString().split('T')[0]}.csv`);
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
        doc.text('Inactive Employees With Assigned Assets', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.flatMap(employee => {
          const exitDate = employee.exitDate ? format(parseISO(employee.exitDate), 'yyyy-MM-dd') : 'N/A';
          return employee.assignedAssets.map((asset, index) => 
            index === 0 
              ? [employee.name, exitDate, asset.assetTag, `${asset.make} ${asset.model}`]
              : ['', '', asset.assetTag, `${asset.make} ${asset.model}`]
          );
        });

        autoTable(doc, {
          startY: finalY,
          head: [['Employee', 'Exit Date', 'Assigned Asset Tag', 'Make & Model']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`inactive-employees-with-assets-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
                <div>
                    <CardTitle>Inactive Employees Holding Assets</CardTitle>
                    <CardDescription>This report lists inactive employees who still have assets assigned to them. Action may be required.</CardDescription>
                </div>
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
                placeholder="Search by employee or asset tag..."
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
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Exit Date</TableHead>
                <TableHead>Assigned Asset</TableHead>
                <TableHead>Asset Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.flatMap(employee => 
                    employee.assignedAssets.map((asset, index) => (
                        <TableRow key={`${employee.id}-${asset.id}`} className={index === 0 ? "border-t-2" : ""}>
                            {index === 0 ? (
                                <>
                                    <TableCell rowSpan={employee.assignedAssets.length} className="font-medium align-top">{employee.name}</TableCell>
                                    <TableCell rowSpan={employee.assignedAssets.length} className="align-top">{employee.employeeId}</TableCell>
                                    <TableCell rowSpan={employee.assignedAssets.length} className="align-top">{employee.department}</TableCell>
                                    <TableCell rowSpan={employee.assignedAssets.length} className="align-top">{employee.exitDate ? format(parseISO(employee.exitDate), 'PPP') : 'N/A'}</TableCell>
                                </>
                            ) : null}
                            <TableCell>{asset.assetTag}</TableCell>
                            <TableCell>{asset.make} {asset.model}</TableCell>
                        </TableRow>
                    ))
                )
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-yellow-500" />
                        <span>No inactive employees with assigned assets found.</span>
                    </div>
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
