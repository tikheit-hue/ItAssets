
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Trash2, KeyRound } from 'lucide-react';
import { AddUserForm, type AddUserFormValues } from './add-user-form';
import { ResetPasswordForm } from './reset-password-form';
import type { User } from '@/services/user-service';
import * as userService from '@/services/user-service';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { createUser, updateUserPassword as adminUpdateUserPassword } from '@/services/admin-service';

type UserManagementPageProps = {
    initialUsers: User[];
};

export default function UserManagementPage({ initialUsers }: UserManagementPageProps) {
    const { tenantId, user: adminUser } = useAuth();
    const { databaseProvider, sqlConfig } = useSettings();
    const { toast } = useToast();
    const [users, setUsers] = useState(initialUsers);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    useEffect(() => {
        setUsers(initialUsers);
    }, [initialUsers]);

    const refreshUsers = async () => {
        if (tenantId) {
            const updatedUsers = await userService.getUsers(databaseProvider, sqlConfig, tenantId);
            setUsers(updatedUsers);
        }
    }

    const handleCreateUser = async (data: AddUserFormValues) => {
        if (!tenantId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Action could not be completed. Missing context.' });
            return;
        }

        const { success, uid, message } = await createUser(data.email, data.password, data.name);

        if (!success) {
            toast({ variant: 'destructive', title: 'Failed to create user', description: message });
            return;
        }
        
        const newUserData: User = {
            id: uid,
            email: data.email,
            role: "TenantAdmin",
            name: data.name || data.email.split('@')[0],
            phone: '',
            status: 'Active',
            tenantId: tenantId,
        };

        try {
            await userService.addUser(databaseProvider, sqlConfig, tenantId, newUserData);
            toast({ title: 'Sub-User Created', description: message });
            setIsAddUserOpen(false);
            await refreshUsers();
        } catch (dbError: any) {
            console.error("Failed to add user to DB, attempting to clean up auth user.", dbError);
            toast({ variant: 'destructive', title: 'Database Error', description: `Failed to save user record: ${dbError.message}` });
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete || !tenantId) return;
        
         try {
            await userService.deleteUser(databaseProvider, sqlConfig, tenantId, userToDelete.id);
            toast({ title: 'User Deleted', description: 'User has been removed from the database.' });
            await refreshUsers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to delete user', description: error.message });
        }
        setUserToDelete(null);
    };

    const handlePasswordReset = async (password: string) => {
        if (!selectedUser) return;
        
        const result = await adminUpdateUserPassword(selectedUser.id, password);

        if (result.success) {
            toast({ title: 'Password Reset', description: result.message });
            setIsResetPasswordOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Failed to reset password', description: result.message });
            throw new Error(result.message); // To keep the form state
        }
    };


    return (
    <>
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Users</CardTitle>
                        <CardDescription>The following users have access to this tenant's data.</CardDescription>
                    </div>
                     <Button onClick={() => setIsAddUserOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add User
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                <TableCell><Badge variant={user.status === 'Active' ? 'default' : 'outline'}>{user.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setIsResetPasswordOpen(true); }}>
                                        <KeyRound className="h-4 w-4" />
                                        <span className="sr-only">Reset Password</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={user.id === adminUser?.uid}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete User</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>

       <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Sub-User</DialogTitle>
                <DialogDescription>This will create a new user who can log in and access your tenant's data.</DialogDescription>
              </DialogHeader>
              <AddUserForm onSave={handleCreateUser} onDone={() => setIsAddUserOpen(false)} />
            </DialogContent>
        </Dialog>

       <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescriptionComponent>
                    This will permanently delete the user <span className="font-bold">{userToDelete?.email}</span>. This action cannot be undone.
                </AlertDialogDescriptionComponent>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                    Set a new password for <span className="font-bold">{selectedUser?.email}</span>.
                </DialogDescription>
            </DialogHeader>
            <ResetPasswordForm
                onSave={handlePasswordReset}
                onDone={() => setIsResetPasswordOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
