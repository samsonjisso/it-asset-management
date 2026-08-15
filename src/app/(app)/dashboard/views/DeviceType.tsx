import React from 'react'

function DeviceType({deviceByType}: { deviceByType: Record<string, number> }) {
   const deviceTypeLabels: Record<string, string> = {
    network: 'Network', physical_server: 'Physical Server', storage_server: 'Storage Server',
    wifi_access_point: 'WiFi AP', core_switch: 'Core Switch', access_switch: 'Access Switch',
    edge_router: 'Edge Router', ups: 'UPS', ac: 'AC', rack: 'Rack', cctv_camera: 'CCTV',
    printer_photocopy: 'Printer', fire_extinguisher: 'Fire Ext.', monitoring_tv: 'Monitor TV',
  };
    return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Devices by Type</h3>
        {Object.keys(deviceByType).length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No devices registered</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(deviceByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <span className="text-sm text-gray-700">{deviceTypeLabels[type] ?? type}</span>
                <span className="text-sm font-bold text-[#343494]">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}

export default DeviceType