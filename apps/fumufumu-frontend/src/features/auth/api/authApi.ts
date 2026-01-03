import type {
  AuthResponse,
  SigninCredentials,
  SignupCredentials,
} from "@/features/auth/types";
import { apiClient } from "@/lib/api/client";

export const authApi = {
  signup: (data: SignupCredentials) => {
    return apiClient<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  signin: (data: SigninCredentials) => {
    return apiClient<AuthResponse>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
