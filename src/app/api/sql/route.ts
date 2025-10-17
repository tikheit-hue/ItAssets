
import { NextResponse } from 'next/server';
import { executeSQL, setupDatabase, bulkInsert } from '@/services/sql-service';
import type { SqlConfig } from '@/context/settings-context';
import type { Asset } from '@/app/assets/index';
import type { Employee } from '@/app/employees/index';
import type { Vendor } from '@/app/vendors/index';
import type { Software } from '@/app/software/index';
import type { Award } from '@/app/awards/page';
import type { Consumable, IssueLog } from '@/app/consumables/index';
import type { User } from '@/services/user-service';
import sql from 'mssql';

const getAssetParams = (asset: Asset) => Object.entries(asset).map(([key, value]) => {
    if (key === 'comments' || key === 'auditLog') return { name: key, value: JSON.stringify(value || []) };
    return { name: key, value: value === undefined ? null : value };
});
const getEmployeeParams = (employee: Employee) => Object.entries(employee).map(([key, value]) => {
    if (key === 'comments' || key === 'auditLog') return { name: key, value: JSON.stringify(value || []) };
    return { name: key, value: value === undefined ? null : value };
});
const getVendorParams = (vendor: Vendor) => Object.entries(vendor).map(([key, value]) => {
    if (key === 'products' || key === 'auditLog') return { name: key, value: JSON.stringify(value || []) };
    return { name: key, value: value === undefined ? null : value };
});
const getSoftwareParams = (software: Software) => Object.entries(software).map(([key, value]) => {
    if (key === 'attachments' || key === 'assignedTo' || key === 'auditLog') return { name: key, value: JSON.stringify(value || []) };
    return { name: key, value: value === undefined ? null : value };
});
const getAwardParams = (award: Award) => Object.entries(award).map(([key, value]) => ({ name: key, value: typeof value === 'boolean' ? (value ? 1 : 0) : value }));
const getConsumableParams = (consumable: Consumable) => Object.entries(consumable).map(([key, value]) => {
    if (key === 'issueLog' || key === 'auditLog') return { name: key, value: JSON.stringify(value || []) };
    return { name: key, value: value === undefined ? null : value };
});

const assetColumns = [
    { name: 'id', type: sql.NVarChar(255) }, { name: 'make', type: sql.NVarChar(255) },
    { name: 'model', type: sql.NVarChar(255) }, { name: 'assetTag', type: sql.NVarChar(255) },
    { name: 'serialNumber', type: sql.NVarChar(255) }, { name: 'purchaseFrom', type: sql.NVarChar(255) },
    { name: 'ownership', type: sql.NVarChar(50) }, { name: 'processor', type: sql.NVarChar(255) },
    { name: 'ram', type: sql.NVarChar(255) }, { name: 'storage', type: sql.NVarChar(255) },
    { name: 'assetType', type: sql.NVarChar(255) }, { name: 'status', type: sql.NVarChar(50) },
    { name: 'assignedTo', type: sql.NVarChar(255) },
    { name: 'comments', type: sql.NVarChar(sql.MAX) }, { name: 'auditLog', type: sql.NVarChar(sql.MAX) }
];
const employeeColumns = [
    { name: 'id', type: sql.NVarChar(255) }, { name: 'employeeId', type: sql.NVarChar(255) },
    { name: 'name', type: sql.NVarChar(255) }, { name: 'department', type: sql.NVarChar(255) },
    { name: 'designation', type: sql.NVarChar(255) }, { name: 'email', type: sql.NVarChar(255) },
    { name: 'phone', type: sql.NVarChar(255) }, { name: 'joiningDate', type: sql.Date },
    { name: 'status', type: sql.NVarChar(50) }, { name: 'exitDate', type: sql.Date },
    { name: 'exitReason', type: sql.NVarChar(sql.MAX) }, { name: 'comments', type: sql.NVarChar(sql.MAX) },
    { name: 'auditLog', type: sql.NVarChar(sql.MAX) }
];
const vendorColumns = [
    { name: 'id', type: sql.NVarChar(255) }, { name: 'name', type: sql.NVarChar(255) },
    { name: 'contactPerson', type: sql.NVarChar(255) }, { name: 'email', type: sql.NVarChar(255) },
    { name: 'phone', type: sql.NVarChar(255) }, { name: 'address', type: sql.NVarChar(sql.MAX) },
    { name: 'website', type: sql.NVarChar(255) },
    { name: 'products', type: sql.NVarChar(sql.MAX) }, { name: 'auditLog', type: sql.NVarChar(sql.MAX) }
];
const softwareColumns = [
    { name: 'id', type: sql.NVarChar(255) }, { name: 'name', type: sql.NVarChar(255) },
    { name: 'version', type: sql.NVarChar(255) }, { name: 'licenseKey', type: sql.NVarChar(255) },
    { name: 'vendorId', type: sql.NVarChar(255) }, { name: 'purchaseDate', type: sql.Date },
    { name: 'expiryDate', type: sql.Date }, { name: 'totalLicenses', type: sql.Int },
    { name: 'licenseType', type: sql.NVarChar(50) }, { name: 'ownership', type: sql.NVarChar(50) },
    { name: 'status', type: sql.NVarChar(50) },
    { name: 'attachments', type: sql.NVarChar(sql.MAX) }, { name: 'assignedTo', type: sql.NVarChar(sql.MAX) },
    { name: 'auditLog', type: sql.NVarChar(sql.MAX) }
];


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, config, ...payload } = body as { action: string, config: SqlConfig, [key: string]: any };

    switch (action) {
      case 'setup':
        return NextResponse.json(await setupDatabase(config));
      
      // Assets
      case 'getAssets':
        return NextResponse.json(await executeSQL('SELECT * FROM Assets', [], config));
      case 'getAsset':
        return NextResponse.json(await executeSQL('SELECT * FROM Assets WHERE id = @id', [{ name: 'id', value: payload.id }], config));
      case 'addAsset':
        return NextResponse.json(await executeSQL('INSERT INTO Assets (id, make, model, assetTag, serialNumber, purchaseFrom, ownership, processor, ram, storage, assetType, status, assignedTo, comments, auditLog) VALUES (@id, @make, @model, @assetTag, @serialNumber, @purchaseFrom, @ownership, @processor, @ram, @storage, @assetType, @status, @assignedTo, @comments, @auditLog)', getAssetParams(payload.asset), config));
      case 'addAssets':
        const assetData = payload.assets.map((asset: Asset) => ({
            ...asset,
            comments: JSON.stringify(asset.comments || []),
            auditLog: JSON.stringify(asset.auditLog || [])
        }));
        return NextResponse.json(await bulkInsert('Assets', assetColumns, assetData, config));
      case 'updateAsset':
        return NextResponse.json(await executeSQL('UPDATE Assets SET make = @make, model = @model, assetTag = @assetTag, serialNumber = @serialNumber, purchaseFrom = @purchaseFrom, ownership = @ownership, processor = @processor, ram = @ram, storage = @storage, assetType = @assetType, status = @status, assignedTo = @assignedTo, comments = @comments, auditLog = @auditLog WHERE id = @id', getAssetParams(payload.asset), config));
      case 'updateAssets':
        for (const id of payload.assetIds) {
            const currentAssetResult = await executeSQL('SELECT * FROM Assets WHERE id = @id', [{ name: 'id', value: id }], config);
            const currentAsset = (currentAssetResult as Asset[])[0];
            if(currentAsset) {
                const updatedAsset = { ...currentAsset, ...payload.data };
                await executeSQL('UPDATE Assets SET make = @make, model = @model, assetTag = @assetTag, serialNumber = @serialNumber, purchaseFrom = @purchaseFrom, ownership = @ownership, processor = @processor, ram = @ram, storage = @storage, assetType = @assetType, status = @status, assignedTo = @assignedTo, comments = @comments, auditLog = @auditLog WHERE id = @id', getAssetParams(updatedAsset), config);
            }
        }
        return NextResponse.json({ success: true });
      case 'deleteAsset':
        return NextResponse.json(await executeSQL('DELETE FROM Assets WHERE id = @id', [{ name: 'id', value: payload.id }], config));
      case 'deleteAssets':
         return NextResponse.json(await executeSQL(`DELETE FROM Assets WHERE id IN (${payload.ids.map((_: any, i: number) => `@id${i}`).join(',')})`, payload.ids.map((id: string, i: number) => ({ name: `id${i}`, value: id })), config));
      case 'addCommentToAsset':
        const assetRes = await executeSQL('SELECT comments, auditLog FROM Assets WHERE id = @id', [{ name: 'id', value: payload.assetId }], config);
        const asset = (assetRes as any[])[0];
        if (asset) {
            const newComments = [...(typeof asset.comments === 'string' ? JSON.parse(asset.comments) : []), payload.comment];
            const newAuditLog = [...(typeof asset.auditLog === 'string' ? JSON.parse(asset.auditLog) : []), payload.auditLog];
            return NextResponse.json(await executeSQL('UPDATE Assets SET comments = @comments, auditLog = @auditLog WHERE id = @id', [{ name: 'id', value: payload.assetId }, { name: 'comments', value: JSON.stringify(newComments) }, { name: 'auditLog', value: JSON.stringify(newAuditLog) }], config));
        }
        return NextResponse.json({ success: false, message: 'Asset not found' }, { status: 404 });

      // Employees
      case 'getEmployees':
        return NextResponse.json(await executeSQL('SELECT * FROM Employees', [], config));
      case 'getEmployee':
        return NextResponse.json(await executeSQL('SELECT * FROM Employees WHERE id = @id', [{ name: 'id', value: payload.id }], config));
      case 'addEmployee':
        return NextResponse.json(await executeSQL('INSERT INTO Employees (id, employeeId, name, department, designation, email, phone, joiningDate, status, exitDate, exitReason, comments, auditLog) VALUES (@id, @employeeId, @name, @department, @designation, @email, @phone, @joiningDate, @status, @exitDate, @exitReason, @comments, @auditLog)', getEmployeeParams(payload.employee), config));
      case 'addEmployees':
        const employeeData = payload.employees.map((emp: Employee) => ({
            ...emp,
            comments: JSON.stringify(emp.comments || []),
            auditLog: JSON.stringify(emp.auditLog || [])
        }));
        return NextResponse.json(await bulkInsert('Employees', employeeColumns, employeeData, config));
      case 'updateEmployee':
        return NextResponse.json(await executeSQL('UPDATE Employees SET employeeId = @employeeId, name = @name, department = @department, designation = @designation, email = @email, phone = @phone, joiningDate = @joiningDate, status = @status, exitDate = @exitDate, exitReason = @exitReason, comments = @comments, auditLog = @auditLog WHERE id = @id', getEmployeeParams(payload.employee), config));
      case 'deleteEmployee':
        return NextResponse.json(await executeSQL('DELETE FROM Employees WHERE id = @id', [{ name: 'id', value: payload.id }], config));
      case 'deleteEmployees':
        return NextResponse.json(await executeSQL(`DELETE FROM Employees WHERE id IN (${payload.ids.map((_: any, i: number) => `@id${i}`).join(',')})`, payload.ids.map((id: string, i: number) => ({ name: `id${i}`, value: id })), config));
      case 'addCommentToEmployee':
        const empRes = await executeSQL('SELECT comments FROM Employees WHERE id = @id', [{ name: 'id', value: payload.employeeId }], config);
        const emp = (empRes as any[])[0];
        if (emp) {
            const newComments = [...(typeof emp.comments === 'string' ? JSON.parse(emp.comments) : []), payload.comment];
            return NextResponse.json(await executeSQL('UPDATE Employees SET comments = @comments WHERE id = @id', [{ name: 'id', value: payload.employeeId }, { name: 'comments', value: JSON.stringify(newComments) }], config));
        }
         return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
     
     // Vendors
      case 'getVendors':
        return NextResponse.json(await executeSQL('SELECT * FROM Vendors', [], config));
      case 'addVendor':
        return NextResponse.json(await executeSQL('INSERT INTO Vendors (id, name, contactPerson, email, phone, address, website, products, auditLog) VALUES (@id, @name, @contactPerson, @email, @phone, @address, @website, @products, @auditLog)', getVendorParams(payload.vendor), config));
      case 'addVendors':
        const vendorData = payload.vendors.map((vendor: Vendor) => ({
            ...vendor,
            products: JSON.stringify(vendor.products || []),
            auditLog: JSON.stringify(vendor.auditLog || [])
        }));
        return NextResponse.json(await bulkInsert('Vendors', vendorColumns, vendorData, config));
      case 'updateVendor':
        return NextResponse.json(await executeSQL('UPDATE Vendors SET name = @name, contactPerson = @contactPerson, email = @email, phone = @phone, address = @address, website = @website, products = @products, auditLog = @auditLog WHERE id = @id', getVendorParams(payload.vendor), config));
      case 'deleteVendor':
        return NextResponse.json(await executeSQL('DELETE FROM Vendors WHERE id = @id', [{ name: 'id', value: payload.id }], config));
      case 'deleteVendors':
        return NextResponse.json(await executeSQL(`DELETE FROM Vendors WHERE id IN (${payload.ids.map((_: any, i: number) => `@id${i}`).join(',')})`, payload.ids.map((id: string, i: number) => ({ name: `id${i}`, value: id })), config));

      // Software
      case 'getSoftware':
        return NextResponse.json(await executeSQL('SELECT * FROM Software', [], config));
      case 'addSoftware':
        return NextResponse.json(await executeSQL('INSERT INTO Software (id, name, version, licenseKey, vendorId, purchaseDate, expiryDate, totalLicenses, licenseType, ownership, status, attachments, assignedTo, auditLog) VALUES (@id, @name, @version, @licenseKey, @vendorId, @purchaseDate, @expiryDate, @totalLicenses, @licenseType, @ownership, @status, @attachments, @assignedTo, @auditLog)', getSoftwareParams(payload.software), config));
      case 'addSoftwareList':
        const softwareData = payload.softwareList.map((sw: Software) => ({
            ...sw,
            attachments: JSON.stringify(sw.attachments || []),
            assignedTo: JSON.stringify(sw.assignedTo || []),
            auditLog: JSON.stringify(sw.auditLog || [])
        }));
        return NextResponse.json(await bulkInsert('Software', softwareColumns, softwareData, config));
      case 'updateSoftware':
        return NextResponse.json(await executeSQL('UPDATE Software SET name = @name, version = @version, licenseKey = @licenseKey, vendorId = @vendorId, purchaseDate = @purchaseDate, expiryDate = @expiryDate, totalLicenses = @totalLicenses, licenseType = @licenseType, ownership = @ownership, status = @status, attachments = @attachments, assignedTo = @assignedTo, auditLog = @auditLog WHERE id = @id', getSoftwareParams(payload.software), config));
      case 'deleteSoftware':
        return NextResponse.json(await executeSQL('DELETE FROM Software WHERE id = @id', [{ name: 'id', value: payload.id }], config));
      case 'deleteSoftwareList':
        return NextResponse.json(await executeSQL(`DELETE FROM Software WHERE id IN (${payload.ids.map((_: any, i: number) => `@id${i}`).join(',')})`, payload.ids.map((id: string, i: number) => ({ name: `id${i}`, value: id })), config));
        
      // Awards
      case 'getAwards':
        return NextResponse.json(await executeSQL('SELECT * FROM Awards', [], config));
      case 'addAward':
        return NextResponse.json(await executeSQL('INSERT INTO Awards (id, name, type, employeeId, department, awardDate, awardedBy, reason, certificateTemplate, isLocked) VALUES (@id, @name, @type, @employeeId, @department, @awardDate, @awardedBy, @reason, @certificateTemplate, @isLocked)', getAwardParams(payload.award), config));
      case 'updateAward':
        return NextResponse.json(await executeSQL('UPDATE Awards SET name = @name, type = @type, employeeId = @employeeId, department = @department, awardDate = @awardDate, awardedBy = @awardedBy, reason = @reason, certificateTemplate = @certificateTemplate, isLocked = @isLocked WHERE id = @id', getAwardParams(payload.award), config));
      case 'deleteAward':
        return NextResponse.json(await executeSQL('DELETE FROM Awards WHERE id = @id', [{ name: 'id', value: payload.id }], config));
        
      // Consumables
      case 'getConsumables':
        return NextResponse.json(await executeSQL('SELECT * FROM Consumables', [], config));
      case 'addConsumable':
         return NextResponse.json(await executeSQL('INSERT INTO Consumables (id, name, category, quantity, unitType, purchaseDate, vendorId, costPerItem, remarks, auditLog, issueLog) VALUES (@id, @name, @category, @quantity, @unitType, @purchaseDate, @vendorId, @costPerItem, @remarks, @auditLog, @issueLog)', getConsumableParams(payload.consumable), config));
      case 'updateConsumable':
        return NextResponse.json(await executeSQL('UPDATE Consumables SET name = @name, category = @category, quantity = @quantity, unitType = @unitType, purchaseDate = @purchaseDate, vendorId = @vendorId, costPerItem = @costPerItem, remarks = @remarks, auditLog = @auditLog, issueLog = @issueLog WHERE id = @id', getConsumableParams(payload.consumable), config));
      case 'deleteConsumable':
        return NextResponse.json(await executeSQL('DELETE FROM Consumables WHERE id = @id', [{ name: 'id', value: payload.id }], config));
      case 'issueConsumable':
        const itemRes = await executeSQL('SELECT * FROM Consumables WHERE id = @id', [{name: 'id', value: payload.consumableId}], config) as Consumable[];
        const item = itemRes[0];
        if (!item) return NextResponse.json({ success: false, message: 'Consumable not found'}, {status: 404});

        const newQuantity = item.quantity - payload.issueLog.quantity;
        if (newQuantity < 0) return NextResponse.json({ success: false, message: 'Not enough stock'}, {status: 400});

        const newIssueLog = [...(typeof item.issueLog === 'string' ? JSON.parse(item.issueLog) : []), payload.issueLog];
        const newAuditLog = [...(typeof item.auditLog === 'string' ? JSON.parse(item.auditLog) : []), {id: payload.issueLog.id, action: 'Issued', date: new Date().toISOString(), details: `Issued ${payload.issueLog.quantity} unit(s) to ${payload.employeeName}`}];
        
        const updatedItem = {...item, quantity: newQuantity, issueLog: newIssueLog, auditLog: newAuditLog };
        return NextResponse.json(await executeSQL('UPDATE Consumables SET quantity = @quantity, issueLog = @issueLog, auditLog = @auditLog WHERE id = @id', [{name: 'id', value: updatedItem.id}, {name: 'quantity', value: updatedItem.quantity}, {name: 'issueLog', value: JSON.stringify(updatedItem.issueLog)}, {name: 'auditLog', value: JSON.stringify(updatedItem.auditLog)}], config));
      case 'revokeIssuedConsumable':
          const itemToRevokeRes = await executeSQL('SELECT * FROM Consumables WHERE id = @id', [{name: 'id', value: payload.consumableId}], config) as Consumable[];
          const itemToRevoke = itemToRevokeRes[0];
          if (!itemToRevoke) return NextResponse.json({ success: false, message: 'Consumable not found'}, {status: 404});

          const newRevokeQuantity = itemToRevoke.quantity + payload.issueLog.quantity;
          const updatedRevokeIssueLog = (typeof itemToRevoke.issueLog === 'string' ? JSON.parse(itemToRevoke.issueLog) : []).map((log: IssueLog) => log.id === payload.issueLog.id ? { ...log, status: 'Reversed' } : log);
          const newRevokeAuditLog = [...(typeof itemToRevoke.auditLog === 'string' ? JSON.parse(itemToRevoke.auditLog) : []), {id: payload.issueLog.id, action: 'Issue Revoked', date: new Date().toISOString(), details: `Revoked issue of ${payload.issueLog.quantity} unit(s).`}];

          const updatedRevokeItem = {...itemToRevoke, quantity: newRevokeQuantity, issueLog: updatedRevokeIssueLog, auditLog: newRevokeAuditLog };
          return NextResponse.json(await executeSQL('UPDATE Consumables SET quantity = @quantity, issueLog = @issueLog, auditLog = @auditLog WHERE id = @id', [{name: 'id', value: updatedRevokeItem.id}, {name: 'quantity', value: updatedRevokeItem.quantity}, {name: 'issueLog', value: JSON.stringify(updatedRevokeItem.issueLog)}, {name: 'auditLog', value: JSON.stringify(updatedRevokeItem.auditLog)}], config));
        
      // Users
      case 'getUsers':
        return NextResponse.json(await executeSQL('SELECT * FROM Users WHERE tenantId = @tenantId', [{ name: 'tenantId', value: payload.tenantId }], config));
      case 'addUser':
        return NextResponse.json(await executeSQL('INSERT INTO Users (id, name, email, phone, role, status, tenantId) VALUES (@id, @name, @email, @phone, @role, @status, @tenantId)', Object.entries(payload.user).map(([key, value]) => ({ name: key, value })), config));
      case 'updateUser':
        return NextResponse.json(await executeSQL('UPDATE Users SET name = @name, email = @email, phone = @phone, role = @role, status = @status WHERE id = @id AND tenantId = @tenantId', Object.entries(payload.user).map(([key, value]) => ({ name: key, value })), config));
      case 'deleteUser':
        return NextResponse.json(await executeSQL('DELETE FROM Users WHERE id = @id AND tenantId = @tenantId', [{ name: 'id', value: payload.id }, { name: 'tenantId', value: payload.tenantId }], config));
      
      default:
        return NextResponse.json({ success: false, message: `Action not found: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
