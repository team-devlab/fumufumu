import { apiClient } from "@/lib/api/client";
import type { SignupCredentials, SigninCredentials, AuthResponse } from "@/features/auth/types";

export const authApi = {
  signup: (data: SignupCredentials) => {
    return apiClient<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  signin: (data: SigninCredentials) => {
    return apiClient<AuthResponse>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
