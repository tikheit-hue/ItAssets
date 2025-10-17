
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
import { useCompanyInfo } from '@/context/company-info-context';

type EmployeeAssetsReportProps = {
  employees: Employee[];
  assets: Asset[];
  onBack: () => void;
};

export function EmployeeAssetsReport({ employees, assets, onBack }: EmployeeAssetsReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const { companyInfo } = useCompanyInfo();

  const availableDepartments = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  }, [employees]);

  const reportData = useMemo(() => {
    return employees
      .map(employee => ({
        ...employee,
        assignedAssets: assets.filter(asset => asset.assignedTo === employee.id),
      }))
      .filter(employee => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          employee.name.toLowerCase().includes(searchLower) ||
          employee.employeeId.toLowerCase().includes(searchLower);

        const matchesDept =
          departmentFilter === 'all' || employee.department === departmentFilter;

        return matchesSearch && matchesDept;
      });
  }, [employees, assets, searchQuery, departmentFilter]);
  
  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Designation', 'Asset Tag', 'Asset Type', 'Make', 'Model', 'Serial Number'];
    
    const rows = reportData.flatMap(employee => {
      if (employee.assignedAssets.length === 0) {
        return [[employee.employeeId, employee.name, employee.department, employee.designation, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A']];
      }
      return employee.assignedAssets.map(asset => [
        employee.employeeId,
        employee.name,
        employee.department,
        employee.designation,
        asset.assetTag,
        asset.assetType,
        asset.make,
        asset.model,
        asset.serialNumber,
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
    link.setAttribute('download', `employee-assets-report-${new Date().toISOString().split('T')[0]}.csv`);
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
        doc.text('Employee & Assigned Assets Report', 14, finalY);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, finalY + 6);
        finalY += 12;

        const tableData = reportData.flatMap(employee => {
          if (employee.assignedAssets.length === 0) {
            return [[employee.name, employee.department, 'N/A', 'N/A', 'N/A']];
          }
          return employee.assignedAssets.map((asset, index) => 
            index === 0 
              ? [employee.name, employee.department, asset.assetTag, asset.make, asset.model, asset.serialNumber]
              : ['', '', asset.assetTag, asset.make, asset.model, asset.serialNumber]
          );
        });

        autoTable(doc, {
          startY: finalY,
          head: [['Employee', 'Department', 'Asset Tag', 'Make', 'Model', 'Serial Number']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`employee-assets-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
                <CardTitle>Employee & Assigned Assets Report</CardTitle>
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
                placeholder="Search by employee name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
             <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {availableDepartments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Asset Type</TableHead>
                <TableHead>Make &amp; Model</TableHead>
                <TableHead>Serial No.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map(employee => (
                  <TableRow key={employee.id} className={employee.assignedAssets.length > 1 ? 'border-b-2 border-primary/20' : ''}>
                    <TableCell 
                      className="font-medium align-top"
                      rowSpan={employee.assignedAssets.length || 1}
                    >
                      {employee.name}
                    </TableCell>
                    <TableCell 
                      className="align-top"
                      rowSpan={employee.assignedAssets.length || 1}
                    >
                      {employee.employeeId}
                    </TableCell>
                    <TableCell 
                      className="align-top"
                      rowSpan={employee.assignedAssets.length || 1}
                    >
                      {employee.department}
                    </TableCell>
                    {employee.assignedAssets.length > 0 ? (
                      <>
                        <TableCell>{employee.assignedAssets[0].assetTag}</TableCell>
                        <TableCell>{employee.assignedAssets[0].assetType}</TableCell>
                        <TableCell>{employee.assignedAssets[0].make} {employee.assignedAssets[0].model}</TableCell>
                        <TableCell>{employee.assignedAssets[0].serialNumber}</TableCell>
                      </>
                    ) : (
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No assets assigned
                      </TableCell>
                    )}
                  </TableRow>
                )).concat(
                  reportData.flatMap(employee =>
                    employee.assignedAssets.slice(1).map(asset => (
                      <TableRow key={asset.id} className="border-t-0">
                          <TableCell>{asset.assetTag}</TableCell>
                          <TableCell>{asset.assetType}</TableCell>
                          <TableCell>{asset.make} {asset.model}</TableCell>
                          <TableCell>{asset.serialNumber}</TableCell>
                      </TableRow>
                    ))
                  )
                )
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
