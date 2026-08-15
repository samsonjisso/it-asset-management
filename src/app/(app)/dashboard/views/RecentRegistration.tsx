import React from 'react'
import { Calendar, Monitor } from 'lucide-react'
import { PCRegistration } from '@/lib/supabase'

function RecentRegistration({ recentPCs }: { recentPCs: PCRegistration[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-[#343494]" />
          <h3 className="font-semibold text-gray-800">Recent PC Registrations</h3>
        </div>
        {recentPCs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No PCs registered yet</p>
        ) : (
          <div className="space-y-2">
            {recentPCs.map((pc) => (
              <div key={pc.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Monitor size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{pc.hostname}</p>
                    <p className="text-xs text-gray-500">{pc.ip_address ?? 'No IP'} - {pc.service_tag ?? 'No tag'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{new Date(pc.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}

export default RecentRegistration