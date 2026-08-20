"use client";

import { useSearchParams } from "next/navigation";
import { PCRegistrationPage } from "./PCRegistrationPage";

export default function Page() {
  const searchParams = useSearchParams();
  const register = searchParams.get('register');
  return <PCRegistrationPage autoOpenCreate={register ? Number(register) : undefined} />;
}
