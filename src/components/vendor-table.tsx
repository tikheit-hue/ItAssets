
"use client";

import type { Vendor } from "@/app/vendors/index";
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
import { Pencil, Trash2, MoreHorizontal, Eye, Search, ArrowUpDown, FileUp, FileDown, Loader2, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";
import { Progress } from "./ui/progress";

type VendorTableProps = {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
  onView: (vendor: Vendor) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedVendors: Set<string>;
  onSelectVendor: (id: string) => void;
  onSelectAll: (isChecked: boolean) => void;
  onDeleteSelected: () => void;
  sortConfig: { key: keyof Vendor; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: keyof Vendor) => void;
  onImport: () => void;
  onExport: () => void;
  onDownloadSample: () => void;
  isImporting: boolean;
  importProgress: number;
};

export function VendorTable({ 
  vendors, 
  onEdit, 
  onDelete, 
  onView, 
  isLoading,
  searchQuery,
  setSearchQuery,
  selectedVendors,
  onSelectVendor,
  onSelectAll,
  onDeleteSelected,
  sortConfig,
  requestSort,
  onImport,
  onExport,
  isImporting,
  importProgress,
  onDownloadSample,
}: VendorTableProps) {

  const numSelected = selectedVendors.size;
  const isAllSelected = numSelected > 0 && numSelected === vendors.length;
  const isIndeterminate = numSelected > 0 && numSelected < vendors.length;

  const SortableHeader = ({ sortKey, children }: { sortKey: keyof Vendor, children: React.ReactNode }) => (
    <TableHead>
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
            <CardTitle>Vendor List</CardTitle>
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
                        placeholder="Search vendors..."
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
                <SortableHeader sortKey="contactPerson">Contact Person</SortableHeader>
                <SortableHeader sortKey="email">Email</SortableHeader>
                <SortableHeader sortKey="phone">Phone</SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No vendors found.
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow 
                    key={vendor.id} 
                    data-state={selectedVendors.has(vendor.id) ? "selected" : ""}
                    onClick={() => onView(vendor)}
                    className="cursor-pointer"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedVendors.has(vendor.id)}
                          onCheckedChange={() => onSelectVendor(vendor.id)}
                          aria-label="Select row"
                        />
                    </TableCell>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.contactPerson}</TableCell>
                    <TableCell>{vendor.email}</TableCell>
                    <TableCell>{vendor.phone}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(vendor)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(vendor)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(vendor)} className="text-destructive focus:text-destructive">
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
