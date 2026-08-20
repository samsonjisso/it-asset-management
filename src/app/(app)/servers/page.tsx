"use client";

import { useSearchParams } from "next/navigation";
import { ServerRegistrationPage } from "../../../views/ServerRegistrationPage";

export default function Page() {
  const searchParams = useSearchParams();
  const register = searchParams.get('register');
  return <ServerRegistrationPage autoOpenCreate={register ? Number(register) : undefined} />;
}
