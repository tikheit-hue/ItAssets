
"use client";

import type { Asset } from "@/app/assets/index";
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
import { Pencil, Trash2, MoreHorizontal, Eye, Search, FileUp, FileDown, Loader2, ArrowUpDown, Download, Edit } from "lucide-react";
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
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";


type AssetTableProps = {
  assets: Asset[];
  employees: Employee[];
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onView: (asset: Asset) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  assetTypeFilter: string;
  setAssetTypeFilter: (type: string) => void;
  availableAssetTypes: string[];
  onImport: () => void;
  onExport: () => void;
  onDownloadSample: () => void;
  selectedAssets: Set<string>;
  onSelectAsset: (id: string) => void;
  onSelectAll: (isChecked: boolean) => void;
  onDeleteSelected: () => void;
  onMassUpdate: () => void;
  isImporting: boolean;
  importProgress: number;
  sortConfig: { key: keyof Asset; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: keyof Asset) => void;
};

export function AssetTable({ 
  assets, 
  employees,
  onEdit, 
  onDelete, 
  onView, 
  isLoading,
  searchQuery,
  setSearchQuery,
  assetTypeFilter,
  setAssetTypeFilter,
  availableAssetTypes,
  onImport,
  onExport,
  onDownloadSample,
  selectedAssets,
  onSelectAsset,
  onSelectAll,
  onDeleteSelected,
  onMassUpdate,
  isImporting,
  importProgress,
  sortConfig,
  requestSort,
}: AssetTableProps) {

  const numSelected = selectedAssets.size;
  const isAllSelected = numSelected > 0 && numSelected === assets.length;
  const isIndeterminate = numSelected > 0 && numSelected < assets.length;

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) {
      return <span className="text-muted-foreground">Unassigned</span>;
    }
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : "Unknown Employee";
  };
  
  const getStatusBadge = (status: Asset['status']) => {
    switch(status) {
        case 'Available':
            return <Badge variant="secondary">{status}</Badge>;
        case 'Assigned':
            return <Badge variant="default">{status}</Badge>;
        case 'Donated':
            return <Badge variant="outline">{status}</Badge>;
        case 'E-Waste':
            return <Badge variant="destructive">{status}</Badge>;
        default:
            return <Badge variant="secondary">Unknown</Badge>;
    }
  }


  const SortableHeader = ({ sortKey, children }: { sortKey: keyof Asset, children: React.ReactNode }) => (
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
            <CardTitle>Asset List</CardTitle>
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                 {numSelected > 0 && (
                  <>
                    <Button variant="outline" onClick={onMassUpdate} className="w-full sm:w-auto">
                      <Edit className="mr-2 h-4 w-4" />
                      Mass Update ({numSelected})
                    </Button>
                    <Button variant="destructive" onClick={onDeleteSelected} className="w-full sm:w-auto">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete ({numSelected})
                    </Button>
                  </>
                )}
                <div className="relative w-full sm:w-auto md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                 <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                    <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {availableAssetTypes.map(type => (
                            <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                        ))}
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
                <SortableHeader sortKey="assetTag">Asset Tag</SortableHeader>
                <SortableHeader sortKey="status">Status</SortableHeader>
                <SortableHeader sortKey="assetType">Type</SortableHeader>
                <SortableHeader sortKey="make">Make</SortableHeader>
                <SortableHeader sortKey="model">Model</SortableHeader>
                <SortableHeader sortKey="serialNumber">Serial No.</SortableHeader>
                <SortableHeader sortKey="assignedTo">Assigned To</SortableHeader>
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
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No assets found.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow 
                    key={asset.id} 
                    data-state={selectedAssets.has(asset.id) ? "selected" : ""}
                    onClick={() => onView(asset)}
                    className="cursor-pointer"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={() => onSelectAsset(asset.id)}
                          aria-label="Select row"
                        />
                    </TableCell>
                    <TableCell className="font-medium">
                      {asset.assetTag}
                    </TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>{asset.assetType}</TableCell>
                    <TableCell>{asset.make}</TableCell>
                    <TableCell>{asset.model}</TableCell>
                    <TableCell>{asset.serialNumber}</TableCell>
                    <TableCell>{getEmployeeName(asset.assignedTo)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(asset)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(asset)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(asset)} className="text-destructive focus:text-destructive">
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
