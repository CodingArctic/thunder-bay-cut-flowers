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

interface RangeRecord {
  record_id?: number;
  first_record_id?: number;
  latest_record_id?: number;
  time: string;
  dehydration_score: number;
}

interface RangeResponse {
  aggregation: 'raw' | 'hour';
  imageRecordField?: 'record_id' | 'first_record_id' | 'latest_record_id';
  data: RangeRecord[];
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

function toLocalISOString(dateString: string) {
  return new Date(dateString).toISOString();
}

export function Data() {
  const [error, setError] = useState('');
  const [monitorID, setMonitorID] = useState('');
  const [monitorOptions, setMonitorOptions] = useState<MonitorSummary[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [chartRecords, setChartRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [aggregation, setAggregation] = useState<'auto' | 'raw' | 'hour'>('auto');

  // const [startDate, setStartDate] = useState<string>('');
  // const [endDate, setEndDate] = useState<string>('');
  function toLocalDatetimeInput(date: Date) {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 1);
    return toLocalDatetimeInput(past);
  });

  const [endDate, setEndDate] = useState(() => {
    return toLocalDatetimeInput(new Date());
  });

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
        const params = new URLSearchParams({
          start: toLocalISOString(startDate),
          end: toLocalISOString(endDate),
          aggregation: 'auto',
          maxPoints: '40',
        });

        const response = await apiRequest<RangeResponse>(
          `/api/record/range/${monitorID}?${params.toString()}`,
          'GET'
        );

        if (!response || !Array.isArray(response.data)) {
          setChartRecords([]);
          setRecords([]);
          setSelectedRecord(null);
          return;
        }

        setAggregation(response.aggregation);
        const imageField = response.imageRecordField || (response.aggregation === 'hour' ? 'first_record_id' : 'record_id');

        // Normalize data depending on aggregation
        const normalized = response.data.map((item: RangeRecord) => ({
          ...item,
          time: item.time,
          image_record_id: (item as any)[imageField] || item.record_id || item.first_record_id || item.latest_record_id || null,
        }));

        setChartRecords(normalized);
        setRecords([...normalized].reverse());
        setSelectedRecord(normalized[normalized.length - 1] || null);

      } catch (error: any) {
        setError(error.message);
      }
    };
    if (monitorID && startDate && endDate) {
      fetchData();
    }
  }, [monitorID, startDate, endDate]);

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
              <div className="w-full max-w-sm">
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-gray-800 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-gray-800 rounded-lg"
                  />
                </div>
              </div>
            
            <div className="mt-6">
              {chartRecords.length ?
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartRecords}
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
                : <h1 className='text-gray-800 text-center m-auto mb-8'>No records, try another date range!</h1>
              }
            </div>
            
            <div className="mt-6 space-y-2 max-h-75 overflow-y-auto">
              {records.map((record, index) => (
                <div
                  key={record.image_record_id || record.record_id || record.time}
                  className={`flex justify-between text-sm py-2 px-3 rounded cursor-pointer hover:bg-[#ffd9a3]/30 transition-colors ${selectedRecord?.image_record_id === record.image_record_id ? 'bg-[#ffd9a3]/50' : ''
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
                      {selectedRecord ? `${Math.round(selectedRecord.dehydration_score * 100)}%` : ''}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {/* Photo from Image Folder */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 mb-3 bg-[#ffd9a3] inline-block px-3 py-1 rounded">
              PHOTO FROM SELECTED RECORD
            </h2>
            {selectedRecord ? (
              <img
                src={`/api/record/image/${selectedRecord.image_record_id}`}
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
