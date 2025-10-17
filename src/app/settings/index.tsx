
"use client";

import { useSettings, type SqlConfig, type DatabaseProvider } from "@/context/settings-context";
import { useCompanyInfo } from "@/context/company-info-context";
import { SmtpForm } from "@/components/settings/smtp-form";
import { SqlForm } from "@/components/settings/sql-form";
import { RecipientsTable } from "@/components/settings/recipients-table";
import { CompanyInfoForm } from "@/components/settings/company-info-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateUserPassword } from "@/services/user-service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import ConfigurationPage from "../configuration/page";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import UserManagementPage from "@/components/user-management-page";
import { ChangelogViewer } from "@/components/settings/changelog-viewer";
import { UserRole, type User } from "@/services/user-service";
import { revalidateSettings } from "@/app/(main)/settings/page";

type SettingsPageProps = {
  userRole: UserRole | null;
  initialUsers: User[];
};

export default function SettingsPageContent({ userRole, initialUsers }: SettingsPageProps) {
  const { 
    smtpConfig, saveSmtpConfig, 
    recipients, addRecipient, removeRecipient, 
    sqlConfig, saveSqlConfig,
    databaseProvider, saveDatabaseProvider
  } = useSettings();
  const { companyInfo, saveCompanyInfo } = useCompanyInfo();
  const { toast } = useToast();
  const [isSettingUpDb, setIsSettingUpDb] = useState(false);

  const handleChangePassword = async (password: string) => {
    try {
        const result = await updateUserPassword(password);
        if (result.success) {
            toast({
                title: "Password Updated",
                description: "Your password has been successfully changed.",
            });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message,
        });
        throw error;
    }
  };

  const handleTestSqlConnection = async (config: SqlConfig) => {
     const response = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', config }),
      });
      const result = await response.json();
      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
  };

  const handleSaveSqlConnection = async (config: SqlConfig) => {
      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', config }),
      });
      const result = await response.json();
      toast({
        title: result.success ? "Configuration Saved" : "Save Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      if(result.success) {
        saveSqlConfig(config);
      }
  };

  const handleSetupDatabase = async () => {
    setIsSettingUpDb(true);
    const response = await fetch('/api/sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup', config: sqlConfig }),
    });
    const result = await response.json();
    toast({
      title: result.success ? "Database Setup Successful" : "Database Setup Failed",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    if (result.success) {
      await revalidateSettings();
    }
    setIsSettingUpDb(false);
  }

  const tabs = [
    { value: "company", label: "Company Info" },
    { value: "smtp", label: "Email (SMTP)" },
    { value: "recipients", label: "Recipients" },
    { value: "database", label: "Database" },
    { value: "configuration", label: "Configuration" },
    { value: "security", label: "Security" },
    { value: "users", label: "User Management", roles: ['SuperAdmin'] },
    { value: "changelog", label: "Changelog" },
  ];

  const availableTabs = tabs.filter(tab => !tab.roles || tab.roles.includes(userRole || ''));

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure system settings for your application.
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            {availableTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
        </TabsList>
        <div className="pt-6">
            <TabsContent value="company">
                <CompanyInfoForm 
                    info={companyInfo}
                    onSave={saveCompanyInfo}
                />
            </TabsContent>
            <TabsContent value="smtp">
                <SmtpForm 
                    config={smtpConfig}
                    onSave={saveSmtpConfig}
                />
            </TabsContent>
            <TabsContent value="recipients">
                <RecipientsTable 
                    recipients={recipients}
                    onAddRecipient={addRecipient}
                    onRemoveRecipient={removeRecipient}
                />
            </TabsContent>
            <TabsContent value="database">
              <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Database Provider</CardTitle>
                        <CardDescription>Choose your primary data source.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup 
                          value={databaseProvider} 
                          onValueChange={(value) => saveDatabaseProvider(value as DatabaseProvider)}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="firebase" id="firebase" />
                                <Label htmlFor="firebase">Firebase Firestore (Default)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sql" id="sql" />
                                <Label htmlFor="sql">External SQL Server</Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>
                {databaseProvider === 'sql' && (
                  <>
                    <SqlForm initialData={sqlConfig} onTest={handleTestSqlConnection} onSave={handleSaveSqlConnection}/>
                    <Card>
                      <CardHeader>
                        <CardTitle>Database Setup</CardTitle>
                        <CardDescription>If this is a new database, click here to create the necessary tables.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={handleSetupDatabase} disabled={isSettingUpDb}>
                          {isSettingUpDb && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Setup Database Tables
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
                </div>
            </TabsContent>
            <TabsContent value="configuration">
                <ConfigurationPage />
            </TabsContent>
            <TabsContent value="security">
                <ChangePasswordForm onSave={handleChangePassword} />
            </TabsContent>
            {userRole === 'SuperAdmin' && (
              <TabsContent value="users">
                <UserManagementPage 
                    initialUsers={initialUsers}
                />
              </TabsContent>
            )}
             <TabsContent value="changelog">
                <ChangelogViewer />
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
