
"use client";

import { useState } from 'react';
import type { Award } from '@/app/awards/page';
import type { Employee } from '@/app/employees/index';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { MoreHorizontal, Download, Edit, Trash2, Search, Eye, Award as AwardIcon, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';

type AwardsTableProps = {
  awards: Award[];
  employees: Employee[];
  onEdit: (award: Award) => void;
  onDelete: (award: Award) => void;
  onDownloadCertificate: (award: Award) => void;
  onView: (award: Award) => void;
  onPreviewCertificate: (award: Award) => void;
  onLock: (award: Award) => void;
};

export function AwardsTable({ awards, employees, onEdit, onDelete, onDownloadCertificate, onView, onPreviewCertificate, onLock }: AwardsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'Unknown Employee';
  };

  const filteredAwards = awards.filter(award => {
    const employeeName = getEmployeeName(award.employeeId).toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return (
      award.name.toLowerCase().includes(searchLower) ||
      employeeName.includes(searchLower) ||
      award.department.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Award History</CardTitle>
            <div className="relative w-full sm:w-auto md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search awards..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Award Name</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Award Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAwards.length > 0 ? (
                filteredAwards.map(award => (
                  <TableRow key={award.id} onClick={() => onPreviewCertificate(award)} className="cursor-pointer">
                    <TableCell className="font-medium flex items-center gap-2">
                        {award.isLocked && <Lock className="h-4 w-4 text-muted-foreground" title="Locked" />}
                        {award.name}
                    </TableCell>
                    <TableCell>{getEmployeeName(award.employeeId)}</TableCell>
                    <TableCell>{award.department}</TableCell>
                    <TableCell>{format(parseISO(award.awardDate), 'PPP')}</TableCell>
                    <TableCell><Badge variant="secondary">{award.type}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(award)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPreviewCertificate(award)}>
                            <AwardIcon className="mr-2 h-4 w-4" />
                            Preview Certificate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDownloadCertificate(award)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Certificate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEdit(award)} disabled={award.isLocked}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => onLock(award)} disabled={award.isLocked}>
                            <Lock className="mr-2 h-4 w-4" />
                            Lock Record
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(award)} className="text-destructive focus:text-destructive" disabled={award.isLocked}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No awards found.
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
