
import * as assetService from '@/services/asset-service';
import * as employeeService from '@/services/employee-service';
import * as vendorService from '@/services/vendor-service';
import * as softwareService from '@/services/software-service';
import * as consumableService from '@/services/consumable-service';
import ReportsPageContent from '@/app/reports/index';
import { getTenantId } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';

export default async function ReportsPage() {
  const tenantId = getTenantId();
  const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

  const [
    assetsData,
    employeesData,
    vendorsData,
    softwareData,
    consumablesData,
  ] = tenantId && isDbConfigured ? await Promise.all([
    assetService.getAssets(databaseProvider, dbConfig, tenantId),
    employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
    vendorService.getVendors(databaseProvider, dbConfig, tenantId),
    softwareService.getSoftware(databaseProvider, dbConfig, tenantId),
    consumableService.getConsumables(databaseProvider, dbConfig, tenantId),
  ]) : [[], [], [], [], []];

  return (
    <ReportsPageContent
      assets={assetsData || []}
      employees={employeesData || []}
      vendors={vendorsData || []}
      software={softwareData || []}
      consumables={consumablesData || []}
    />
  );
}
