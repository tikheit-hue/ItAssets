
import 'server-only';
import { cookies } from 'next/headers';
import type { User, UserRole } from './user-service';

export function getTenantId(): string | null {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('firebase-auth-edge-data');
    if (authCookie) {
        const authData = JSON.parse(authCookie.value);
        return authData.tenantId || authData.uid;
    }
    return null;
}

export function getUser(): any | null {
     const cookieStore = cookies();
    const authCookie = cookieStore.get('firebase-auth-edge-data');
    if (authCookie) {
        const authData = JSON.parse(authCookie.value);
        return authData;
    }
    return null;
}

export function getUserRole(): UserRole | null {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('firebase-auth-edge-data');
    if (authCookie) {
        const authData = JSON.parse(authCookie.value);
        return authData.role as UserRole || null;
    }
    return null;
}
