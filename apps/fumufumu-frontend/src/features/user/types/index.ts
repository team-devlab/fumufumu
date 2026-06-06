export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: number;
  name: string;
  disabled: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
