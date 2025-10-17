
'use client';

import { useState, useMemo } from 'react';
import type { Asset } from '@/app/assets/index';
import type { Employee } from '@/app/employees/index';
import type { Software } from '@/app/software/index';
import type { Consumable } from '@/app/consumables/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, File as FileIcon, Columns, PlusCircle, Trash2, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { useCompanyInfo } from '@/context/company-info-context';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, isValid } from 'date-fns';

type AllData = {
  assets: Asset[];
  employees: Employee[];
  software: Software[];
  consumables: Consumable[];
  vendors: any[];
};

type CustomReportGeneratorProps = {
  allData: AllData;
  onBack: () => void;
};

type DataSource = 'Assets' | 'Employees' | 'Software' | 'Consumables';

type ColumnDefinition = {
    label: string;
    key: keyof any;
    type: 'string' | 'number' | 'date' | 'boolean' | 'array';
};

const COLUMN_DEFINITIONS: Record<DataSource, ColumnDefinition[]> = {
  Assets: [
    { label: 'Asset Tag', key: 'assetTag', type: 'string' },
    { label: 'Make', key: 'make', type: 'string' },
    { label: 'Model', key: 'model', type: 'string' },
    { label: 'Serial Number', key: 'serialNumber', type: 'string' },
    { label: 'Status', key: 'status', type: 'string' },
    { label: 'Asset Type', key: 'assetType', type: 'string' },
    { label: 'Assigned To', key: 'assignedTo', type: 'string' },
    { label: 'Purchase From', key: 'purchaseFrom', type: 'string' },
    { label: 'Ownership', key: 'ownership', type: 'string' },
    { label: 'Processor', key: 'processor', type: 'string' },
    { label: 'RAM', key: 'ram', type: 'string' },
    { label: 'Storage', key: 'storage', type: 'string' },
  ],
  Employees: [
    { label: 'Employee ID', key: 'employeeId', type: 'string' },
    { label: 'Name', key: 'name', type: 'string' },
    { label: 'Department', key: 'department', type: 'string' },
    { label: 'Designation', key: 'designation', type: 'string' },
    { label: 'Email', key: 'email', type: 'string' },
    { label: 'Status', key: 'status', type: 'string' },
    // { label: 'Role', key: 'role', type: 'string' }, // Role is not in the Employee model
    { label: 'Joining Date', key: 'joiningDate', type: 'date' },
  ],
  Software: [
    { label: 'Name', key: 'name', type: 'string'},
    { label: 'Version', key: 'version', type: 'string'},
    { label: 'Status', key: 'status', type: 'string'},
    { label: 'License Type', key: 'licenseType', type: 'string'},
    { label: 'Vendor', key: 'vendorId', type: 'string' },
    { label: 'Total Licenses', key: 'totalLicenses', type: 'number'},
    { label: 'Assigned Licenses', key: 'assignedTo', type: 'array'},
    { label: 'Purchase Date', key: 'purchaseDate', type: 'date' },
    { label: 'Expiry Date', key: 'expiryDate', type: 'date' },
  ],
   Consumables: [
    { label: 'Name', key: 'name', type: 'string'},
    { label: 'Category', key: 'category', type: 'string'},
    { label: 'Quantity', key: 'quantity', type: 'number'},
    { label: 'Unit Type', key: 'unitType', type: 'string'},
    { label: 'Vendor', key: 'vendorId', type: 'string' },
    { label: 'Purchase Date', key: 'purchaseDate', type: 'date'},
    { label: 'Cost Per Item', key: 'costPerItem', type: 'number' },
  ]
};

const OPERATORS = {
    string: ['equals', 'contains', 'starts with', 'ends with'],
    number: ['=', '!=', '>', '<', '>=', '<='],
    date: ['is', 'is not', 'is after', 'is before'],
    boolean: ['is'],
    array: ['contains', 'does not contain', 'is empty', 'is not empty'],
};

type Filter = {
    id: string;
    column: string;
    operator: string;
    value: string;
}

export function CustomReportGenerator({ allData, onBack }: CustomReportGeneratorProps) {
  const [dataSource, setDataSource] = useState<DataSource>('Assets');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(COLUMN_DEFINITIONS['Assets'].map(c => c.key as string));
  const [filters, setFilters] = useState<Filter[]>([]);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const { companyInfo } = useCompanyInfo();

  const currentColumnDefs = COLUMN_DEFINITIONS[dataSource];

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    setSelectedColumns(COLUMN_DEFINITIONS[source].map(c => c.key as string));
    setFilters([]);
    setReportData(null);
  };

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleAddFilter = () => {
    setFilters(prev => [...prev, {id: crypto.randomUUID(), column: currentColumnDefs[0].key as string, operator: OPERATORS[currentColumnDefs[0].type][0], value: ''}]);
  }

  const handleRemoveFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  }

  const handleFilterChange = (id: string, field: 'column' | 'operator' | 'value', newValue: string) => {
    setFilters(prev => prev.map(f => {
      if (f.id === id) {
        if (field === 'column') {
          const newColType = currentColumnDefs.find(c => c.key === newValue)?.type || 'string';
          return { ...f, [field]: newValue, operator: OPERATORS[newColType][0] };
        }
        return { ...f, [field]: newValue };
      }
      return f;
    }));
  }
  
  const generateReport = () => {
    let data = [...allData[dataSource.toLowerCase() as keyof AllData]];

    if (dataSource === 'Assets') {
      data = (data as Asset[]).map(asset => {
        const employee = allData.employees.find(e => e.id === asset.assignedTo);
        return {
          ...asset,
          assignedTo: employee ? employee.name : (asset.assignedTo ? 'Unknown User' : 'N/A'),
        };
      });
    }
     if (dataSource === 'Software') {
      data = (data as Software[]).map(item => {
        const vendor = allData.vendors.find(v => v.id === item.vendorId);
        return {
          ...item,
          vendorId: vendor ? vendor.name : 'N/A', // Replace ID with name
          assignedTo: item.assignedTo.length, // Show count instead of IDs
        };
      });
    }

     if (dataSource === 'Consumables') {
      data = (data as Consumable[]).map(item => {
        const vendor = allData.vendors.find(v => v.id === item.vendorId);
        return {
          ...item,
          vendorId: vendor ? vendor.name : 'N/A', // Replace ID with name
        };
      });
    }


    const processedData = data.filter(row => {
        return filters.every(filter => {
            const rowValue = row[filter.column as keyof typeof row];
            const filterValue = filter.value;

            if (rowValue === null || rowValue === undefined) return false;

            const colType = currentColumnDefs.find(c => c.key === filter.column)?.type || 'string';

            switch (colType) {
                case 'string':
                    const rv = String(rowValue).toLowerCase();
                    const fv = String(filterValue).toLowerCase();
                    if (filter.operator === 'equals') return rv === fv;
                    if (filter.operator === 'contains') return rv.includes(fv);
                    if (filter.operator === 'starts with') return rv.startsWith(fv);
                    if (filter.operator === 'ends with') return rv.endsWith(fv);
                    break;
                case 'number':
                    const rvn = Number(rowValue);
                    const fvn = Number(filterValue);
                    if (isNaN(rvn) || isNaN(fvn)) return false;
                    if (filter.operator === '=') return rvn === fvn;
                    if (filter.operator === '!=') return rvn !== fvn;
                    if (filter.operator === '>') return rvn > fvn;
                    if (filter.operator === '<') return rvn < fvn;
                    if (filter.operator === '>=') return rvn >= fvn;
                    if (filter.operator === '<=') return rvn <= fvn;
                    break;
                // Add more type handlers here...
                default: return true;
            }
            return true;
        });
    });

    setReportData(processedData);
  }

  const handleExportCSV = () => {
    if (!reportData) return;
    const headers = selectedColumns.map(key => currentColumnDefs.find(c => c.key === key)?.label || key);
    
    const rows = reportData.map(row => 
        selectedColumns.map(colKey => {
            let value = row[colKey];
            if (Array.isArray(value)) return value.length;
            return value;
        }).map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`)
    );

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-t-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custom-report-${dataSource.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    
    const generatePdf = (logoBase64?: string) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        let yPos = 20;

        // Draw header
        if (logoBase64) {
            try {
                const img = new Image();
                img.src = logoBase64;
                const imgWidth = 30; 
                const imgHeight = (img.height * imgWidth) / img.width || 15;
                doc.addImage(logoBase64, 'PNG', 14, 15, imgWidth, imgHeight);
                yPos = Math.max(yPos, 15 + imgHeight + 10);
            } catch (e) {
                console.error("Error adding logo to PDF:", e);
            }
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

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(`Custom Report: ${dataSource}`, 14, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, yPos);
        yPos += 12;

        const headers = selectedColumns.map(key => currentColumnDefs.find(c => c.key === key)?.label || key);
        const body = reportData.map(row => selectedColumns.map(colKey => {
            let value = row[colKey];
            if (Array.isArray(value)) return value.length;
            if (value && currentColumnDefs.find(c => c.key === colKey)?.type === 'date' && isValid(parseISO(value))) {
                return format(parseISO(value), 'PPP');
            }
            return String(value ?? 'N/A');
        }));

        autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181] },
        });

        doc.save(`custom-report-${dataSource.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (companyInfo.logo) {
        try {
            const img = new Image();
            img.src = companyInfo.logo;
            img.onload = () => generatePdf(companyInfo.logo);
            img.onerror = () => generatePdf();
        } catch (e) {
            console.error("Error loading image for PDF, generating without logo.", e);
            generatePdf();
        }
    } else {
        generatePdf();
    }
  };


  const renderValueForCell = (row: any, columnKey: string) => {
    let value = row[columnKey];
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return value.length;
    if (currentColumnDefs.find(c => c.key === columnKey)?.type === 'date' && isValid(parseISO(value))) {
        return format(parseISO(value), 'PPP');
    }
    return String(value);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className='flex items-center gap-4'>
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <CardTitle>Custom Report Builder</CardTitle>
                    <CardDescription>Build, generate, and export your own custom reports.</CardDescription>
                </div>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" onClick={handleExportCSV} disabled={!reportData}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
                 <Button variant="outline" onClick={handleExportPDF} disabled={!reportData}>
                    <FileIcon className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
            {/* --- Configuration Panel --- */}
            <div className="w-full md:w-1/3 lg:w-1/4 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-lg">1. Data Source</CardTitle></CardHeader>
                    <CardContent>
                        <Select value={dataSource} onValueChange={(v) => handleDataSourceChange(v as DataSource)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {(Object.keys(COLUMN_DEFINITIONS) as DataSource[]).map(source => (
                                    <SelectItem key={source} value={source}>{source}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader><CardTitle className="text-lg">2. Columns</CardTitle></CardHeader>
                    <CardContent>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    <Columns className="mr-2 h-4 w-4"/>
                                    Select Columns ({selectedColumns.length})
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                                <ScrollArea className="h-64">
                                <div className="p-4 space-y-2">
                                {currentColumnDefs.map(column => (
                                    <div key={column.key as string} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={column.key as string}
                                            checked={selectedColumns.includes(column.key as string)}
                                            onCheckedChange={() => handleColumnToggle(column.key as string)}
                                        />
                                        <label htmlFor={column.key as string} className="text-sm font-medium leading-none">
                                            {column.label}
                                        </label>
                                    </div>
                                ))}
                                </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-lg">3. Filters</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <ScrollArea className="h-40">
                        <div className="space-y-4 p-1">
                        {filters.map(filter => {
                            const colType = currentColumnDefs.find(c => c.key === filter.column)?.type || 'string';
                            return (
                            <div key={filter.id} className="p-2 border rounded-md space-y-2">
                                <div className="flex items-center gap-2">
                                    <Select value={filter.column} onValueChange={(v) => handleFilterChange(filter.id, 'column', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {currentColumnDefs.map(c => <SelectItem key={c.key as string} value={c.key as string}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                     <Button variant="ghost" size="icon" onClick={() => handleRemoveFilter(filter.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={filter.operator} onValueChange={(v) => handleFilterChange(filter.id, 'operator', v)}>
                                        <SelectTrigger className="w-2/3"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {OPERATORS[colType].map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input value={filter.value} onChange={(e) => handleFilterChange(filter.id, 'value', e.target.value)} />
                                </div>
                            </div>
                            )
                        })}
                        </div>
                        </ScrollArea>
                        <Button variant="outline" size="sm" onClick={handleAddFilter}><PlusCircle className="mr-2 h-4 w-4" /> Add Filter</Button>
                    </CardContent>
                </Card>

                 <Button size="lg" className="w-full" onClick={generateReport}>
                    Generate Report
                </Button>
            </div>

            {/* --- Report Preview Panel --- */}
            <div className="w-full md:w-2/3 lg:w-3/4">
                <Card className="min-h-[70vh]">
                    <CardHeader>
                        <CardTitle>Report Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="border rounded-md h-[60vh] overflow-auto">
                    {reportData ? (
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/50">
                                <TableRow>
                                    {selectedColumns.map(key => (
                                        <TableHead key={key}>{currentColumnDefs.find(c => c.key === key)?.label || key}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.map((row, rowIndex) => (
                                    <TableRow key={rowIndex}>
                                        {selectedColumns.map(colKey => (
                                            <TableCell key={colKey}>{renderValueForCell(row, colKey)}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="h-full flex items-center justify-center text-center text-muted-foreground p-8">
                            <p>Configure your report on the left and click "Generate Report" to see the results.</p>
                        </div>
                    )}
                    </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

    