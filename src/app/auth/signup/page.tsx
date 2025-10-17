
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthForm, type AuthFormValues } from "@/components/auth-form";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/settings-context";
import * as userService from "@/services/user-service";
import { useCompanyInfo } from "@/context/company-info-context";

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { databaseProvider, sqlConfig } = useSettings();
  const { saveCompanyInfo } = useCompanyInfo();

  const handleSignUp = async (values: AuthFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      const tenantId = user.uid; // The new user's UID becomes their tenantId
      const dbConfig = databaseProvider === 'sql' ? sqlConfig : null;

      if (user) {
        // Create the SuperAdmin user record in the database under their own tenant.
        await userService.addUser(databaseProvider, dbConfig, tenantId, {
          id: user.uid,
          name: values.name || "Admin User",
          email: user.email || "",
          phone: "",
          role: "SuperAdmin",
          status: "Active",
          tenantId: tenantId,
        });

        // Save company name if provided
        if (values.companyName) {
            saveCompanyInfo({
                name: values.companyName,
                logo: "",
                addressStreet: "",
                addressCity: "",
                addressState: "",
                addressPincode: "",
                addressCountry: "",
                contactNumber: "",
                email: "",
            });
        }
      }

      router.push("/dashboard");
    } catch (error: any) {
      let description = "An unknown error occurred.";
      if (error.code === 'auth/email-already-in-use') {
          description = "This email address is already in use. Please try a different email or sign in.";
      } else if (error.message) {
          description = error.message;
      }
       toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: description,
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4">
      <AuthForm mode="signup" onSubmit={handleSignUp} isLoading={isLoading} />
    </div>
  );
}
