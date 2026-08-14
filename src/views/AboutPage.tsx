"use client";

import { GBBLogo } from '../components/GBBLogo';
import { Info, Mail, Phone, MapPin, Server, Database, Shield, Cpu, Code } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><Info size={22} /></div>
        <div>
          <h1 className="text-xl font-bold text-[#343494]">About</h1>
          <p className="text-sm text-gray-500">System information and developer details</p>
        </div>
      </div>

      {/* System overview */}
      <div className="bg-gradient-to-br from-[#343494] to-[#4e4ec1] rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-6">
          <GBBLogo size={80} />
          <div>
            <h2 className="text-2xl font-bold">Goh Betoch Bank</h2>
            <h3 className="text-lg text-[#ffc800] font-semibold">IT Asset Inventory Management System</h3>
            <p className="text-white/80 text-sm mt-2">Version 1.0.0 - Developed In-house</p>
          </div>
        </div>
      </div>

      {/* System description */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#343494] mb-3">System Overview</h3>
        <p className="text-gray-700 leading-relaxed">
          The Goh Betoch Bank IT Asset Inventory Management System is a comprehensive web-based application
          designed to manage and track all IT assets across the bank's infrastructure. The system provides
          centralized registration and management of PCs, licenses, network devices, and servers, with
          powerful reporting, filtering, and notification capabilities.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4">
            <Server className="text-[#343494] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">Server Registration</h4>
              <p className="text-xs text-gray-600 mt-1">Track all servers with environment, resources, and host location details.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4">
            <Cpu className="text-[#343494] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">PC Registration</h4>
              <p className="text-xs text-gray-600 mt-1">Register workstations with full network and asset tag tracking.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4">
            <Shield className="text-[#343494] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">License Management</h4>
              <p className="text-xs text-gray-600 mt-1">Track all software licenses with expiry alerts and vendor management.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4">
            <Database className="text-[#343494] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">Device Registration</h4>
              <p className="text-xs text-gray-600 mt-1">Register all network devices, UPS, ACs, CCTV, and infrastructure equipment.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key features */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#343494] mb-3">Key Features</h3>
        <ul className="space-y-2">
          {[
            'Multi-role authentication (Admin, Manager, Register User, Assessor)',
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
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffc800] mt-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Developer info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#343494] mb-4 flex items-center gap-2">
          <Code size={20} /> Developer Information
        </h3>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#343494] to-[#4e4ec1] text-white flex items-center justify-center text-2xl font-bold">
              ST
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">Samuel T.</h4>
              <p className="text-sm text-gray-600">Server and Datacenter Team</p>
              <p className="text-sm text-[#343494] font-medium">Infrastructure Management Department</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Building2Icon /> <span>Goh Betoch Bank</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail size={16} className="text-[#343494]" /> <span>infrastructure@gohbetochbank.com</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Phone size={16} className="text-[#343494]" /> <span>IT Department Extension</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin size={16} className="text-[#343494]" /> <span>Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} Goh Betoch Bank. All rights reserved.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Developed In-house by Infrastructure Management Department / Server and Datacenter Team / Samuel T.
        </p>
      </div>
    </div>
  );
}

function Building2Icon() {
  return <MapPin size={16} className="text-[#343494]" />;
}
