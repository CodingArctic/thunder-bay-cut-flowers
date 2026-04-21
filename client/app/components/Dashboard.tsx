import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { apiRequest } from '../utils/api-request';
import { SetupDevicePrompt } from './SetupDevicePrompt';

interface MonitorSummary {
  monitor_id: number;
  name: string;
}

interface MonitorsResponse {
  monitorIDs?: number[];
  monitors?: MonitorSummary[];
}

const radius = 50;
const circumference = 2 * Math.PI * radius;

// Helper function to get emoji based on health score
function getHealthEmoji(score: number): string {
  if (score >= 0.9) return '😊';  // Excellent
  if (score >= 0.7) return '🙂';  // Good
  if (score >= 0.5) return '😐';  // Fair
  if (score >= 0.3) return '😟';  // Poor
  return '😞';  // Critical
}

export function Dashboard() {
  const [error, setError] = useState('');
  const [monitorID, setMonitorID] = useState('');
  const [monitorOptions, setMonitorOptions] = useState<MonitorSummary[]>([]);
  const [isLoadingMonitors, setIsLoadingMonitors] = useState<boolean>(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [latestRecordID, setLatestRecordID] = useState<number | null>(null);
  const [latestScore, setLatestScore] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [hasLoadedData, setHasLoadedData] = useState<boolean>(false);

  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const response = await apiRequest<MonitorsResponse>(`/api/monitors/all`, `GET`);
        const monitors = response?.monitors || [];
        setMonitorOptions(monitors);
        // Set the first available monitor as default if not already set
        if (monitors.length > 0 && !monitorID) {
          setMonitorID(String(monitors[0].monitor_id));
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoadingMonitors(false);
      }
    };
    fetchMonitors();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const data = await apiRequest(`/api/record/recent/${monitorID}?limit=12`, `GET`);
        setChartData(Array.isArray(data) ? data : []);
        // Set the latest record ID and score (last item in the array since API returns oldest first)
        if (Array.isArray(data) && data.length > 0) {
          const latestRecord = data[data.length - 1];
          setLatestRecordID(latestRecord.record_id);
          setLatestScore(latestRecord.dehydration_score);
        } else {
          setLatestRecordID(null);
          setLatestScore(0);
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoadingData(false);
        setHasLoadedData(true);
      }
    };
    if (monitorID) {
      fetchData();

      const pollInterval = window.setInterval(() => {
        fetchData();
      }, 60000);

      return () => {
        window.clearInterval(pollInterval);
      };
    }
  }, [monitorID]);

  const showNeutralHealthState = !hasLoadedData || isLoadingData;
  const healthEmoji = showNeutralHealthState ? '😐' : getHealthEmoji(latestScore);

  if (!isLoadingMonitors && monitorOptions.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#ffb84d] rounded-lg flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">DASHBOARD</h1>
        </div>
        <SetupDevicePrompt pageName="Dashboard" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#ffb84d] rounded-lg flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">DASHBOARD</h1>
      </div>

      {error ? <div className="mb-4 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-6">
        {/* Recent Data Overview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
            LAST 2 HOURS
          </h2>
          <div className="mb-4">
            <label htmlFor="monitor-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Monitor:
            </label>
            <div className="w-full max-w-sm">
              <select
                id="monitor-select"
                value={monitorID}
                onChange={(e) => setMonitorID(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg bg-white focus:outline-none focus:border-[#ffb84d] focus:ring-2 focus:ring-[#ffb84d]/30"
              >
                <option value="">-- Select a Monitor --</option>
                {monitorOptions.map((monitor) => (
                  <option key={monitor.monitor_id} value={monitor.monitor_id}>
                    {monitor.name} (ID {monitor.monitor_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0d0d0" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(value) => `${Math.round(value * 100)}%`}
                  domain={[0, 1]}
                />
                <Tooltip 
                  formatter={(value: any) => `${Math.round(value * 100)}%`}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Bar dataKey="dehydration_score" fill="#ffa07a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Health Message */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#ffd9a3] rounded-lg pt-6 px-6 pb-4 shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-gray-800">CURRENT HEALTH MESSAGE</h2>

            <div className="flex-1 flex items-center py-4">
              <div className="bg-[#ffe4b8] border border-[#f2c27d] rounded-lg p-6 text-center w-full">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-8xl leading-none">{healthEmoji}</div>
                  <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#ffd9a3"
                        strokeWidth="10"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#ff6b6b"
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - latestScore)}
                        strokeLinecap="butt"
                        transform="rotate(-90 60 60)"
                      />
                      <text x="60" y="70" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#333">
                        {latestScore ? `${Math.round(latestScore * 100)}%` : ''}
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Photo */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 mb-3 bg-[#ffd9a3] inline-block px-3 py-1 rounded">
              LATEST PHOTO
            </h2>
            {latestRecordID ? (
              <img 
                src={`/api/record/image/${latestRecordID}`}
                alt="Latest flower photo"
                className="w-full aspect-video object-contain bg-gray-100 rounded-lg"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">No photo available</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}