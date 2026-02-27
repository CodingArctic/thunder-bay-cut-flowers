import React from 'react';

const dataPoints = [
  { time: '8:00am', value: '0.94' },
  { time: '8:15am', value: '0.86' },
  { time: '8:30am', value: '0.91' },
  { time: '8:45am', value: '0.88' },
  { time: '9:00am', value: '0.95' },
  { time: '9:15am', value: '0.82' },
  { time: '9:30am', value: '0.89' },
  { time: '9:45am', value: '0.92' },
  { time: '10:00am', value: '0.87' },
  { time: '10:15am', value: '0.93' },
  { time: '10:30am', value: '0.85' },
  { time: '11:00am', value: '0.90' },
  { time: '11:15am', value: '0.88' }
];

const radius = 30;
const circumference = 2 * Math.PI * radius;
const progress = 0.91;

export function Data() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-[#ffb84d] rounded-lg flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">DATA</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Overview */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
              DATA OVERVIEW
            </h2>
            
            <div className="mt-6 space-y-2 max-h-[400px] overflow-y-auto">
              {dataPoints.map((item, index) => (
                <div key={index} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{item.time}</span>
                  <span className="text-gray-800 font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Photo and Health Score */}
        <div className="space-y-6">
          {/* Photo from Image/VIDEO Folder */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 mb-3 bg-[#ffd9a3] inline-block px-3 py-1 rounded">
              PHOTO FROM IMAGE/VIDEO FOLDER
            </h2>
            <img 
              src="https://images.unsplash.com/photo-1597848212624-e704ce46e90e?w=600&h=400&fit=crop" 
              alt="Sunflower"
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>

          {/* Overall Flower Health */}
          <div className="bg-[#ffd9a3] rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-800 mb-4 bg-[#ffe4b8] inline-block px-3 py-1 rounded">
              OVERALL FLOWER HEALTH
            </h2>
            
            <div className="bg-[#ffe4b8] rounded-lg p-6 text-center mt-4">
              <div className="text-5xl mb-4">😎</div>
              <div className="flex items-center justify-center gap-4">
                <div>
                  <div className="text-3xl font-bold text-gray-800">0.91</div>
                  <div className="text-sm text-gray-600 mt-1">Health Score</div>
                </div>
                <div className="relative">
                  <svg width="70" height="70" viewBox="0 0 70 70">
                    <circle
                      cx="35"
                      cy="35"
                      r="30"
                      fill="none"
                      stroke="#ffd9a3"
                      strokeWidth="7"
                    />
                    <circle
                      cx="35"
                      cy="35"
                      r="30"
                      fill="none"
                      stroke="#ff6b6b"
                      strokeWidth="7"
                      strokeDasharray={`${circumference * progress} ${circumference}`}
                      strokeDashoffset={circumference * (1 - progress)}
                      transform="rotate(-90 35 35)"
                    />
                    <text x="35" y="40" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">
                      91%
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
