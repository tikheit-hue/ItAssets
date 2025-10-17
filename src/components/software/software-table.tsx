
"use client";

import type { Software } from "@/app/software/index";
import type { Employee } from "@/app/employees/index";
import type { Vendor } from "@/app/vendors/index";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Pencil, Trash2, MoreHorizontal, Eye, Search, ArrowUpDown, FileUp, FileDown, Loader2, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from 'date-fns';
import { Checkbox } from "../ui/checkbox";
import { Progress } from "../ui/progress";

type SoftwareTableProps = {
  software: Software[];
  employees: Employee[];
  vendors: Vendor[];
  onEdit: (software: Software) => void;
  onDelete: (software: Software) => void;
  onView: (software: Software) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortConfig: { key: keyof Software; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: keyof Software) => void;
  selectedSoftware: Set<string>;
  onSelectSoftware: (id: string) => void;
  onSelectAll: (isChecked: boolean) => void;
  onDeleteSelected: () => void;
  onImport: () => void;
  onExport: () => void;
  onDownloadSample: () => void;
  isImporting: boolean;
  importProgress: number;
};

export function SoftwareTable({
  software,
  employees,
  vendors,
  onEdit,
  onDelete,
  onView,
  isLoading,
  searchQuery,
  setSearchQuery,
  sortConfig,
  requestSort,
  selectedSoftware,
  onSelectSoftware,
  onSelectAll,
  onDeleteSelected,
  onImport,
  onExport,
  onDownloadSample,
  isImporting,
  importProgress,
}: SoftwareTableProps) {
  
  const getVendorName = (vendorId: string | null) => {
    if (!vendorId) return "N/A";
    return vendors.find(v => v.id === vendorId)?.name || "Unknown";
  };

  const getStatusBadge = (item: Software) => {
    if (item.status === 'Expired') {
        return <Badge variant="destructive">{item.status}</Badge>;
    }
    if (item.expiryDate && !isNaN(parseISO(item.expiryDate).getTime())) {
        const daysUntilExpiry = differenceInDays(parseISO(item.expiryDate), new Date());
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
            return <Badge variant="destructive" className="animate-pulse">Expires in {daysUntilExpiry}d</Badge>
        }
    }
    if (item.status === 'Renewed') {
        return <Badge className="bg-blue-500 hover:bg-blue-600">{item.status}</Badge>
    }
    return <Badge variant="default">{item.status}</Badge>;
  };

  const SortableHeader = ({ sortKey, children }: { sortKey: keyof Software, children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => requestSort(sortKey)}>
        {children}
        <ArrowUpDown className={cn("ml-2 h-4 w-4", sortConfig?.key === sortKey ? "" : "text-muted-foreground")} />
      </Button>
    </TableHead>
  );

  const numSelected = selectedSoftware.size;
  const isAllSelected = numSelected > 0 && numSelected === software.length;
  const isIndeterminate = numSelected > 0 && numSelected < software.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Software Licenses</CardTitle>
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
                        placeholder="Search software..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
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
                <SortableHeader sortKey="name">Name</SortableHeader>
                <SortableHeader sortKey="version">Version</SortableHeader>
                <SortableHeader sortKey="licenseType">License Type</SortableHeader>
                <SortableHeader sortKey="status">Status</SortableHeader>
                <TableHead>Licenses (Used/Total)</TableHead>
                <SortableHeader sortKey="vendorId">Vendor</SortableHeader>
                <SortableHeader sortKey="expiryDate">Expiry Date</SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : software.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No software found.
                  </TableCell>
                </TableRow>
              ) : (
                software.map((item) => (
                  <TableRow 
                    key={item.id} 
                    data-state={selectedSoftware.has(item.id) ? "selected" : ""}
                    onClick={() => onView(item)}
                    className="cursor-pointer"
                  >
                     <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedSoftware.has(item.id)}
                          onCheckedChange={() => onSelectSoftware(item.id)}
                          aria-label="Select row"
                        />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.version}</TableCell>
                    <TableCell>{item.licenseType}</TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell>{item.assignedTo.length} / {item.totalLicenses}</TableCell>
                    <TableCell>{getVendorName(item.vendorId)}</TableCell>
                    <TableCell>{item.expiryDate && !isNaN(parseISO(item.expiryDate).getTime()) ? format(parseISO(item.expiryDate), 'PPP') : 'Perpetual'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(item)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
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
