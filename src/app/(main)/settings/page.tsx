
'use server';

import { getTenantId, getUserRole } from '@/services/auth-service';
import { getSettings } from '@/services/settings-service';
import SettingsPageContent from '@/app/settings/index';
import * as userService from '@/services/user-service';
import { revalidatePath } from 'next/cache';
import type { User } from '@/services/user-service';

export async function revalidateSettings() {
    'use server';
    revalidatePath('/settings');
}

export default async function SettingsPage() {
  const tenantId = getTenantId();
  const userRole = getUserRole();
  const { databaseProvider, sqlConfig, isDbConfigured } = getSettings();
  const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;
  
  let users: User[] = [];
  if (tenantId && isDbConfigured) {
    users = await userService.getUsers(databaseProvider, dbConfig, tenantId);
  }

  return (
    <SettingsPageContent
        userRole={userRole}
        initialUsers={users}
    />
  );
}

