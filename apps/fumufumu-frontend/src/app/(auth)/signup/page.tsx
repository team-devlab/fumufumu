import { SignupForm } from "@/features/auth/components/SignupForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サインアップ | Fumufumu App",
  description: "新しいアカウントを作成します",
};

export default function SignupPage() {
  return <SignupForm />;
}
