import { useState } from 'react';
import { Loader2, Radar, Wifi, WifiOff } from 'lucide-react';
import { Modal } from '../../../../components/Modal';
import { Button, Field, TextInput } from '../../../../components/FormControls';
import type { PingResult } from '../../../../lib/api';

type Props = {
  open: boolean;
  checking: boolean;
  result: PingResult | null;
  onClose: () => void;
  onCheck: (ip: string) => Promise<unknown>;
  onReset: () => void;
};

export function IPAvailabilityModal({
  open,
  checking,
  result,
  onClose,
  onCheck,
  onReset,
}: Props) {
  const [ip, setIp] = useState('');

  const close = () => {
    setIp('');
    onReset();
    onClose();
  };

  const check = () => void onCheck(ip);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Check IP Availability"
      subtitle="Sends a single ping to see if an address is currently in use"
      size="sm"
    >
      <div className="space-y-4">
        <Field label="IP Address to check" required>
          <div className="flex gap-2">
            <TextInput
              value={ip}
              onChange={(event) => {
                setIp(event.target.value);
                onReset();
              }}
              placeholder="e.g., 10.6.1.75"
              onKeyDown={(event) => event.key === 'Enter' && check()}
              autoFocus
            />
            <Button
              type="button"
              variant="primary"
              onClick={check}
              loading={checking}
              className="shrink-0"
            >
              {!checking && <Radar size={16} />} Ping
            </Button>
          </div>
        </Field>

        {checking && (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Pinging {ip}...</span>
          </div>
        )}

        {!checking && result && <AvailabilityResult result={result} />}

        <p className="text-xs text-gray-400">
          Availability is based on a live ICMP ping, not the records below — a
          host can be offline yet still reserved, so confirm against the table
          before assigning.
        </p>
      </div>
    </Modal>
  );
}

function AvailabilityResult({ result }: { result: PingResult }) {
  const reachable = result.reachable;

  return (
    <div
      className={`rounded-xl p-4 flex items-start gap-3 ring-1 ${
        reachable ? 'bg-red-50 ring-red-100' : 'bg-green-50 ring-green-100'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          reachable
            ? 'bg-red-100 text-red-600'
            : 'bg-green-100 text-green-600'
        }`}
      >
        {reachable ? <WifiOff size={18} /> : <Wifi size={18} />}
      </div>
      <div>
        <p
          className={`text-sm font-semibold ${
            reachable ? 'text-red-700' : 'text-green-700'
          }`}
        >
          {result.message}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{result.ip}</p>
      </div>
    </div>
  );
}
