
'use client';

import type { Asset, Comment, AuditLog } from '@/app/assets/index';
import type { SqlConfig, DatabaseProvider } from '@/context/settings-context';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

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

export const getAssets = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string): Promise<Asset[]> => {
    if (provider === 'sql') {
        try {
            const result = await callApi('getAssets', { config, tenantId });
            return (result || []).map((asset: any) => ({
                ...asset,
                comments: typeof asset.comments === 'string' ? JSON.parse(asset.comments) : [],
                auditLog: typeof asset.auditLog === 'string' ? JSON.parse(asset.auditLog) : [],
            }));
        } catch (error: any) {
            if (error.message.includes("Invalid object name 'Assets'")) {
                console.warn("Assets table not found, returning empty array. Please set up the database.");
                return [];
            }
            throw error;
        }
    } else {
        const assetsCol = collection(db, `tenants/${tenantId}/assets`);
        const snapshot = await getDocs(assetsCol);
        return snapshot.docs.map(doc => doc.data() as Asset);
    }
};

export const getAsset = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<Asset | null> => {
    if (provider === 'sql') {
        const result = await callApi('getAsset', { config, tenantId, id });
        const asset = result[0];
        if (asset) {
            return {
                ...asset,
                comments: typeof asset.comments === 'string' ? JSON.parse(asset.comments) : [],
                auditLog: typeof asset.auditLog === 'string' ? JSON.parse(asset.auditLog) : [],
            };
        }
        return null;
    } else {
        const docRef = doc(db, `tenants/${tenantId}/assets`, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as Asset : null;
    }
}

export const addAsset = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, asset: Asset): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addAsset', { config, tenantId, asset });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/assets`, asset.id);
        await setDoc(docRef, asset);
    }
};

export const addAssets = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, assets: Asset[]): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addAssets', { config, tenantId, assets });
    } else {
        const promises = assets.map(asset => {
            const docRef = doc(db, `tenants/${tenantId}/assets`, asset.id);
            return setDoc(docRef, asset);
        });
        await Promise.all(promises);
    }
};

export const updateAsset = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, asset: Asset): Promise<void> => {
    if (provider === 'sql') {
        await callApi('updateAsset', { config, tenantId, asset });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/assets`, asset.id);
        await setDoc(docRef, asset, { merge: true });
    }
};

export const updateAssets = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, assetIds: string[], data: Partial<Asset>): Promise<void> => {
    if (provider === 'sql') {
        await callApi('updateAssets', { config, tenantId, assetIds, data });
    } else {
        const promises = assetIds.map(id => {
            const docRef = doc(db, `tenants/${tenantId}/assets`, id);
            return updateDoc(docRef, data);
        });
        await Promise.all(promises);
    }
};

export const deleteAsset = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteAsset', { config, tenantId, id });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/assets`, id);
        await deleteDoc(docRef);
    }
};

export const deleteAssets = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, ids: string[]): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteAssets', { config, tenantId, ids });
    } else {
        const promises = ids.map(id => {
            const docRef = doc(db, `tenants/${tenantId}/assets`, id);
            return deleteDoc(docRef);
        });
        await Promise.all(promises);
    }
};

export const addCommentToAsset = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, assetId: string, comment: Comment, auditLog: AuditLog): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addCommentToAsset', { config, tenantId, assetId, comment, auditLog });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/assets`, assetId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const asset = docSnap.data() as Asset;
            const newComments = [...asset.comments, comment];
            const newAuditLog = [...asset.auditLog, auditLog];
            await updateDoc(docRef, { comments: newComments, auditLog: newAuditLog });
        }
    }
};
