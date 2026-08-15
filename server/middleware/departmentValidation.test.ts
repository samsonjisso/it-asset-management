import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAsset } from './assetValidation.js';
import { validateDepartment } from './departmentValidation.js';
import { validateDevice } from './deviceValidation.js';
import { validateIpAddress } from './ipAddressValidation.js';
import { validateLicense } from './licenseValidation.js';
import { validatePcRegistration } from './pcValidation.js';
import { validateReminder } from './reminderValidation.js';
import { validateServer } from './serverValidation.js';

function makeReq(body: Record<string, unknown>) {
  return { body } as any;
}

function makeRes() {
  return {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      this.payload = payload;
      return this;
    },
  } as any;
}

test('accepts a valid department payload', () => {
  let nextCalled = false;
  const req = makeReq({ name: 'IT Department', is_branch: false, description: 'Core support team' });
  const res = makeRes();

  validateDepartment(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('allows read requests without a body', () => {
  let nextCalled = false;
  const req = { method: 'GET', body: undefined } as any;
  const res = makeRes();

  validateDepartment(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('rejects unsafe department data', () => {
  const req = makeReq({ name: '<script>alert(1)</script>', description: 'bad' });
  const res = makeRes();

  validateDepartment(req, res, () => {
    throw new Error('next should not be called for unsafe input');
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error.includes('Department name'), true);
});

test('requires department selection for department-linked asset records', () => {
  let nextCalled = false;
  const req = makeReq({ asset_name: 'Laptop', asset_type: 'Laptop' });
  const res = makeRes();

  validateAsset(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.match(String(res.payload.error), /department/i);
});

test('requires department selection for department-linked PC records', () => {
  let nextCalled = false;
  const req = makeReq({ hostname: 'GBBIT0101', mac_address: 'AA:BB:CC:DD:EE:FF' });
  const res = makeRes();

  validatePcRegistration(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.match(String(res.payload.error), /department/i);
});

test('requires department selection for department-linked IP records', () => {
  let nextCalled = false;
  const req = makeReq({ ip_address: '10.6.1.10', hostname: 'GBBIT0102', status: 'assigned' });
  const res = makeRes();

  validateIpAddress(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.match(String(res.payload.error), /department/i);
});

test('allows GET and DELETE requests through validation without body checks', () => {
  const cases = [
    ['department', validateDepartment, 'GET'],
    ['asset', validateAsset, 'GET'],
    ['device', validateDevice, 'GET'],
    ['ip', validateIpAddress, 'GET'],
    ['license', validateLicense, 'GET'],
    ['pc', validatePcRegistration, 'GET'],
    ['reminder', validateReminder, 'GET'],
    ['server', validateServer, 'GET'],
    ['department-delete', validateDepartment, 'DELETE'],
    ['asset-delete', validateAsset, 'DELETE'],
    ['device-delete', validateDevice, 'DELETE'],
    ['ip-delete', validateIpAddress, 'DELETE'],
    ['license-delete', validateLicense, 'DELETE'],
    ['pc-delete', validatePcRegistration, 'DELETE'],
    ['reminder-delete', validateReminder, 'DELETE'],
    ['server-delete', validateServer, 'DELETE'],
  ] as const;

  for (const [name, validator, method] of cases) {
    let nextCalled = false;
    const req = { method, body: undefined } as any;
    const res = makeRes();

    validator(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, `${name} validation should allow ${method} requests`);
    assert.equal(res.statusCode, 200, `${name} validation should not reject ${method} requests`);
  }
});
