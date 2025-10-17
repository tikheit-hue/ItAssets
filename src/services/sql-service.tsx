
'use server';

import type { SqlConfig } from '@/context/settings-context';
import sql from 'mssql';

// Maintain a global pool variable.
let pool: sql.ConnectionPool | null = null;

async function getConnection(config: SqlConfig): Promise<sql.ConnectionPool> {
    // If a pool exists and is connected, return it.
    if (pool && pool.connected) {
        return pool;
    }

    const sqlConfig: sql.config = {
        user: config.username,
        password: config.password,
        server: config.host,
        database: config.databaseName,
        port: config.port,
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    };

    try {
        pool = new sql.ConnectionPool(sqlConfig);
        await pool.connect();
        
        pool.on('error', err => {
            console.error('SQL Pool Error:', err);
            // Attempt to close the pool on error to allow for reconnection.
            pool?.close();
            pool = null;
        });
        
        return pool;
    } catch (err: any) {
        console.error('MSSQL Connection Error on pool creation:', err);
        // Ensure pool is null if connection fails.
        pool = null;
        throw err;
    }
}

export const executeSQL = async (query: string, params: any[] = [], sqlConfig: SqlConfig | null) => {
    if (!sqlConfig || !sqlConfig.host) {
        throw new Error("SQL configuration is missing.");
    }
    
    let connectionPool: sql.ConnectionPool;
    try {
        connectionPool = await getConnection(sqlConfig);
        const request = connectionPool.request();

        params.forEach(p => {
            request.input(p.name, p.value);
        });

        const result = await request.query(query);
        
        if (result.recordset) {
            return result.recordset;
        } else {
            return { success: true, rowsAffected: result.rowsAffected[0] };
        }
    } catch (error: any) {
        console.error('SQL Execution Error:', error);
        
        let errorMessage = 'An internal server error occurred.';
        if (error.code === 'ELOGIN') {
            errorMessage = 'Login failed. Please check your username and password.';
        } else if (error.code === 'ETIMEOUT') {
            errorMessage = 'Connection timed out. Please check the server host, port, and network connectivity.';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Failed to connect. Please ensure the host is correct and accessible.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        // Catch specific table-not-found errors and provide a clearer message
        if (error.message && (error.message.toLowerCase().includes("invalid object name") || error.message.toLowerCase().includes("doesn't exist"))) {
             errorMessage = `Database table not found. Please go to Settings -> Database and click "Setup Database Tables". Error: ${error.message}`;
        }
        
        throw new Error(errorMessage);
    } 
};

export const bulkInsert = async (tableName: string, columns: { name: string; type: any; options?: any }[], data: any[], sqlConfig: SqlConfig | null) => {
    if (!sqlConfig || !sqlConfig.host) {
        throw new Error("SQL configuration is missing.");
    }
    let connectionPool: sql.ConnectionPool;
    try {
        connectionPool = await getConnection(sqlConfig);
        const table = new sql.Table(tableName);
        
        // Define table structure
        columns.forEach(col => {
            table.columns.add(col.name, col.type, col.options);
        });

        // Add rows
        data.forEach(item => {
            table.rows.add(...columns.map(col => item[col.name]));
        });

        const request = connectionPool.request();
        const result = await request.bulk(table);
        return { success: true, rowsAffected: result.rowsAffected };
    } catch (error: any) {
        console.error('SQL Bulk Insert Error:', error);
        throw new Error(error.message || 'Bulk insert failed.');
    }
};


const ensureTablesExist = async (pool: sql.ConnectionPool) => {
    const createTablesQuery = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Assets' and xtype='U')
        CREATE TABLE Assets (
            id NVARCHAR(255) PRIMARY KEY,
            make NVARCHAR(255) NULL,
            model NVARCHAR(255) NULL,
            assetTag NVARCHAR(255) NULL,
            serialNumber NVARCHAR(255) NULL,
            purchaseFrom NVARCHAR(255) NULL,
            ownership NVARCHAR(50) NULL,
            processor NVARCHAR(255) NULL,
            ram NVARCHAR(255) NULL,
            storage NVARCHAR(255) NULL,
            assetType NVARCHAR(255) NULL,
            status NVARCHAR(50) NULL,
            assignedTo NVARCHAR(255) NULL,
            comments NVARCHAR(MAX) NULL,
            auditLog NVARCHAR(MAX) NULL
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Employees' and xtype='U')
        CREATE TABLE Employees (
            id NVARCHAR(255) PRIMARY KEY,
            employeeId NVARCHAR(255) NULL,
            name NVARCHAR(255) NULL,
            department NVARCHAR(255) NULL,
            designation NVARCHAR(255) NULL,
            email NVARCHAR(255) NULL,
            phone NVARCHAR(255) NULL,
            joiningDate DATE NULL,
            status NVARCHAR(50) NULL,
            exitDate DATE NULL,
            exitReason NVARCHAR(MAX) NULL,
            comments NVARCHAR(MAX) NULL,
            auditLog NVARCHAR(MAX) NULL
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Vendors' and xtype='U')
        CREATE TABLE Vendors (
            id NVARCHAR(255) PRIMARY KEY,
            name NVARCHAR(255) NULL,
            contactPerson NVARCHAR(255) NULL,
            email NVARCHAR(255) NULL,
            phone NVARCHAR(255) NULL,
            address NVARCHAR(MAX) NULL,
            website NVARCHAR(255) NULL,
            products NVARCHAR(MAX) NULL,
            auditLog NVARCHAR(MAX) NULL
        );
        
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Software' and xtype='U')
        CREATE TABLE Software (
            id NVARCHAR(255) PRIMARY KEY,
            name NVARCHAR(255) NULL,
            version NVARCHAR(255) NULL,
            licenseKey NVARCHAR(255) NULL,
            vendorId NVARCHAR(255) NULL,
            purchaseDate DATE NULL,
            expiryDate DATE NULL,
            totalLicenses INT NULL,
            licenseType NVARCHAR(50) NULL,
            ownership NVARCHAR(50) NULL,
            status NVARCHAR(50) NULL,
            attachments NVARCHAR(MAX) NULL,
            assignedTo NVARCHAR(MAX) NULL,
            auditLog NVARCHAR(MAX) NULL
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Awards' and xtype='U')
        CREATE TABLE Awards (
            id NVARCHAR(255) PRIMARY KEY,
            name NVARCHAR(255) NULL,
            type NVARCHAR(50) NULL,
            employeeId NVARCHAR(255) NULL,
            department NVARCHAR(255) NULL,
            awardDate DATE NULL,
            awardedBy NVARCHAR(255) NULL,
            reason NVARCHAR(MAX) NULL,
            certificateTemplate NVARCHAR(255) NULL,
            isLocked BIT NULL
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Consumables' and xtype='U')
        CREATE TABLE Consumables (
            id NVARCHAR(255) PRIMARY KEY,
            name NVARCHAR(255) NULL,
            category NVARCHAR(255) NULL,
            quantity INT NULL,
            unitType NVARCHAR(50) NULL,
            purchaseDate DATE NULL,
            vendorId NVARCHAR(255) NULL,
            costPerItem DECIMAL(10, 2) NULL,
            remarks NVARCHAR(MAX) NULL,
            auditLog NVARCHAR(MAX) NULL,
            issueLog NVARCHAR(MAX) NULL
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
        CREATE TABLE Users (
            id NVARCHAR(255) PRIMARY KEY,
            name NVARCHAR(255) NULL,
            email NVARCHAR(255) NULL,
            phone NVARCHAR(255) NULL,
            role NVARCHAR(50) NULL,
            status NVARCHAR(50) NULL,
            tenantId NVARCHAR(255) NULL
        );
    `;
    await pool.request().query(createTablesQuery);
};

export const setupDatabase = async (sqlConfig: SqlConfig) => {
    let connectionPool: sql.ConnectionPool | null = null;
    try {
        connectionPool = await getConnection(sqlConfig);
        await ensureTablesExist(connectionPool);
        return { success: true, message: "Database tables checked and created successfully!" };
    } catch(error: any) {
        return { success: false, message: `Database setup failed: ${error.message}` };
    } finally {
        if (connectionPool) {
            await connectionPool.close();
            pool = null; // Reset pool after setup
        }
    }
}
