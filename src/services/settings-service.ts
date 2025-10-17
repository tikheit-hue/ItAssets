
import 'server-only';
import { cookies } from 'next/headers';

// This is a server-side utility to read settings from cookies.
// It mirrors the structure of the client-side useSettings hook.

export type SqlConfig = {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password?: string;
  authenticationType: "SQL Auth" | "Windows Auth";
  schema?: string;
}

export type DatabaseProvider = "sql" | "firebase";

const DEFAULT_SQL_CONFIG: SqlConfig = {
    host: "13.232.252.119",
    port: 1433,
    databaseName: "111",
    username: "sa",
    password: "sa1",
    authenticationType: "SQL Auth",
    schema: "dbo"
}

export function getSettings() {
    const cookieStore = cookies();

    const sqlConfigCookie = cookieStore.get("settings-sql-config");
    const dbProviderCookie = cookieStore.get("settings-db-provider");
    
    const sqlConfig: SqlConfig = sqlConfigCookie ? JSON.parse(sqlConfigCookie.value) : DEFAULT_SQL_CONFIG;
    const databaseProvider: DatabaseProvider = dbProviderCookie ? JSON.parse(dbProviderCookie.value) : 'sql';

    const isDbConfigured = databaseProvider === 'firebase' || (sqlConfig.host && sqlConfig.databaseName && sqlConfig.username);

    return {
        sqlConfig,
        databaseProvider,
        isDbConfigured,
    };
}
