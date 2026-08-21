import { isValidIPv4, isValidMac } from "@/lib/validation";
import type { PCFormData } from "../types/pcRegistration.types";

export function validatePCForm(form: PCFormData): string | null {
  if (!form.hostname.trim()) return "Hostname is required";
  if (form.ip_address.trim() && !isValidIPv4(form.ip_address)) {
    return "IP Address must be a valid IPv4 address (e.g., 10.6.13.45)";
  }
  if (form.mac_address.trim() && !isValidMac(form.mac_address)) {
    return "MAC Address must look like 00:1A:2B:3C:4D:5E";
  }
  if (form.access_switch_ip.trim() && !isValidIPv4(form.access_switch_ip)) {
    return "Access Switch IP Address must be a valid IPv4 address (e.g., 10.6.1.103)";
  }
  return null;
}
