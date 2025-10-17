
'use client';

import { useState } from 'react';
import type { Asset } from '@/app/assets/index';
import type { Employee } from '@/app/employees/index';
import type { Consumable } from '@/app/consumables/index';
import type { Vendor } from '@/app/vendors/index';
import type { Software } from '@/app/software/index';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wrench } from 'lucide-react';
import { EmployeeAssetsReport } from '@/components/reports/employee-assets-report';
import { AssetInventoryReport } from '@/components/reports/asset-inventory-report';
import { InactiveEmployeesReport } from '@/components/reports/inactive-employees-report';
import { AssetByTypeReport } from '@/components/reports/asset-by-type-report';
import { AssetLifecycleReport } from '@/components/reports/asset-lifecycle-report';
import { MaintenanceReport } from '@/components/reports/maintenance-report';
import { AuditHistoryReport } from '@/components/reports/audit-history-report';
import { ConsumableReport } from '@/components/reports/consumable-report';
import { ConsumableIssueReport } from '@/components/reports/consumable-issue-report';
import { SoftwareInventoryReport } from '@/components/reports/software-inventory-report';
import { SoftwareAssignmentReport } from '@/components/reports/software-assignment-report';
import { InactiveEmployeesWithAssetsReport } from '@/components/reports/inactive-employees-with-assets-report';
import { CustomReportGenerator } from '@/components/reports/custom-report-generator';


type ReportId = 'employee-assets' | 'asset-inventory' | 'inactive-employees' | 'asset-by-type' | 'asset-lifecycle' | 'maintenance' | 'audit-log' | 'consumables' | 'consumable-issues' | 'software-inventory' | 'software-assignment' | 'inactive-employees-with-assets' | 'custom-report';

const reportList: { id: ReportId; title: string; description: string; available: boolean, icon?: React.ElementType }[] = [
    { id: 'custom-report', title: 'Custom Report Builder', description: 'Create your own reports by selecting columns and filters.', available: true, icon: Wrench },
    { id: 'employee-assets', title: 'Employee & Assigned Assets', description: 'View which assets each employee is currently using.', available: true },
    { id: 'asset-inventory', title: 'Asset Inventory', description: 'Complete list of all assets with their current status.', available: true },
    { id: 'consumables', title: 'Consumables Inventory', description: 'Detailed report of all consumable items and stock.', available: true },
    { id: 'consumable-issues', title: 'Consumable Issue Log', description: 'Log of all consumable items issued to employees.', available: true },
    { id: 'software-inventory', title: 'Software Inventory', description: 'Complete list of all software licenses and usage.', available: true },
    { id: 'software-assignment', title: 'Software Assignment Report', description: 'Detailed report of which employees are assigned to licenses.', available: true },
    { id: 'inactive-employees', title: 'Inactive Employees', description: 'List of inactive employees and their last known assets.', available: true },
    { id: 'inactive-employees-with-assets', title: 'Inactive Employees Holding Assets', description: 'Find inactive employees who still have assets assigned.', available: true },
    { id: 'asset-by-type', title: 'Asset by Type', description: 'A breakdown of assets by their type (Laptop, Server, etc.).', available: true },
    { id: 'asset-lifecycle', title: 'Asset Lifecycle Report', description: 'Report on asset age, purchase date, and warranty info.', available: true },
    { id: 'maintenance', title: 'Repair/Maintenance Report', description: 'History of assets that have been repaired.', available: true },
    { id: 'audit-log', title: 'Audit & History Report', description: 'Track all changes to assets and employees over time.', available: true },
];


type ReportsPageProps = {
  assets: Asset[];
  employees: Employee[];
  consumables: Consumable[];
  vendors: Vendor[];
  software: Software[];
};

export default function ReportsPageContent({ assets, employees, consumables, vendors, software }: ReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<ReportId | null>(null);

  const allData = { assets, employees, consumables, vendors, software };

  const renderReport = () => {
    switch (selectedReport) {
      case 'employee-assets':
        return <EmployeeAssetsReport employees={employees} assets={assets} onBack={() => setSelectedReport(null)} />;
      case 'asset-inventory':
        return <AssetInventoryReport assets={assets} employees={employees} onBack={() => setSelectedReport(null)} />;
      case 'consumables':
        return <ConsumableReport consumables={consumables} vendors={vendors} onBack={() => setSelectedReport(null)} />;
      case 'consumable-issues':
        return <ConsumableIssueReport consumables={consumables} employees={employees} onBack={() => setSelectedReport(null)} />;
      case 'software-inventory':
        return <SoftwareInventoryReport software={software} vendors={vendors} onBack={() => setSelectedReport(null)} />;
      case 'software-assignment':
        return <SoftwareAssignmentReport software={software} employees={employees} onBack={() => setSelectedReport(null)} />;
      case 'inactive-employees':
        return <InactiveEmployeesReport employees={employees} assets={assets} onBack={() => setSelectedReport(null)} />;
      case 'inactive-employees-with-assets':
        return <InactiveEmployeesWithAssetsReport employees={employees} assets={assets} onBack={() => setSelectedReport(null)} />;
      case 'asset-by-type':
        return <AssetByTypeReport assets={assets} onBack={() => setSelectedReport(null)} />;
      case 'asset-lifecycle':
        return <AssetLifecycleReport assets={assets} onBack={() => setSelectedReport(null)} />;
      case 'maintenance':
        return <MaintenanceReport assets={assets} onBack={() => setSelectedReport(null)} />;
      case 'audit-log':
        return <AuditHistoryReport assets={assets} employees={employees} onBack={() => setSelectedReport(null)} />;
      case 'custom-report':
        return <CustomReportGenerator allData={allData} onBack={() => setSelectedReport(null)} />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportList.map((report) => (
                <Card key={report.id} className={`flex flex-col ${!report.available ? 'bg-muted/50' : 'hover:border-primary'}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           {report.icon && <report.icon className="h-6 w-6" />}
                           {report.title}
                        </CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow"></CardContent>
                    <CardContent>
                         <Button 
                            onClick={() => setSelectedReport(report.id)} 
                            disabled={!report.available}
                            className="w-full"
                        >
                            {report.id === 'custom-report' ? 'Build Report' : (report.available ? 'View Report' : 'Coming Soon')}
                            {report.available && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </CardContent>
                </Card>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Analyze and export your asset and employee data.
        </p>
      </div>
      {renderReport()}
    </div>
  );
}
