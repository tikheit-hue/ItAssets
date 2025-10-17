
import { Suspense } from 'react';
import DashboardPageContent from '@/app/dashboard/index';
import * as assetService from '@/services/asset-service';
import * as employeeService from '@/services/employee-service';
import * as softwareService from '@/services/software-service';
import * as awardService from '@/services/award-service';
import * as consumableService from '@/services/consumable-service';
import { getTenantId } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';
import { Skeleton } from '@/components/ui/skeleton';

const LoadingSkeleton = () => (
  <div className="p-6">
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-6 gap-6 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  </div>
);

export default async function DashboardPage() {
    const tenantId = getTenantId();
    const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
    
    // Data fetching will proceed even if tenantId is briefly null on the server.
    // The client component will handle the display logic.
    const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;
    
    const [
        assetsData,
        employeesData,
        softwareData,
        awardsData,
        consumablesData,
    ] = tenantId && isDbConfigured ? await Promise.all([
        assetService.getAssets(databaseProvider, dbConfig, tenantId),
        employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
        softwareService.getSoftware(databaseProvider, dbConfig, tenantId),
        awardService.getAwards(databaseProvider, dbConfig, tenantId),
        consumableService.getConsumables(databaseProvider, dbConfig, tenantId),
    ]) : [[], [], [], [], []];

    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <DashboardPageContent
                assets={assetsData || []}
                employees={employeesData || []}
                software={softwareData || []}
                consumables={consumablesData || []}
                awards={awardsData || []}
            />
        </Suspense>
    );
}
