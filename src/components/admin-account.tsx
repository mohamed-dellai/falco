"use client";

import { createContext, useContext } from "react";

export type DeskAccount = {
  id: string;
  name: string;
  email: string;
};

const AdminAccountContext = createContext<DeskAccount | null>(null);

export function AdminAccountProvider({
  account,
  children,
}: {
  account: DeskAccount | null;
  children: React.ReactNode;
}) {
  return (
    <AdminAccountContext.Provider value={account}>
      {children}
    </AdminAccountContext.Provider>
  );
}

export function useAdminAccount() {
  return useContext(AdminAccountContext);
}

export function accountInitials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "F";
}
