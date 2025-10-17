
import type { SqlConfig, DatabaseProvider } from '@/context/settings-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

export type User = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    status: 'Active' | 'Inactive';
    tenantId: string;
};

export type UserRole = "SuperAdmin" | "Employee" | "Manager" | "TenantAdmin";

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

export const getUsers = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string): Promise<User[]> => {
    if (provider === 'sql') {
        try {
            const result = await callApi('getUsers', { config, tenantId });
            return result || [];
        } catch (error: any) {
            if (error.message.includes("Invalid object name 'Users'")) {
                console.warn("Users table not found, returning empty array. Please set up the database.");
                return [];
            }
            throw error;
        }
    } else {
        const usersCol = collection(db, `tenants/${tenantId}/users`);
        const snapshot = await getDocs(usersCol);
        return snapshot.docs.map(doc => doc.data() as User);
    }
};

export const addUser = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, user: User): Promise<void> => {
    if (provider === 'sql') {
        try {
            await callApi('addUser', { config, tenantId, user });
        } catch (error: any) {
            if (error.message.includes("Invalid object name 'Users'")) {
                console.warn("Users table not found, skipping user creation in DB. Please set up the database.");
                return; // Don't crash the app during signup
            }
            throw error;
        }
    } else {
        const docRef = doc(db, `tenants/${tenantId}/users`, user.id);
        await setDoc(docRef, user);
    }
};

export const updateUser = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, user: User): Promise<void> => {
    if (provider === 'sql') {
        await callApi('updateUser', { config, tenantId, user });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/users`, user.id);
        await setDoc(docRef, user, { merge: true });
    }
};

export const deleteUser = async (provider: DatabaseProvider, config: SqlConfig | null, tenantId: string, id: string): Promise<void> => {
    if (provider === 'sql') {
        await callApi('deleteUser', { config, tenantId, id });
    } else {
        const docRef = doc(db, `tenants/${tenantId}/users`, id);
        await deleteDoc(docRef);
    }
};

export const updateUserPassword = async (newPassword: string): Promise<{ success: boolean, message: string }> => {
    const user = (await import('@/lib/firebase')).auth.currentUser;
    if (!user) {
        return { success: false, message: 'No user is currently logged in.' };
    }

    try {
        await (await import('firebase/auth')).updatePassword(user, newPassword);
        return { success: true, message: 'Password updated successfully.' };
    } catch (error: any) {
        console.error("Password update failed:", error);
        
        let message = "An error occurred while updating the password.";
        if (error.code === 'auth/requires-recent-login') {
            message = 'This operation is sensitive and requires recent authentication. Please sign out and sign back in to change your password.';
        } else if (error.code === 'auth/weak-password') {
            message = 'The new password is too weak. Please choose a stronger password.';
        }
        
        return { success: false, message: message };
    }
}
