
import * as vendorService from '@/services/vendor-service';
import VendorsPageContent from '@/app/vendors/index';
import { getTenantId } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';

export default async function VendorsPage() {
    const tenantId = getTenantId();
    const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
    const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

    const vendorsData = tenantId && isDbConfigured ? await vendorService.getVendors(databaseProvider, dbConfig, tenantId) : [];

    return (
        <VendorsPageContent
            initialVendors={vendorsData || []}
        />
    );
}
