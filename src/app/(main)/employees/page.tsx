
'use server';

import * as employeeService from '@/services/employee-service';
import * as assetService from '@/services/asset-service';
import * as awardService from '@/services/award-service';
import EmployeesPageContent from '@/app/employees/index';
import { getTenantId } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const LoadingSkeleton = () => (
    <div className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex justify-between items-center pt-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
);


export default async function EmployeesPageWrapper({ searchParams }: PageProps) {
    const tenantId = getTenantId();
    const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
    const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

    const [
        employeesData,
        assetsData,
        awardsData
    ] = tenantId && isDbConfigured ? await Promise.all([
        employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
        assetService.getAssets(databaseProvider, dbConfig, tenantId),
        awardService.getAwards(databaseProvider, dbConfig, tenantId),
    ]) : [[], [], []];

    const editEmployeeId = typeof searchParams.edit === 'string' ? searchParams.edit : undefined;
    const editingEmployee = editEmployeeId ? employeesData.find(e => e.id === editEmployeeId) : undefined;
    
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <EmployeesPageContent
                initialEmployees={employeesData || []}
                initialAssets={assetsData || []}
                initialAwards={awardsData || []}
                initialEditingEmployee={editingEmployee}
            />
        </Suspense>
    );
}
