'use client';
import { Bell, LogOut, LayoutDashboard, Database, Settings as SettingsIcon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/api-request';

interface UserSettings {
  notifications?: {
    enabled?: boolean;
  };
}

interface UserResponse {
  settings?: UserSettings;
}

interface RecentAlert {
  alert_id: number;
  alert_type: string;
  alert_method: 'email' | 'sms';
  triggered_at: string;
  monitor_id: number;
  monitor_name: string;
  dehydration_score: number;
}

interface RecentAlertsResponse {
  alerts: RecentAlert[];
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const loadNotificationSettings = async () => {
    try {
      const userData = await apiRequest<UserResponse>('/api/user/me', 'GET');
      const enabled = userData?.settings?.notifications?.enabled;
      setNotificationsEnabled(typeof enabled === 'boolean' ? enabled : true);
    } catch (error: any) {
      console.log(error);
    }
  };

  const loadRecentAlerts = async () => {
    try {
      setLoadingAlerts(true);
      setAlertsError(null);
      const response = await apiRequest<RecentAlertsResponse>('/api/user/alerts/recent?limit=8', 'GET');
      setAlerts(response?.alerts || []);
    } catch (error: any) {
      setAlertsError(error?.message || 'Failed to load alerts');
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    loadRecentAlerts();
  }, [menuOpen]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleNotificationToggle = async () => {
    const nextEnabled = !notificationsEnabled;
    setNotificationsEnabled(nextEnabled);
    setSavingNotifications(true);

    try {
      const response = await apiRequest<{ settings?: UserSettings }>('/api/user/settings/notifications', 'PATCH', {
        enabled: nextEnabled,
      });
      const savedEnabled = response?.settings?.notifications?.enabled;
      setNotificationsEnabled(typeof savedEnabled === 'boolean' ? savedEnabled : nextEnabled);
    } catch (error: any) {
      setNotificationsEnabled(!nextEnabled);
      setAlertsError(error?.message || 'Failed to update notifications');
    } finally {
      setSavingNotifications(false);
    }
  };

  const formatAlertTime = (isoTime: string) => {
    const parsedDate = new Date(isoTime);
    if (Number.isNaN(parsedDate.getTime())) {
      return isoTime;
    }
    return parsedDate.toLocaleString();
  };

  const handleLogout = async () => {
    try {
      await apiRequest(`/api/login/logout`, `POST`);
      router.push('/login');
    } catch (error: any) {
      console.log(error);
    }
  };
  
  return (
    <div className="relative z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Left side navigation */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${pathname === '/dashboard'
              ? 'bg-[#ffd966] text-gray-800'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}>
            <LayoutDashboard size={18} />
          </Link>
          <Link
            href="/data"
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${pathname === '/data'
              ? 'bg-[#ffd966] text-gray-800'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}>
            <Database size={18} />
          </Link>
          <Link
            href="/settings"
            className={`px-6 py-2 rounded transition flex items-center gap-2 ${pathname === '/settings'
              ? 'bg-[#ffd966] text-gray-800'
              : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}>
            <SettingsIcon size={18} />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="p-2 hover:bg-gray-100 rounded-full transition relative"
              title="Notifications"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Bell size={20} className="text-gray-600" />
              {alerts.length > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-semibold">
                  {alerts.length}
                </span>
              ) : null}
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-lg p-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">Recent Alerts</p>
                  <button
                    type="button"
                    onClick={handleNotificationToggle}
                    disabled={savingNotifications}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
                      notificationsEnabled ? 'bg-green-500' : 'bg-gray-300'
                    } ${savingNotifications ? 'opacity-70' : ''}`}
                    title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                    aria-label="Toggle account notifications"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                        notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Notifications are {notificationsEnabled ? 'enabled' : 'disabled'} for this account.
                </p>

                <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
                  {loadingAlerts ? <p className="text-sm text-gray-600">Loading alerts...</p> : null}

                  {!loadingAlerts && alertsError ? (
                    <p className="text-sm text-red-600">{alertsError}</p>
                  ) : null}

                  {!loadingAlerts && !alertsError && alerts.length === 0 ? (
                    <p className="text-sm text-gray-600">No recent alerts for your linked devices.</p>
                  ) : null}

                  {!loadingAlerts && !alertsError && alerts.length > 0
                    ? alerts.map((alert) => (
                        <div key={alert.alert_id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                          <p className="text-sm font-semibold text-gray-800">{alert.monitor_name} (ID {alert.monitor_id})</p>
                          <p className="text-xs text-gray-600">{alert.alert_type} via {alert.alert_method}</p>
                          <p className="text-xs text-gray-600">
                            Score: {Number(alert.dehydration_score).toFixed(3)}
                          </p>
                          <p className="text-xs text-gray-500">{formatAlertTime(alert.triggered_at)}</p>
                        </div>
                      ))
                    : null}
                </div>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Log out"
          >
            <LogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
