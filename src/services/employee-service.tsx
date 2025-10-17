
'use client';

import type { Employee, Comment } from '@/app/employees/index';
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

export const getEmployees = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string): Promise<Employee[]> => {
    if (provider === 'sql') {
        try {
            const result = await callApi('getEmployees', { config, tenantId });
            return (result || []).map((emp: any) => ({
                ...emp,
                comments: typeof emp.comments === 'string' ? JSON.parse(emp.comments) : [],
                auditLog: typeof emp.auditLog === 'string' ? JSON.parse(emp.auditLog) : [],
            }));
        } catch (error: any) {
            if (error.message.includes("Invalid object name 'Employees'")) {
                console.warn("Employees table not found, returning empty array. Please set up the database.");
                return [];
            }
            throw error;
        }
    } else {
        const employeesCol = collection(db, `tenants/${tenantId}/employees`);
        const snapshot = await getDocs(employeesCol);
        return snapshot.docs.map(doc => doc.data() as Employee);
    }
};

export const getEmployee = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<Employee | null> => {
    if (provider === 'sql') {
        const result = await callApi('getEmployee', { config, tenantId, id });
        const emp = result[0];
        if (emp) {
            return {
                ...emp,
                comments: typeof emp.comments === 'string' ? JSON.parse(emp.comments) : [],
                auditLog: typeof emp.auditLog === 'string' ? JSON.parse(emp.auditLog) : [],
            };
        }
        return null;
    } else {
        const docRef = doc(db, `tenants/${tenantId}/employees`, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as Employee : null;
    }
};

export const addEmployee = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, employee: Omit<Employee, "id" | "comments" | "auditLog">): Promise<void> => {
    const newEmployee: Employee = {
        ...employee,
        id: uuidv4(),
        comments: [],
        auditLog: [{
            id: uuidv4(),
            action: 'Created',
            date: new Date().toISOString(),
            details: 'Employee created manually',
        }],
    };
    if (provider === 'sql') {
        await callApi('addEmployee', { config, tenantId, employee: newEmployee });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/employees`, newEmployee.id);
        await setDoc(docRef, newEmployee);
    }
};

export const addEmployees = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, employees: Employee[]): Promise<void> => {
    if (provider === 'sql') {
        await callApi('addEmployees', { config, tenantId, employees });
    } else {
        const promises = employees.map(employee => {
            const docRef = doc(db, `tenants/${tenantId}/employees`, employee.id);
            return setDoc(docRef, employee);
        });
        await Promise.all(promises);
    }
};

export const updateEmployee = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, employee: Employee): Promise<void> => {
    if (provider === 'sql') {
        await callApi('updateEmployee', { config, tenantId, employee });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/employees`, employee.id);
        await setDoc(docRef, employee, { merge: true });
    }
};

export const deleteEmployee = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteEmployee', { config, tenantId, id });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/employees`, id);
        await deleteDoc(docRef);
    }
};

export const deleteEmployees = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, ids: string[]): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteEmployees', { config, tenantId, ids });
    } else {
        const promises = ids.map(id => {
            const docRef = doc(db, `tenants/${tenantId}/employees`, id);
            return deleteDoc(docRef);
        });
        await Promise.all(promises);
    }
};

export const addCommentToEmployee = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, employeeId: string, commentText: string): Promise<void> => {
    const newComment: Comment = {
        id: uuidv4(),
        text: commentText,
        date: new Date().toISOString(),
    };
    if (provider === 'sql') {
        await callApi('addCommentToEmployee', { config, tenantId, employeeId, comment: newComment });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/employees`, employeeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const employee = docSnap.data() as Employee;
            const newComments = [...employee.comments, newComment];
            await updateDoc(docRef, { comments: newComments });
        }
    }
};
