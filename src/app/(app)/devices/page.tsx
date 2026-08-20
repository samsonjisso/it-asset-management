"use client";

import { useSearchParams } from "next/navigation";
import { DeviceRegistrationPage } from "./DeviceRegistrationPage";

export default function Page() {
  const searchParams = useSearchParams();
  const register = searchParams.get("register");
  return (
    <DeviceRegistrationPage
      autoOpenCreate={register ? Number(register) : undefined}
    />
  );
}
