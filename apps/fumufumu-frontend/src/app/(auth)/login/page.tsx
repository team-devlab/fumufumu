import { LoginForm } from "@/features/auth/components/LoginForm";
import { pickFirst } from "@/lib/searchParams";

type PageProps = {
  searchParams: Promise<{
    reason?: string | string[];
    returnTo?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <LoginForm
      reason={pickFirst(resolvedSearchParams.reason)}
      returnTo={pickFirst(resolvedSearchParams.returnTo)}
    />
  );
}
