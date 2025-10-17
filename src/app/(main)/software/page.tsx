
import * as softwareService from '@/services/software-service';
import * as vendorService from '@/services/vendor-service';
import * as employeeService from '@/services/employee-service';
import SoftwarePageContent from '@/app/software/index';
import { getTenantId } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';

export default async function SoftwarePage() {
    const tenantId = getTenantId();
    const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
    const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

    const [
        softwareData,
        vendorsData,
        employeesData
    ] = tenantId && isDbConfigured ? await Promise.all([
        softwareService.getSoftware(databaseProvider, dbConfig, tenantId),
        vendorService.getVendors(databaseProvider, dbConfig, tenantId),
        employeeService.getEmployees(databaseProvider, dbConfig, tenantId),
    ]) : [[], [], []];

    return (
        <SoftwarePageContent
            initialSoftware={softwareData || []}
            initialVendors={vendorsData || []}
            initialEmployees={employeesData || []}
        />
    );
}
