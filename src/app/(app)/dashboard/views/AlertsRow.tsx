import {AlertTriangle, Bell} from 'lucide-react'
import {License, Reminder} from '@/lib/supabase'

function AlertsRow({ expiringLicenses, upcomingReminders }: { expiringLicenses: License[]; upcomingReminders: Reminder[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expiring licenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-amber-600" />
            <h3 className="font-semibold text-gray-800">Expiring Licenses (60 days)</h3>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{expiringLicenses.length}</span>
          </div>
          {expiringLicenses.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No licenses expiring soon</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {expiringLicenses.map((l) => {
                const days = Math.ceil((new Date(l.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={l.id} className="flex items-center justify-between bg-amber-50/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{l.license_subtype ?? l.license_type}</p>
                      <p className="text-xs text-gray-500">Expires: {new Date(l.expiry_date!).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days < 0 ? 'text-red-600 bg-red-50' : 'text-amber-700 bg-amber-100'}`}>
                      {days < 0 ? 'Expired' : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming reminders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} className="text-[#343494]" />
            <h3 className="font-semibold text-gray-800">Upcoming Reminders</h3>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-[#343494]/10 text-[#343494] font-medium">{upcomingReminders.length}</span>
          </div>
          {upcomingReminders.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No upcoming reminders</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcomingReminders.map((r) => {
                const days = Math.ceil((new Date(r.remind_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={r.id} className="flex items-center justify-between bg-blue-50/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.title}</p>
                      <p className="text-xs text-gray-500">{r.reminder_type} - {new Date(r.remind_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 0 ? 'text-red-600 bg-red-50' : 'text-blue-700 bg-blue-100'}`}>
                      {days <= 0 ? 'Due!' : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  )
}

export default AlertsRow