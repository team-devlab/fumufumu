import { LoginForm } from "@/features/auth/components/LoginForm";

type PageProps = {
  searchParams: Promise<{
    reason?: string | string[];
    returnTo?: string | string[];
  }>;
};

const pickFirst = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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
