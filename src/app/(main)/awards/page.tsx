
import * as awardService from '@/services/award-service';
import * as employeeService from '@/services/employee-service';
import AwardsPageContent from '@/app/awards/index';
import { getTenantId } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';

export default async function AwardsPageContainer() {
  const tenantId = getTenantId();
  const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

  const [
    awardsData,
    employeesData
  ] = tenantId && isDbConfigured ? await Promise.all([
    awardService.getAwards(databaseProvider, dbConfig, tenantId),
    employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
  ]) : [[], []];

  return <AwardsPageContent initialAwards={awardsData || []} initialEmployees={employeesData || []} />;
}
