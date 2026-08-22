import { execFile } from "node:child_process";

// Matches a plain IPv4 address only — deliberately strict since this
// value is passed to a system command (via execFile, with no shell,
// but we still only want to ever hand it a well-formed IP).
export const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function ping(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    // -c 1: send a single packet. -W 1: wait at most 1s for a reply.
    // execFile (not exec) passes ip as an argv entry, never through a
    // shell, so there's no command-injection surface regardless.
    execFile("ping", ["-c", "1", "-W", "1", ip], { timeout: 3000 }, (error) => {
      resolve(!error);
    });
  });
}
