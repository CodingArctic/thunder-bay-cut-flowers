'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api-request';

interface UserData {
  user_id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
}

interface MonitorsResponse {
  monitorIDs: number[];
}

interface ClaimResponse {
  success: boolean;
  monitorID: number;
  alreadyAssociated: boolean;
}

interface CreateMonitorResponse {
  success: boolean;
  monitorID: number;
  name: string;
  apiKey: string;
}

type NotificationKey =
  | "emailNotifications" | "textNotifications";

type ToggleProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function Settings() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monitors, setMonitors] = useState<number[]>([]);
  const [deviceApiKey, setDeviceApiKey] = useState('');
  const [createName, setCreateName] = useState('');
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdDevice, setCreatedDevice] = useState<{ monitorID: number; name: string; apiKey: string } | null>(null);
  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    emailNotifications: false,
    textNotifications: false,
  });

  const loadMonitors = async () => {
    try {
      const response = await apiRequest<MonitorsResponse>('/api/monitors/all', 'GET');
      setMonitors(response?.monitorIDs || []);
    } catch (err) {
      console.error('Failed to fetch monitors:', err);
      setDeviceError('Failed to load linked devices');
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<UserData>('/api/user/me', 'GET');
        setUserData(data);
        await loadMonitors();
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError('Failed to load account information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const claimDevice = async () => {
    try {
      setClaiming(true);
      setDeviceError(null);
      setDeviceMessage(null);
      const response = await apiRequest<ClaimResponse>(`/api/monitors/claim`, `POST`, {
        deviceApiKey,
      });

      if (!response) {
        setDeviceError('Unexpected response while claiming device');
        return;
      }

      setDeviceMessage(
        response.alreadyAssociated
          ? `Monitor ${response.monitorID} is already linked to your account.`
          : `Monitor ${response.monitorID} was successfully linked to your account.`
      );
      setDeviceApiKey('');
      await loadMonitors();
    } catch (err) {
      console.error('Failed to claim device:', err);
      setDeviceError((err as Error).message || 'Failed to claim device');
    } finally {
      setClaiming(false);
    }
  };

  const createDevice = async () => {
    try {
      setCreating(true);
      setDeviceError(null);
      setDeviceMessage(null);
      const response = await apiRequest<CreateMonitorResponse>(`/api/monitors/create`, `POST`, {
        name: createName,
      });

      if (!response) {
        setDeviceError('Unexpected response while creating device');
        return;
      }

      setCreatedDevice({
        monitorID: response.monitorID,
        name: response.name,
        apiKey: response.apiKey,
      });
      setDeviceMessage(`Created monitor ${response.monitorID}. Save the API key now.`);
      setCreateName('');
      await loadMonitors();
    } catch (err) {
      console.error('Failed to create device:', err);
      setDeviceError((err as Error).message || 'Failed to create device');
    } finally {
      setCreating(false);
    }
  };

  const copyCreatedKey = async () => {
    if (!createdDevice) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdDevice.apiKey);
      setDeviceMessage('API key copied to clipboard');
    } catch {
      setDeviceError('Could not copy API key. Copy it manually for now.');
    }
  };

  const toggleNotification = (key: NotificationKey) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const Toggle = ({ enabled, onToggle }: ToggleProps) => (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
        enabled ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#ffb84d] rounded-lg flex items-center justify-center">
          <span className="text-xl">⚙️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">SETTINGS</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-6 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
            ACCOUNT INFO
          </h2>
          
          {loading ? (
            <div className="mt-6 text-gray-600">Loading account information...</div>
          ) : error ? (
            <div className="mt-6 text-red-600">{error}</div>
          ) : userData ? (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Full Name</label>
                <div className="text-gray-800 py-2 border-b border-gray-300">
                  {userData.first_name} {userData.last_name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Username</label>
                <div className="text-gray-800 py-2 border-b border-gray-300">{userData.username}</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Email</label>
                <div className="text-gray-800 py-2 border-b border-gray-300">{userData.email}</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Phone Number</label>
                <div className="text-gray-800 py-2 border-b border-gray-300">
                  {userData.phone_number
                    ? userData.phone_number.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
                    : 'N/A'}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Notifications and Device Management */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-6 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
              NOTIFICATIONS
            </h2>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Email</span>
                <Toggle
                  enabled={notifications.emailNotifications}
                  onToggle={() => toggleNotification("emailNotifications")}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-700">Text</span>
                <Toggle
                  enabled={notifications.textNotifications}
                  onToggle={() => toggleNotification("textNotifications")}
                />
              </div>
            </div>
          </div>

          {/* Device Management */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-6 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
              DEVICE MANAGEMENT
            </h2>

            <div className="mt-4 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Linked Devices</h3>
                {monitors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {monitors.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-full bg-[#ffe4b8] px-3 py-1 text-sm text-gray-800"
                      >
                        Monitor {id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No linked devices yet.</p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">Claim Existing Device</h3>
                <input
                  value={deviceApiKey}
                  onChange={(e) => setDeviceApiKey(e.target.value)}
                  placeholder="Paste device API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700"
                />
                <button
                  type="button"
                  onClick={claimDevice}
                  disabled={claiming || !deviceApiKey.trim()}
                  className="px-4 py-2 rounded-lg bg-[#ffb84d] text-gray-900 font-semibold disabled:opacity-50"
                >
                  {claiming ? 'Claiming...' : 'Claim Device'}
                </button>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">Create New Device</h3>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Device name (e.g. Greenhouse North Bench)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700"
                />
                <button
                  type="button"
                  onClick={createDevice}
                  disabled={creating || !createName.trim()}
                  className="px-4 py-2 rounded-lg bg-[#6bcf9e] text-gray-900 font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Device'}
                </button>
              </div>

              {createdDevice ? (
                <div className="border border-[#ffd9a3] bg-[#fff6e5] rounded-lg p-3 space-y-2">
                  <p className="text-sm text-gray-800 font-semibold">New device created</p>
                  <p className="text-sm text-gray-700">Monitor ID: {createdDevice.monitorID}</p>
                  <p className="text-sm text-gray-700 break-all">API Key: {createdDevice.apiKey}</p>
                  <button
                    type="button"
                    onClick={copyCreatedKey}
                    className="px-3 py-1 rounded-md bg-white border border-gray-300 text-sm text-gray-700"
                  >
                    Copy API Key
                  </button>
                </div>
              ) : null}

              {deviceMessage ? <p className="text-sm text-green-700">{deviceMessage}</p> : null}
              {deviceError ? <p className="text-sm text-red-700">{deviceError}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
