
'use client';

import type { Consumable, IssueLog } from '@/app/consumables/index';
import type { SqlConfig, DatabaseProvider } from '@/context/settings-context';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';

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

export const getConsumables = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string): Promise<Consumable[]> => {
    if (provider === 'sql') {
        try {
            const result = await callApi('getConsumables', { config, tenantId });
            return (result || []).map((item: any) => ({
                ...item,
                issueLog: typeof item.issueLog === 'string' ? JSON.parse(item.issueLog) : [],
                auditLog: typeof item.auditLog === 'string' ? JSON.parse(item.auditLog) : [],
            }));
        } catch (error: any) {
            if (error.message.includes("Invalid object name 'Consumables'")) {
                console.warn("Consumables table not found, returning empty array. Please set up the database.");
                return [];
            }
            throw error;
        }
    } else {
        const consumablesCol = collection(db, `tenants/${tenantId}/consumables`);
        const snapshot = await getDocs(consumablesCol);
        return snapshot.docs.map(doc => doc.data() as Consumable);
    }
};

export const addConsumable = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, consumable: Consumable): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addConsumable', { config, tenantId, consumable });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/consumables`, consumable.id);
        await setDoc(docRef, consumable);
    }
};

export const updateConsumable = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, consumable: Consumable): Promise<void> => {
    if (provider === 'sql') {
        await callApi('updateConsumable', { config, tenantId, consumable });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/consumables`, consumable.id);
        await setDoc(docRef, consumable, { merge: true });
    }
};

export const deleteConsumable = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteConsumable', { config, tenantId, id });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/consumables`, id);
        await deleteDoc(docRef);
    }
};

export const issueConsumable = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, consumableId: string, issueLog: IssueLog, employeeName: string): Promise<void> => {
    if (provider === 'sql') {
        await callApi('issueConsumable', { config, tenantId, consumableId, issueLog, employeeName });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/consumables`, consumableId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const consumable = docSnap.data() as Consumable;
            const newQuantity = consumable.quantity - issueLog.quantity;
            if (newQuantity < 0) throw new Error("Not enough stock");
            
            const newIssueLog = [...consumable.issueLog, issueLog];
            const newAuditLog = [...consumable.auditLog, {id: issueLog.id, action: 'Issued', date: new Date().toISOString(), details: `Issued ${issueLog.quantity} unit(s) to ${employeeName}`}];
            
            await updateDoc(docRef, { quantity: newQuantity, issueLog: newIssueLog, auditLog: newAuditLog });
        }
    }
};

export const revokeIssuedConsumable = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, consumableId: string, issueLog: IssueLog): Promise<void> => {
    if (provider === 'sql') {
        await callApi('revokeIssuedConsumable', { config, tenantId, consumableId, issueLog });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/consumables`, consumableId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const consumable = docSnap.data() as Consumable;
            const newQuantity = consumable.quantity + issueLog.quantity;
            const updatedIssueLog = consumable.issueLog.map((log: IssueLog) => log.id === issueLog.id ? { ...log, status: 'Reversed' } : log);
            const newAuditLog = [...consumable.auditLog, {id: issueLog.id, action: 'Issue Revoked', date: new Date().toISOString(), details: `Revoked issue of ${issueLog.quantity} unit(s).`}];
            
            await updateDoc(docRef, { quantity: newQuantity, issueLog: updatedIssueLog, auditLog: newAuditLog });
        }
    }
};
