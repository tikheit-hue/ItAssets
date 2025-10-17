
"use client";

import type { Employee } from "@/app/employees/index";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { Pencil, Trash2, MoreHorizontal, Eye, Search, FileUp, FileDown, Loader2, LogOut, ArrowUpDown, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { cn } from "@/lib/utils";

type EmployeeTableProps = {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onView: (employee: Employee) => void;
  onMarkAsExited: (employee: Employee) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (type: string) => void;
  statusFilter: 'all' | 'Active' | 'Inactive';
  setStatusFilter: (status: 'all' | 'Active' | 'Inactive') => void;
  availableDepartments: string[];
  selectedEmployees: Set<string>;
  onSelectEmployee: (id: string) => void;
  onSelectAll: (isChecked: boolean) => void;
  onDeleteSelected: () => void;
  onImport: () => void;
  onExport: () => void;
  onDownloadSample: () => void;
  isImporting: boolean;
  importProgress: number;
  sortConfig: { key: keyof Employee; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: keyof Employee) => void;
};

export function EmployeeTable({ 
  employees, 
  onEdit, 
  onDelete, 
  onView,
  onMarkAsExited,
  isLoading,
  searchQuery,
  setSearchQuery,
  departmentFilter,
  setDepartmentFilter,
  statusFilter,
  setStatusFilter,
  availableDepartments,
  selectedEmployees,
  onSelectEmployee,
  onSelectAll,
  onDeleteSelected,
  onImport,
  onExport,
  onDownloadSample,
  isImporting,
  importProgress,
  sortConfig,
  requestSort,
}: EmployeeTableProps) {

  const numSelected = selectedEmployees.size;
  const isAllSelected = numSelected > 0 && numSelected === employees.length;
  const isIndeterminate = numSelected > 0 && numSelected < employees.length;

  const SortableHeader = ({ sortKey, children, className }: { sortKey: keyof Employee, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => requestSort(sortKey)}>
        {children}
        <ArrowUpDown className={cn("ml-2 h-4 w-4", sortConfig?.key === sortKey ? "" : "text-muted-foreground")} />
      </Button>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Employee List</CardTitle>
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                 {numSelected > 0 && (
                  <Button variant="destructive" onClick={onDeleteSelected} className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({numSelected})
                  </Button>
                )}
                <div className="relative w-full sm:w-auto md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                 <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
                        <SelectValue placeholder="Filter by department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {availableDepartments.map(dept => (
                            <SelectItem key={dept} value={dept.toLowerCase()}>{dept}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'Active' | 'Inactive')}>
                    <SelectTrigger className="w-full sm:w-auto md:w-[150px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex w-full sm:w-auto gap-2">
                    <Button variant="outline" onClick={onImport} disabled={isImporting} className="flex-1">
                      {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                      Import
                    </Button>
                    <Button variant="secondary" onClick={onDownloadSample} className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Sample
                    </Button>
                    <Button variant="outline" onClick={onExport} className="flex-1">
                      <FileDown className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isImporting && (
            <div className="mb-4 space-y-2">
                <p className="text-sm text-muted-foreground text-center">Importing... {importProgress}%</p>
                <Progress value={importProgress} className="w-full" />
            </div>
        )}
        <div className="border rounded-md relative h-[60vh] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-12">
                   <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => onSelectAll(!!checked)}
                      aria-label="Select all"
                      data-state={isIndeterminate ? "indeterminate" : (isAllSelected ? "checked" : "unchecked")}
                    />
                </TableHead>
                <SortableHeader sortKey="employeeId">Employee ID</SortableHeader>
                <SortableHeader sortKey="name">Name</SortableHeader>
                <SortableHeader sortKey="department">Department</SortableHeader>
                <SortableHeader sortKey="designation">Designation</SortableHeader>
                <SortableHeader sortKey="status">Status</SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && employees.length === 0 ? (
                  Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                      </TableCell>
                  </TableRow>
                  ))
              ) : employees.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                      No employees found.
                  </TableCell>
                  </TableRow>
              ) : (
                  employees.map((employee) => (
                  <TableRow 
                      key={employee.id} 
                      data-state={selectedEmployees.has(employee.id) ? "selected" : ""}
                      onClick={() => onView(employee)}
                      className="cursor-pointer"
                  >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                          checked={selectedEmployees.has(employee.id)}
                          onCheckedChange={() => onSelectEmployee(employee.id)}
                          aria-label="Select row"
                          />
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.employeeId}
                      </TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.designation}</TableCell>
                      <TableCell>
                      <Badge variant={employee.status === 'Active' ? 'default' : 'destructive'}>{employee.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(employee)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(employee)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => onMarkAsExited(employee)} disabled={employee.status === 'Inactive'}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Mark as Exited
                            </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(employee)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                          </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      </TableCell>
                  </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
