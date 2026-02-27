import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const chartData = [
  { time: '8:00am', value: 82 },
  { time: '8:15am', value: 88 },
  { time: '8:30am', value: 79 },
  { time: '8:45am', value: 85 },
  { time: '9:00am', value: 92 },
  { time: '9:15am', value: 86 },
  { time: '9:30am', value: 0 }
];

const dataOverview = [
  { time: '8:00am', value: '0.94' },
  { time: '8:15am', value: '0.86' },
  { time: '8:30am', value: '0.91' },
  { time: '8:45am', value: '0.88' },
  { time: '9:00am', value: '0.95' },
  { time: '9:15am', value: '0.82' },
  { time: '9:30am', value: '0.89' }
];

const radius = 35;
const circumference = 2 * Math.PI * radius;
const progress = 0.94;

export function Dashboard() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#ffb84d] rounded-lg flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">DASHBOARD</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last Hour Overview */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
            LAST HOUR OVERVIEW
          </h2>
          
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0d0d0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="#ffa07a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-2">
            {dataOverview.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.time}</span>
                <span className="text-gray-800 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Health Message */}
        <div className="space-y-6">
          <div className="bg-[#ffd9a3] rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-6">CURRENT HEALTH MESSAGE</h2>
            
            <div className="bg-[#ffe4b8] rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">😊</div>
              <div className="flex items-center justify-center gap-4">
                <div>
                  <div className="text-4xl font-bold text-gray-800">0.94</div>
                  <div className="text-sm text-gray-600 mt-1">Health Score</div>
                </div>
                <div className="relative">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="#ffd9a3"
                      strokeWidth="8"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      fill="none"
                      stroke="#ff6b6b"
                      strokeWidth="8"
                      strokeDasharray={`${circumference * progress} ${circumference}`}
                      strokeDashoffset={circumference * (1 - progress)}
                      transform="rotate(-90 40 40)"
                    />
                    <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#333">
                      94%
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
