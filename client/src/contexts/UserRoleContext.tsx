import { createContext, useContext, type ReactNode } from "react";
import { USER_ROLES } from "@shared/schema";
import { useAuth } from "./AuthContext";

type UserRole = typeof USER_ROLES[number];

interface UserRoleContextType {
  role: UserRole;
  canViewRevenue: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isTechnician: boolean;
  isService: boolean;
  isLimitedRole: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const role = (user?.role as UserRole) || "Job Card";
  const canViewRevenue = role === "Admin" || role === "Manager";
  const isAdmin = role === "Admin";
  const isManager = role === "Manager";
  const isTechnician = role === "Technician";
  const isService = role === "Service";
  const isLimitedRole = isTechnician || isService;

  return (
    <UserRoleContext.Provider value={{ role, canViewRevenue, isAdmin, isManager, isTechnician, isService, isLimitedRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
}
