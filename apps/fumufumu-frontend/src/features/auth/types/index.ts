// 入力やレスポンスの型定義
export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
}

export interface SigninCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  auth_user_id: string;
  app_user_id?: number;
}
