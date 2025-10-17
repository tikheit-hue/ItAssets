
'use client';

import type { Vendor } from '@/app/vendors/index';
import type { SqlConfig, DatabaseProvider } from '@/context/settings-context';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const callApi = async (action: string, payload: any) => {
    const response = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || 'API call failed');
    }
    return result;
}

export const getVendors = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string): Promise<Vendor[]> => {
    if (provider === 'sql') {
        try {
            const result = await callApi('getVendors', { config, tenantId });
            return (result || []).map((vendor: any) => ({
                ...vendor,
                products: typeof vendor.products === 'string' ? JSON.parse(vendor.products) : [],
                auditLog: typeof vendor.auditLog === 'string' ? JSON.parse(vendor.auditLog) : [],
            }));
        } catch (error: any) {
            if (error.message.includes("Invalid object name 'Vendors'")) {
                console.warn("Vendors table not found, returning empty array. Please set up the database.");
                return [];
            }
            throw error;
        }
    } else {
        const vendorsCol = collection(db, `tenants/${tenantId}/vendors`);
        try {
            const snapshot = await getDocs(vendorsCol);
            return snapshot.docs.map(doc => doc.data() as Vendor);
        } catch (error) {
            // Create the rich, contextual error.
            const permissionError = new FirestorePermissionError({
                path: vendorsCol.path,
                operation: 'list',
            });
            // Emit the error for the listener to catch.
            errorEmitter.emit('permission-error', permissionError);
            // Return empty array to allow the app to continue rendering.
            return [];
        }
    }
};

export const addVendor = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, vendor: Omit<Vendor, 'id' | 'auditLog'>): Promise<void> => {
     const newVendor: Vendor = {
        ...vendor,
        id: uuidv4(),
        auditLog: [{
            id: uuidv4(),
            action: 'Created',
            date: new Date().toISOString(),
            details: 'Vendor created manually',
        }],
    };
    if (provider === 'sql') {
        await callApi('addVendor', { config, tenantId, vendor: newVendor });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/vendors`, newVendor.id);
        setDoc(docRef, newVendor).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: newVendor,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
};

export const addVendors = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, vendors: Vendor[]): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addVendors', { config, tenantId, vendors });
    } else {
        const promises = vendors.map(vendor => {
            const docRef = doc(db, `tenants/${tenantId}/vendors`, vendor.id);
            return setDoc(docRef, vendor).catch(error => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'create',
                    requestResourceData: vendor,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
        });
        await Promise.all(promises);
    }
};

export const updateVendor = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, vendor: Vendor): Promise<void> => {
    if (provider === 'sql') {
        await callApi('updateVendor', { config, tenantId, vendor });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/vendors`, vendor.id);
        setDoc(docRef, vendor, { merge: true }).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: vendor,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
};

export const deleteVendor = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteVendor', { config, tenantId, id });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/vendors`, id);
        deleteDoc(docRef).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
};

export const deleteVendors = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, ids: string[]): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteVendors', { config, tenantId, ids });
    } else {
        const promises = ids.map(id => {
            const docRef = doc(db, `tenants/${tenantId}/vendors`, id);
            return deleteDoc(docRef).catch(error => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            });
        });
        await Promise.all(promises);
    }
};
