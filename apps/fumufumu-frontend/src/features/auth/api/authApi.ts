import type {
  AuthResponse,
  SigninCredentials,
  SignoutResponse,
  SignupCredentials,
} from "@/features/auth/types";
import { apiClient } from "@/lib/api/client";

export const authApi = {
  signup: (data: SignupCredentials) => {
    return apiClient<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuthRedirect: true,
    });
  },

  signin: (data: SigninCredentials) => {
    return apiClient<AuthResponse>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuthRedirect: true,
    });
  },

  signout: () => {
    return apiClient<SignoutResponse>("/api/auth/signout", {
      method: "POST",
      skipAuthRedirect: true,
    });
  },
};
