
'use client';

import { BarChart, PieChart, Pie, Cell, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, Legend, TooltipProps } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/stat-card';
import { Package, Users, CheckCircle, CircleAlert, UserX, AppWindow, ShoppingCart, Award as AwardIcon, Trophy } from 'lucide-react';
import type { Asset } from '@/app/assets/index';
import type { Employee } from '@/app/employees/index';
import type { Software } from '@/app/software/index';
import type { Consumable } from '@/app/consumables/index';
import type { Award } from '@/app/awards/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { AssetDetailsDialog } from '@/components/asset-details-dialog';
import { EmployeeDetailsDialog } from '@/components/employee-details-dialog';
import { useAuth } from '@/context/auth-context';
import { useSettings } from '@/context/settings-context';

type DashboardPageProps = {
  assets: Asset[];
  employees: Employee[];
  software: Software[];
  consumables: Consumable[];
  awards: Award[];
};

const COLORS = ['#3F51B5', '#79BAEC', '#4CAF50', '#FFC107', '#FF5722', '#607D8B'];
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent === 0) {
    return null;
  }
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border p-2 rounded-md shadow-md">
          <p className="font-bold">{label}</p>
          <p className="text-sm">{`${payload[0].name}: ${payload[0].value}`}</p>
           {payload[1] && <p className="text-sm">{`${payload[1].name}: ${payload[1].value}`}</p>}
        </div>
      );
    }
    return null;
  };


export default function DashboardPageContent({ 
  assets = [], 
  employees = [], 
  software = [],
  consumables = [],
  awards = [],
}: DashboardPageProps) {
  const router = useRouter();
  const { tenantId } = useAuth();
  const { isDbConfigured } = useSettings();
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const onNavigate = (tab: string) => router.push(`/${tab}`);
  const setAssetTypeFilter = (type: string) => router.push(`/assets?type=${type}`);
  const setEmployeeStatusFilter = (status: 'all' | 'Active' | 'Inactive') => router.push(`/employees?status=${status}`);
  const setEmployeeDepartmentFilter = (department: string) => router.push(`/employees?department=${department}`);

  const stats = useMemo(() => ({
    totalAssets: assets.length,
    totalEmployees: employees.length,
    totalSoftware: software.length,
    totalConsumables: consumables.length,
    totalAwards: awards.length,
    expiringSoon: software.filter(s => s.expiryDate && differenceInDays(parseISO(s.expiryDate), new Date()) <= 30 && differenceInDays(parseISO(s.expiryDate), new Date()) >= 0).length,
  }), [assets, employees, software, consumables, awards]);

  const assetStatusData = useMemo(() => {
    const statusCounts = assets.reduce((acc, asset) => {
      acc[asset.status] = (acc[asset.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const licenseUsageData = useMemo(() => {
      return software
        .filter(s => s.totalLicenses > 0)
        .map(s => ({
            name: s.name,
            total: s.totalLicenses,
            used: s.assignedTo.length,
            remaining: s.totalLicenses - s.assignedTo.length,
        }));
  }, [software]);

  const recentConsumablesIssued = useMemo(() => {
    return consumables.flatMap(c => 
        c.issueLog.map(log => ({
            ...log,
            consumableName: c.name,
            employeeName: employees.find(e => e.id === log.employeeId)?.name || 'Unknown'
        }))
    )
    .sort((a,b) => parseISO(b.issueDate).getTime() - parseISO(a.issueDate).getTime())
    .slice(0, 5);
  }, [consumables, employees]);

  const recentAwards = useMemo(() => {
    return awards
    .sort((a,b) => parseISO(b.awardDate).getTime() - parseISO(a.awardDate).getTime())
    .slice(0,5)
    .map(award => ({
        ...award,
        employeeName: employees.find(e => e.id === award.employeeId)?.name || 'Unknown',
    }));
  }, [awards, employees]);

  const expiringSoftware = useMemo(() => {
      return software
        .filter(s => s.expiryDate && differenceInDays(parseISO(s.expiryDate), new Date()) <= 30 && differenceInDays(parseISO(s.expiryDate), new Date()) >= 0)
        .sort((a, b) => parseISO(a.expiryDate!).getTime() - parseISO(b.expiryDate!).getTime())
        .slice(0,5);
  }, [software]);

  const recentlyAssignedAssets = useMemo(() => {
    return assets
    .flatMap(asset => {
        return asset.auditLog
            .filter(log => log.details.includes("'assignedTo' from") && log.details.includes("to 'Unassigned'") === false)
            .map(log => ({
                asset,
                assignmentLog: log
            }));
    })
    .sort((a, b) => new Date(b.assignmentLog!.date).getTime() - new Date(a.assignmentLog!.date).getTime())
    .slice(0, 5);
  }, [assets]);

  const getAssignedToNameFromLog = (logDetails: string) => {
    const match = logDetails.match(/to '(.*?)' \(Employee ID: (.*?)\)/);
    if (match && match[1] && match[2]) {
        // Find employee by ID for accuracy, but fallback to name from log
        const employee = employees.find(e => e.employeeId === match[2]);
        return employee?.name || match[1];
    }
    return "N/A";
  };
  
  if (!tenantId || !isDbConfigured) {
      return (
           <div className="container mx-auto py-6">
              <h1 className="text-2xl font-bold">Welcome to AssetGuard</h1>
              <p className="text-muted-foreground">Please configure your database in the settings page to get started.</p>
           </div>
      );
  }

  return (
    <>
    <div className="container mx-auto py-6">
       <div className="mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              An overview of your organization's assets and resources.
            </p>
        </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="cursor-pointer" onClick={() => onNavigate('assets')}>
          <StatCard title="Total Assets" value={stats.totalAssets} icon={Package} />
        </div>
        <div className="cursor-pointer" onClick={() => onNavigate('employees')}>
          <StatCard title="Total Employees" value={stats.totalEmployees} icon={Users} />
        </div>
        <div className="cursor-pointer" onClick={() => onNavigate('software')}>
          <StatCard title="Software Titles" value={stats.totalSoftware} icon={AppWindow} />
        </div>
        <div className="cursor-pointer" onClick={() => onNavigate('consumables')}>
          <StatCard title="Consumables" value={stats.totalConsumables} icon={ShoppingCart} />
        </div>
         <div className="cursor-pointer" onClick={() => onNavigate('awards')}>
            <StatCard title="Awards Given" value={stats.totalAwards} icon={Trophy} />
        </div>
        <div className="cursor-pointer" onClick={() => onNavigate('software')}>
            <StatCard title="Licenses Expiring" value={stats.expiringSoon} icon={CircleAlert} />
        </div>
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asset Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={120}
                  dataKey="value"
                  className="cursor-pointer"
                >
                  {assetStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>License Usage</CardTitle>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={300}>
              <BarChart data={licenseUsageData} margin={{ left: 10, bottom: 20 }}>
                <XAxis dataKey="name" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }}/>
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
                <Bar dataKey="used" name="Assigned" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" name="Available" stackId="a" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
            <Card>
                <CardHeader>
                    <CardTitle>Recently Assigned Assets</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>When</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentlyAssignedAssets.length > 0 ? recentlyAssignedAssets.map(({ asset, assignmentLog }) => (
                                    <TableRow key={`${asset.id}-${assignmentLog.id}`} className="cursor-pointer" onClick={() => setViewingAsset(asset)}>
                                        <TableCell>{asset.assetTag}</TableCell>
                                        <TableCell>{getAssignedToNameFromLog(assignmentLog.details)}</TableCell>
                                        <TableCell>{formatDistanceToNow(new Date(assignmentLog!.date), { addSuffix: true })}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">No assets assigned recently.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Recently Issued Consumables</CardTitle>
                </CardHeader>
                <CardContent>
                     <ScrollArea className="h-72">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>Qty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentConsumablesIssued.length > 0 ? recentConsumablesIssued.map(item => (
                                    <TableRow key={item.id} className="cursor-pointer" onClick={() => onNavigate('consumables')}>
                                        <TableCell>{item.consumableName}</TableCell>
                                        <TableCell>{item.employeeName}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">No consumables issued recently.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Expiring Software</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Software</TableHead>
                                    <TableHead>Expires In</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expiringSoftware.length > 0 ? expiringSoftware.map((sw) => (
                                    <TableRow key={sw.id} className="cursor-pointer" onClick={() => onNavigate('software')}>
                                        <TableCell>{sw.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="destructive">
                                                {differenceInDays(parseISO(sw.expiryDate!), new Date())} days
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">No licenses expiring soon.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Awards</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Award</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentAwards.length > 0 ? recentAwards.map(award => (
                                    <TableRow key={award.id} className="cursor-pointer" onClick={() => setViewingEmployee(employees.find(e => e.id === award.employeeId)!)}>
                                        <TableCell>{award.employeeName}</TableCell>
                                        <TableCell>{award.name}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">No awards given recently.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
       </div>
    </div>
    <AssetDetailsDialog
        asset={viewingAsset}
        employees={employees}
        isOpen={!!viewingAsset}
        onClose={() => setViewingAsset(null)}
        onEdit={(asset) => router.push(`/assets?edit=${asset.id}`)}
        onAddComment={() => {}}
    />
    <EmployeeDetailsDialog
        employee={viewingEmployee}
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        onEdit={(employee) => router.push(`/employees?edit=${employee.id}`)}
        assignedAssets={assets.filter(
            (asset) => asset.assignedTo === viewingEmployee?.id
        )}
        onViewAsset={setViewingAsset}
        onAddComment={() => {}}
        awards={awards.filter(
            (award) => award.employeeId === viewingEmployee?.id
        )}
    />
    </>
  );
}
