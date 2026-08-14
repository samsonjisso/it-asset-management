"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Button } from '../components/FormControls';
import { DatabaseBackup, Download, Upload, AlertTriangle, CheckCircle, FileSpreadsheet } from 'lucide-react';

export function BackupPage() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const tables = [
    { name: 'pc_registrations', label: 'PC Registrations' },
    { name: 'assets', label: 'Assets' },
    { name: 'ip_addresses', label: 'IP Addresses' },
    { name: 'licenses', label: 'Licenses' },
    { name: 'devices', label: 'Devices' },
    { name: 'servers', label: 'Servers' },
    { name: 'reminders', label: 'Reminders' },
    { name: 'departments', label: 'Departments' },
  ];

  const exportAllCSV = async () => {
    setExporting(true);
    try {
      const allData: Record<string, any[]> = {};
      for (const table of tables) {
        const { data, error } = await supabase.from(table.name).select('*');
        if (error) throw error;
        allData[table.label] = data ?? [];
      }

      // Create a combined CSV with sections
      let csvContent = '';
      for (const [label, rows] of Object.entries(allData)) {
        csvContent += `\n=== ${label} ===\n`;
        if (rows.length === 0) {
          csvContent += 'No data\n';
          continue;
        }
        const headers = Object.keys(rows[0]);
        csvContent += headers.join(',') + '\n';
        rows.forEach((row) => {
          csvContent += headers.map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(',') + '\n';
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GBB_IT_Asset_Backup_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Full backup exported successfully', 'success');
    } catch (err: any) {
      toast(err.message ?? 'Export failed', 'error');
    }
    setExporting(false);
  };

  const exportTableCSV = async (tableName: string, label: string) => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (!data || data.length === 0) {
      toast(`No data in ${label}`, 'warning');
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row: any) =>
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_backup_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${label} exported`, 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      // Parse CSV - simple parser for backup files
      const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('==='));
      if (lines.length < 2) {
        toast('Invalid backup file', 'error');
        setImporting(false);
        return;
      }
      toast('Import feature: Please use individual table CSV exports for importing data', 'info');
    } catch (err: any) {
      toast(err.message ?? 'Import failed', 'error');
    }
    setImporting(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><DatabaseBackup size={22} /></div>
        <div>
          <h1 className="text-xl font-bold text-[#343494]">Backup & Restore</h1>
          <p className="text-sm text-gray-500">Export and import system data for safekeeping</p>
        </div>
      </div>

      {/* Full backup */}
      <div className="bg-gradient-to-br from-[#343494] to-[#4e4ec1] rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Download size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Full System Backup</h3>
            <p className="text-white/80 text-sm mt-1">
              Download a complete backup of all IT asset data (PCs, Assets, IP Addresses, Licenses, Devices, Servers, Reminders, Departments) as a single CSV file.
            </p>
            <Button variant="gold" size="md" className="mt-4" onClick={exportAllCSV} disabled={exporting}>
              {exporting ? 'Exporting...' : <><Download size={16} /> Download Full Backup</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Individual table exports */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#343494] mb-4">Export Individual Tables</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tables.map((table) => (
            <div key={table.name} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={20} className="text-[#343494]" />
                <span className="font-medium text-gray-700 text-sm">{table.label}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportTableCSV(table.name, table.label)}>
                <Download size={14} /> Export
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Import section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-[#343494] mb-4 flex items-center gap-2">
          <Upload size={20} /> Import Data
        </h3>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <Upload size={32} className="mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-3">Select a CSV backup file to import data</p>
          <label className="inline-flex">
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" disabled={importing} />
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#343494] text-white text-sm font-medium cursor-pointer hover:bg-[#4e4ec1] transition-colors">
              {importing ? 'Importing...' : <><Upload size={16} /> Choose File</>}
            </span>
          </label>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 text-sm">Backup Recommendations</h4>
            <ul className="text-xs text-amber-700 mt-1 space-y-1">
              <li className="flex items-center gap-1"><CheckCircle size={12} /> Perform regular backups (weekly recommended)</li>
              <li className="flex items-center gap-1"><CheckCircle size={12} /> Store backups on a separate secure location</li>
              <li className="flex items-center gap-1"><CheckCircle size={12} /> Always backup before major system changes</li>
              <li className="flex items-center gap-1"><CheckCircle size={12} /> Verify backup integrity by testing imports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
