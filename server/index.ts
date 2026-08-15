import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import './db.js'; // ensures schema + seed run before routes are registered
import authRoutes from './routes/auth.js';
import profilesRoutes from './routes/profiles.js';
import ipCheckRoutes from './routes/ip-check.js';
import { createCrudRouter } from './crud.js';
import { WRITE_ROLES, MANAGE_ROLES } from './auth.js';
import { startReminderScheduler } from './scheduler.js';
import { sanitizeBody, sanitizeQuery, validateGenericRequest } from './middleware/common.js';
import { validatePcRegistration } from './middleware/pcValidation.js';
import { validateLicense } from './middleware/licenseValidation.js';
import { validateDevice } from './middleware/deviceValidation.js';
import { validateReminder } from './middleware/reminderValidation.js';
import { validateAsset } from './middleware/assetValidation.js';
import { validateIpAddress } from './middleware/ipAddressValidation.js';
import { validateServer } from './middleware/serverValidation.js';
import { validateDepartment } from './middleware/departmentValidation.js';

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(sanitizeBody);
app.use(sanitizeQuery);
app.use(validateGenericRequest);

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/ip', ipCheckRoutes);

app.use('/api/departments', validateDepartment);
app.use(
  '/api/departments',
  createCrudRouter('departments', {
    insertRoles: ['admin', 'manager'],
    updateRoles: ['admin', 'manager'],
    deleteRoles: ['admin'],
  })
);

app.use('/api/pc_registrations', validatePcRegistration);
app.use(
  '/api/pc_registrations',
  createCrudRouter('pc_registrations', {
    insertRoles: WRITE_ROLES,
    updateRoles: WRITE_ROLES,
    deleteRoles: MANAGE_ROLES,
    withDepartment: true,
  })
);

app.use('/api/licenses', validateLicense);
app.use(
  '/api/licenses',
  createCrudRouter('licenses', {
    insertRoles: WRITE_ROLES,
    updateRoles: WRITE_ROLES,
    deleteRoles: MANAGE_ROLES,
  })
);

app.use('/api/devices', validateDevice);
app.use(
  '/api/devices',
  createCrudRouter('devices', {
    insertRoles: WRITE_ROLES,
    updateRoles: WRITE_ROLES,
    deleteRoles: MANAGE_ROLES,
  })
);

app.use('/api/servers', validateServer);
app.use(
  '/api/servers',
  createCrudRouter('servers', {
    insertRoles: WRITE_ROLES,
    updateRoles: WRITE_ROLES,
    deleteRoles: MANAGE_ROLES,
  })
);

app.use('/api/reminders', validateReminder);
app.use(
  '/api/reminders',
  createCrudRouter('reminders', {
    insertRoles: WRITE_ROLES,
    updateRoles: ['admin', 'manager', 'register_user', 'assessor'],
    deleteRoles: MANAGE_ROLES,
  })
);

app.use('/api/assets', validateAsset);
app.use(
  '/api/assets',
  createCrudRouter('assets', {
    insertRoles: WRITE_ROLES,
    updateRoles: WRITE_ROLES,
    deleteRoles: MANAGE_ROLES,
    withDepartment: true,
  })
);

app.use('/api/ip_addresses', validateIpAddress);
app.use(
  '/api/ip_addresses',
  createCrudRouter('ip_addresses', {
    insertRoles: WRITE_ROLES,
    updateRoles: WRITE_ROLES,
    deleteRoles: MANAGE_ROLES,
    withDepartment: true,
  })
);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// The frontend is now a separate Next.js app (see ../src/app). Next
// proxies /api/* requests to this server via rewrites in next.config.js,
// so this process only ever needs to serve the API.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`GBB Asset Inventory API listening on http://localhost:${PORT}`);
  startReminderScheduler();
});
