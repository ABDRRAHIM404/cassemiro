import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const { profile, email } = await requireAdmin();
  return <AdminShell displayName={profile.display_name} email={email}>{children}</AdminShell>;
}
