'use client';

import { GBBLogo } from '../components/GBBLogo';
import { Info, Mail, Phone, MapPin, Server, Database, Shield, Cpu, Code } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-soft"><Info size={22} /></div>
        <div>
          <h1 className="text-xl font-bold text-brand-600">About</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">System information and developer details</p>
        </div>
      </div>

      {/* System overview */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-6">
          <GBBLogo size={104} />
          <div>
            <h2 className="text-2xl font-bold">Goh Betoch Bank</h2>
            <h3 className="text-lg text-gold-400 font-semibold">Asset Inventory Management Portal</h3>
            <p className="text-white/80 text-sm mt-2">Version 1.0.0 - Developed In-house</p>
          </div>
        </div>
      </div>

      {/* System description */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-6">
        <h3 className="text-lg font-semibold text-brand-600 mb-3">System Overview</h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          The Goh Betoch Bank Asset Inventory Management Portal is a comprehensive web-based application
          designed to manage and track all IT assets across the bank's infrastructure. The system provides
          centralized registration and management of PCs, licenses, network devices, and servers, with
          powerful reporting, filtering, and notification capabilities.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <Server className="text-brand-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Server Registration</h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Track all servers with environment, resources, and host location details.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <Cpu className="text-brand-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">PC Registration</h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Register workstations with full network and asset tag tracking.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <Shield className="text-brand-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">License Management</h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Track all software licenses with expiry alerts and vendor management.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <Database className="text-brand-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Device Registration</h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Register all network devices, UPS, ACs, CCTV, and infrastructure equipment.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key features */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-6">
        <h3 className="text-lg font-semibold text-brand-600 mb-3">Key Features</h3>
        <ul className="space-y-2">
          {[
            'Multi-role authentication (Admin, Editor, Reader, Audit)',
            'Comprehensive PC, License, Device, and Server registration modules',
            'Custom department and branch management',
            'Automated license expiry alerts and reminder notifications',
            'Advanced filtering by name and date across all registrations',
            'Attractive analytics dashboard with registration trends',
            'Print-ready reports with Goh Betoch Bank branding',
            'Excel export for all report types',
            'Full data backup and restore (CSV import/export)',
            'User permission management with role-based access control',
          ].map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 mt-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Developer info */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-brand-600 p-6">
        <h3 className="text-lg font-semibold text-brand-600 mb-4 flex items-center gap-2">
          <Code size={20} /> Developer Information
        </h3>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center text-2xl font-bold">
              IS
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Information Systems Department</h4>
              <p className="text-sm text-brand-600 font-medium">Goh Betoch Bank</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Building2Icon /> <span>Goh Betoch Bank</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Mail size={16} className="text-brand-600" /> <span>admin@gohbetbank.com</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Phone size={16} className="text-brand-600" /> <span>IT Department Extension</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <MapPin size={16} className="text-brand-600" /> <span>Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Building2Icon() {
  return <MapPin size={16} className="text-brand-600" />;
}
