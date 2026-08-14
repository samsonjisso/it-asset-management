"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { GBBLogo } from '../components/GBBLogo';
import { Button, SelectInput, TextInput } from '../components/FormControls';
import { Printer, FileSpreadsheet, FileBarChart } from 'lucide-react';

type ReportType = 'pc' | 'asset' | 'ip' | 'license' | 'device' | 'server' | 'all';

export function ReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>('pc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    let query;
    switch (reportType) {
      case 'pc':
        query = supabase.from('pc_registrations').select('*, department:departments(name)').order('created_at', { ascending: false });
        break;
      case 'asset':
        query = supabase.from('assets').select('*, department:departments(name)').order('created_at', { ascending: false });
        break;
      case 'ip':
        query = supabase.from('ip_addresses').select('*, department:departments(name)').order('ip_address', { ascending: true });
        break;
      case 'license':
        query = supabase.from('licenses').select('*').order('created_at', { ascending: false });
        break;
      case 'device':
        query = supabase.from('devices').select('*').order('created_at', { ascending: false });
        break;
      case 'server':
        query = supabase.from('servers').select('*').order('created_at', { ascending: false });
        break;
      case 'all':
        const [pc, ast, ip, lic, dev, srv] = await Promise.all([
          supabase.from('pc_registrations').select('*, department:departments(name)').order('created_at', { ascending: false }),
          supabase.from('assets').select('*, department:departments(name)').order('created_at', { ascending: false }),
          supabase.from('ip_addresses').select('*, department:departments(name)').order('created_at', { ascending: false }),
          supabase.from('licenses').select('*').order('created_at', { ascending: false }),
          supabase.from('devices').select('*').order('created_at', { ascending: false }),
          supabase.from('servers').select('*').order('created_at', { ascending: false }),
        ]);
        let combined = [
          ...(pc.data ?? []).map((r: any) => ({ ...r, _type: 'PC' })),
          ...(ast.data ?? []).map((r: any) => ({ ...r, _type: 'Asset' })),
          ...(ip.data ?? []).map((r: any) => ({ ...r, _type: 'IP Address' })),
          ...(lic.data ?? []).map((r: any) => ({ ...r, _type: 'License' })),
          ...(dev.data ?? []).map((r: any) => ({ ...r, _type: 'Device' })),
          ...(srv.data ?? []).map((r: any) => ({ ...r, _type: 'Server' })),
        ];
        if (dateFrom) combined = combined.filter((r) => new Date(r.created_at) >= new Date(dateFrom));
        if (dateTo) combined = combined.filter((r) => new Date(r.created_at) <= new Date(dateTo + 'T23:59:59'));
        setData(combined);
        setLoading(false);
        setGenerated(true);
        toast(`Report generated: ${combined.length} records`, 'success');
        return;
    }
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');
    const { data: result } = await query;
    setData(result ?? []);
    setLoading(false);
    setGenerated(true);
    toast(`Report generated: ${result?.length ?? 0} records`, 'success');
  };

  const exportExcel = () => {
    if (data.length === 0) {
      toast('No data to export', 'error');
      return;
    }
    // Generate Excel-compatible XML (SpreadsheetML)
    const headers = getHeaders(reportType);
    const rows = data.map((row) => getRowValues(row, reportType));

    let xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="Report">\n<Table>\n';

    // Header row
    xml += '<Row>';
    headers.forEach((h) => {
      xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
    });
    xml += '</Row>\n';

    // Data rows
    rows.forEach((row) => {
      xml += '<Row>';
      row.forEach((val) => {
        xml += `<Cell><Data ss:Type="String">${escapeXml(String(val ?? ''))}</Data></Cell>`;
      });
      xml += '</Row>\n';
    });

    xml += '</Table>\n</Worksheet>\n</Workbook>';

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GBB_IT_Asset_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Excel file exported', 'success');
  };

  const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const getHeaders = (type: ReportType): string[] => {
    if (type === 'all') return ['Type', 'Hostname/Name', 'IP Address', 'Serial/Tag', 'Department/Owner', 'Registered Date'];
    if (type === 'pc') return ['Hostname', 'Monitor Serial', 'Asset Tag', 'Service Tag', 'MAC Address', 'IP Address', 'Department', 'Floor', 'Switch Port', 'Access Switch', 'Patch Level', 'Registered Date'];
    if (type === 'asset') return ['Asset Name', 'Asset Type', 'Department', 'Owner', 'Location', 'Model', 'Hostname', 'Serial Number', 'Manufacturer', 'Supplier', 'Operating System', 'IP Address', 'Registered Date'];
    if (type === 'ip') return ['IP Address', 'Hostname', 'Department', 'Owner (Employee)', 'MAC Address', 'Status', 'Registered Date'];
    if (type === 'license') return ['License Type', 'Subtype', 'Vendor', 'License Key', 'Quantity', 'Effective Date', 'Expiry Date', 'Registered Date'];
    if (type === 'device') return ['Device Type', 'Owner', 'Model', 'Hostname', 'IP Address', 'Serial Number', 'MAC Address', 'Location', 'Rack', 'Registered Date'];
    if (type === 'server') return ['Server Type', 'Hostname', 'IP Address', 'SSH Port', 'Environment', 'Owner', 'RAM', 'CPU', 'Storage', 'OS Release', 'Host Location', 'Registered Date'];
    return [];
  };

  const getRowValues = (row: any, type: ReportType): any[] => {
    const dateStr = new Date(row.created_at).toLocaleDateString();
    if (type === 'all') return [row._type, row.hostname ?? row.asset_name ?? row.ip_address ?? row.title ?? '', row.ip_address ?? '', row.serial_number ?? row.service_tag ?? '', row.department?.name ?? row.owner ?? row.ip_owner ?? row.server_owner ?? row.device_owner ?? '', dateStr];
    if (type === 'pc') return [row.hostname, row.monitor_serial ?? '', row.asset_tag ?? 'N/A', row.service_tag ?? '', row.mac_address ?? '', row.ip_address ?? '', row.department?.name ?? '', row.floor_number ?? '', row.switch_port_number ?? '', row.access_switch_ip ?? '', row.patch_level_number ?? '', dateStr];
    if (type === 'asset') return [row.asset_name, row.asset_type, row.department?.name ?? '', row.owner ?? '', row.location ?? '', row.model ?? '', row.hostname ?? '', row.serial_number ?? '', row.manufacturer ?? '', row.supplier ?? '', row.operating_system ?? '', row.ip_address ?? '', dateStr];
    if (type === 'ip') return [row.ip_address, row.hostname ?? '', row.department?.name ?? '', row.ip_owner ?? '', row.mac_address ?? '', row.status, dateStr];
    if (type === 'license') return [row.license_type, row.license_subtype ?? '', row.vendor ?? '', row.license_key ?? 'N/A', row.number_of_licenses ?? '', row.effective_date ?? '', row.expiry_date ?? '', dateStr];
    if (type === 'device') return [row.device_type, row.device_owner, row.device_model ?? '', row.hostname, row.ip_address ?? 'N/A', row.serial_number ?? '', row.mac_address ?? '', row.location ?? '', row.rack_number ?? '', dateStr];
    if (type === 'server') return [row.server_type, row.hostname, row.ip_address ?? '', row.ssh_port, row.environment, row.server_owner, row.ram ?? '', row.cpu ?? '', row.storage ?? '', row.os_release ?? '', row.host_location ?? '', dateStr];
    return [];
  };

  const printReport = () => {
    window.print();
  };

  const reportTitle = { pc: 'PC Registration Report', asset: 'Asset Registration Report', ip: 'IP Address Management Report', license: 'License Registration Report', device: 'Device Registration Report', server: 'Server Registration Report', all: 'Complete IT Asset Inventory Report' }[reportType];

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#343494] text-white flex items-center justify-center"><FileBarChart size={22} /></div>
        <div>
          <h1 className="text-xl font-bold text-[#343494]">Reports</h1>
          <p className="text-sm text-gray-500">Generate and export IT asset reports</p>
        </div>
      </div>

      {/* Filter controls */}
      <div className="no-print bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Report Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Report Type</label>
            <SelectInput value={reportType} onChange={(e) => { setReportType(e.target.value as ReportType); setGenerated(false); }}>
              <option value="pc">PC Registration</option>
              <option value="asset">Asset Registration</option>
              <option value="ip">IP Address Management</option>
              <option value="license">License Registration</option>
              <option value="device">Device Registration</option>
              <option value="server">Server Registration</option>
              <option value="all">All Assets (Combined)</option>
            </SelectInput>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">From Date</label>
            <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">To Date</label>
            <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="primary" onClick={generateReport} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
          {generated && (
            <>
              <Button variant="gold" onClick={exportExcel}><FileSpreadsheet size={16} /> Export Excel</Button>
              <Button variant="outline" onClick={printReport}><Printer size={16} /> Print Report</Button>
            </>
          )}
        </div>
      </div>

      {/* Report preview */}
      {generated && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Print header */}
          <div className="print-area">
            <div className="bg-gradient-to-r from-[#343494] to-[#4e4ec1] px-6 py-5 text-white">
              <div className="flex items-center gap-4">
                <GBBLogo size={48} />
                <div>
                  <h2 className="text-xl font-bold">Goh Betoch Bank</h2>
                  <p className="text-[#ffc800] text-sm font-medium">IT Asset Inventory Management System</p>
                </div>
                <div className="ml-auto text-right text-sm">
                  <p className="font-semibold">{reportTitle}</p>
                  <p className="text-white/80">Generated: {new Date().toLocaleDateString()}</p>
                  {(dateFrom || dateTo) && (
                    <p className="text-white/80 text-xs mt-1">
                      Period: {dateFrom || 'Start'} to {dateTo || 'Now'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Report table */}
            <div className="overflow-x-auto p-6">
              <table className="w-full border-collapse" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    {getHeaders(reportType).map((h, i) => (
                      <th key={i} className="border border-gray-300 bg-[#343494] text-white px-3 py-2 text-left font-semibold" style={{ fontSize: '11px' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan={getHeaders(reportType).length} className="text-center py-8 text-gray-500 border border-gray-300">No records found for the selected criteria</td></tr>
                  ) : (
                    data.map((row, i) => (
                      <tr key={row.id ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {getRowValues(row, reportType).map((val, j) => (
                          <td key={j} className="border border-gray-300 px-3 py-1.5 text-gray-700">{val ?? '-'}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
                {data.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={getHeaders(reportType).length} className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-gray-700">
                        Total Records: {data.length}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-center">
              <p className="text-xs text-gray-600">
                Developed In-house by Infrastructure Management Department / Server and Datacenter Team / Samuel T.
              </p>
              <p className="text-xs text-gray-400 mt-1">Goh Betoch Bank - IT Asset Inventory Management System</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
