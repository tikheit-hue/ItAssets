
'use client';

import type { Award } from '@/app/awards/page';
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

export const getAwards = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string): Promise<Award[]> => {
    if (provider === 'sql') {
        try {
            const result = await callApi('getAwards', { config, tenantId });
            return (result || []).map((a: any) => ({...a, isLocked: a.isLocked === 1}));
        } catch (error: any) {
            if (error.message.includes("Invalid object name 'Awards'")) {
                console.warn("Awards table not found, returning empty array. Please set up the database.");
                return [];
            }
            throw error;
        }
    } else {
        const awardsCol = collection(db, `tenants/${tenantId}/awards`);
        const snapshot = await getDocs(awardsCol);
        return snapshot.docs.map(doc => doc.data() as Award);
    }
};

export const addAward = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, award: Award): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addAward', { config, tenantId, award });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/awards`, award.id);
        await setDoc(docRef, award);
    }
};

export const updateAward = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, award: Award): Promise<void> => {
    if (provider === 'sql') {
        await callApi('updateAward', { config, tenantId, award });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/awards`, award.id);
        await setDoc(docRef, award, { merge: true });
    }
};

export const deleteAward = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteAward', { config, tenantId, id });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/awards`, id);
        await deleteDoc(docRef);
    }
};
