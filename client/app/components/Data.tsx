import React, { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api-request';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';


interface MonitorSummary {
  monitor_id: number;
  name: string;
}

interface MonitorsResponse {
  monitorIDs?: number[];
  monitors?: MonitorSummary[];
}

const radius = 40;
const circumference = 2 * Math.PI * radius;

// Helper function to get emoji based on health score
function getHealthEmoji(score: number): string {
  if (score >= 0.9) return '😊';  // Excellent
  if (score >= 0.7) return '🙂';  // Good
  if (score >= 0.5) return '😐';  // Fair
  if (score >= 0.3) return '😟';  // Poor
  return '😞';  // Critical
}

export function Data() {
  const [error, setError] = useState('');
  const [monitorID, setMonitorID] = useState('');
  const [monitorOptions, setMonitorOptions] = useState<MonitorSummary[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

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
      }
    };
    fetchMonitors();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiRequest(`/api/record/recent/${monitorID}?limit=20`, `GET`);
        setRecords(Array.isArray(data) ? data.reverse() : []);
        // Set the first record as selected by default
        if (Array.isArray(data) && data.length > 0) {
          setSelectedRecord(data[0]);
        } else {
          setSelectedRecord(null);
        }
      } catch (error: any) {
        setError(error.message);
      }
    };
    if (monitorID) {
      fetchData();
    }
  }, [monitorID]);

  const progress = selectedRecord ? selectedRecord.dehydration_score : 0;
  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#ffb84d] rounded-lg flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">DATA</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 ">
        {/* Data Overview */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
              DATA OVERVIEW
            </h2>
            
            <div className="mb-4">
              <label htmlFor="monitor-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Monitor:
              </label>
              <select
                id="monitor-select"
                value={monitorID}
                onChange={(e) => setMonitorID(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg focus:ring-2 focus:ring-[#ffb84d] focus:border-transparent bg-white"
              >
                <option value="">-- Select a Monitor --</option>
                {monitorOptions.map((monitor) => (
                  <option key={monitor.monitor_id} value={monitor.monitor_id}>
                    {monitor.name} (ID {monitor.monitor_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-2 max-h-[400px] overflow-y-auto">
              {records.map((record, index) => (
                <div 
                  key={record.record_id} 
                  className={`flex justify-between text-sm py-2 px-3 rounded cursor-pointer hover:bg-[#ffd9a3]/30 transition-colors ${
                    selectedRecord?.record_id === record.record_id ? 'bg-[#ffd9a3]/50' : ''
                  }`}
                  onClick={() => setSelectedRecord(record)}
                >
                  <span className="text-gray-600">
                    {new Date(record.time).toLocaleString([], { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  <span className="text-gray-800 font-medium">
                    {Math.round(record.dehydration_score * 100)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={records}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      setSelectedRecord(state.activePayload[0].payload);
                    }
                  }}
                >
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
                    domain={[0, 1]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${Math.round(value * 100)}%`}
                  />
                  <Tooltip
                    formatter={(value: any) => `${Math.round(value * 100)}%`}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Line type="monotone" dataKey="dehydration_score" stroke="#ff6b6b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Photo and Health Score */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          

          {/* Overall Flower Health */}
          <div className="bg-[#ffd9a3] rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 mb-4 bg-[#ffe4b8] inline-block px-3 py-1 rounded">
              FLOWER HEALTH AT SELECTED TIME
            </h2>
            
            <div className="bg-[#ffe4b8] rounded-lg p-6 text-center mt-4">
              <div className="text-6xl mb-4">{selectedRecord ? getHealthEmoji(selectedRecord.dehydration_score) : '😐'}</div>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#ffd9a3"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#ff6b6b"
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - progress)}
                      strokeLinecap="butt"
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="58" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#333">
                      {selectedRecord ? `${Math.round(selectedRecord.dehydration_score * 100)}%` : '0%'}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {/* Photo from Image/VIDEO Folder */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 mb-3 bg-[#ffd9a3] inline-block px-3 py-1 rounded">
              PHOTO FROM SELECTED RECORD
            </h2>
            {selectedRecord ? (
              <img 
                src={`/api/record/image/${selectedRecord.record_id}`}
                alt="Flower photo"
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
