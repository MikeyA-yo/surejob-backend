"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "customer" | "worker";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("customer");

  useEffect(() => {
    const saved = localStorage.getItem("surejob_role");
    if (saved === "customer" || saved === "worker") {
      setRoleState(saved);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem("surejob_role", newRole);
  };

  const toggleRole = () => {
    const next = role === "customer" ? "worker" : "customer";
    setRole(next);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, toggleRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
