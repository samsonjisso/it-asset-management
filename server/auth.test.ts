import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from './utils/auth.js';

const schemaSql = fs.readFileSync(path.join(process.cwd(), 'server/schema.sql'), 'utf8');

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

test('requireRole blocks managers from admin-only actions', () => {
  let nextCalled = false;
  const req = { auth: { id: 'user-1', email: 'manager@example.com', role: 'manager' } } as any;
  const res = makeRes();

  requireRole('admin')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.error, 'You do not have permission to perform this action');
});

test('requireRole allows admins for admin-only actions', () => {
  let nextCalled = false;
  const req = { auth: { id: 'user-1', email: 'admin@example.com', role: 'admin' } } as any;
  const res = makeRes();

  requireRole('admin')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('department foreign keys cascade deletes department-linked hosts', () => {
  assert.match(schemaSql, /FOREIGN KEY \(department_id\) REFERENCES departments\(id\) ON DELETE CASCADE/g);
});
