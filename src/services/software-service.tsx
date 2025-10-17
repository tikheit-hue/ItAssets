
'use client';

import type { Software } from '@/app/software/index';
import type { SqlConfig, DatabaseProvider } from '@/context/settings-context';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';


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

export const getSoftware = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string): Promise<Software[]> => {
    if (provider === 'sql') {
        try {
            const result = await callApi('getSoftware', { config, tenantId });
            return (result || []).map((sw: any) => ({
                ...sw,
                attachments: typeof sw.attachments === 'string' ? JSON.parse(sw.attachments) : [],
                assignedTo: typeof sw.assignedTo === 'string' ? JSON.parse(sw.assignedTo) : [],
                auditLog: typeof sw.auditLog === 'string' ? JSON.parse(sw.auditLog) : [],
            }));
        } catch (error: any) {
            if (error.message.includes("Invalid object name 'Software'")) {
                console.warn("Software table not found, returning empty array. Please set up the database.");
                return [];
            }
            throw error;
        }
    } else {
        const softwareCol = collection(db, `tenants/${tenantId}/software`);
        const snapshot = await getDocs(softwareCol);
        return snapshot.docs.map(doc => doc.data() as Software);
    }
};

export const addSoftware = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, software: Software): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addSoftware', { config, tenantId, software });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/software`, software.id);
        await setDoc(docRef, software);
    }
};

export const addSoftwareList = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, softwareList: Software[]): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addSoftwareList', { config, tenantId, softwareList });
    } else {
        const promises = softwareList.map(sw => {
            const docRef = doc(db, `tenants/${tenantId}/software`, sw.id);
            return setDoc(docRef, sw);
        });
        await Promise.all(promises);
    }
};

export const updateSoftware = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, software: Software): Promise<void> => {
    if (provider === 'sql') {
        await callApi('updateSoftware', { config, tenantId, software });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/software`, software.id);
        await setDoc(docRef, software, { merge: true });
    }
};

export const deleteSoftware = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteSoftware', { config, tenantId, id });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/software`, id);
        await deleteDoc(docRef);
    }
};

export const deleteSoftwareList = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, ids: string[]): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteSoftwareList', { config, tenantId, ids });
    } else {
        const promises = ids.map(id => {
            const docRef = doc(db, `tenants/${tenantId}/software`, id);
            return deleteDoc(docRef);
        });
        await Promise.all(promises);
    }
};
