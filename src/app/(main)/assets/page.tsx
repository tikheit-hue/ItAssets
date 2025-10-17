
import * as assetService from '@/services/asset-service';
import * as employeeService from '@/services/employee-service';
import * as vendorService from '@/services/vendor-service';
import AssetsPageContent from '@/app/assets/index';
import { getTenantId } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';
import { Suspense } from 'react';
import { Skeleton }from '@/components/ui/skeleton';

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

export default async function AssetsPage({ searchParams }: PageProps) {
    const tenantId = getTenantId();
    const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
    const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;
    
    const [
        assetsData,
        employeesData,
        vendorsData,
    ] = tenantId && isDbConfigured ? await Promise.all([
        assetService.getAssets(databaseProvider, dbConfig, tenantId),
        employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
        vendorService.getVendors(databaseProvider, dbConfig, tenantId),
    ]) : [[], [], []];
    
    const editAssetId = typeof searchParams.edit === 'string' ? searchParams.edit : undefined;
    const editingAsset = editAssetId ? assetsData.find(a => a.id === editAssetId) : undefined;

    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <AssetsPageContent
                initialAssets={assetsData || []}
                initialEmployees={employeesData || []}
                initialVendors={vendorsData || []}
                initialEditingAsset={editingAsset}
            />
        </Suspense>
    );
}
