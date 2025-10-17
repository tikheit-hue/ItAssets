
import ConsumablesPageContent from '@/app/consumables/index';
import { getTenantId } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';
import * as consumableService from '@/services/consumable-service';
import * as employeeService from '@/services/employee-service';
import * as vendorService from '@/services/vendor-service';

export default async function ConsumablesPageContainer() {
  const tenantId = getTenantId();
  const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

  const [
    consumablesData,
    employeesData,
    vendorsData
  ] = tenantId && isDbConfigured ? await Promise.all([
    consumableService.getConsumables(databaseProvider, dbConfig, tenantId),
    employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
    vendorService.getVendors(databaseProvider, dbConfig, tenantId),
  ]) : [[], [], []];

  return (
    <ConsumablesPageContent
      initialConsumables={consumablesData || []}
      initialEmployees={employeesData || []}
      initialVendors={vendorsData || []}
    />
  );
}
