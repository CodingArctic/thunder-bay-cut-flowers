export function Settings() {
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
          
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Full Name</label>
              <div className="text-gray-800 py-2 border-b border-gray-300">Firstname Lastname</div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Username</label>
              <div className="text-gray-800 py-2 border-b border-gray-300">Username</div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Email</label>
              <div className="text-gray-800 py-2 border-b border-gray-300">user.email@gmail.com</div>
            </div>
          </div>
        </div>

        {/* Notifications and Data & Device Management */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-6 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
              NOTIFICATIONS
            </h2>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Watering Needed</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 3 ? 'bg-yellow-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Severe Drought</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 4 ? 'bg-red-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Health Decrease</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 2 ? 'bg-orange-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Flower Decease</span>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < 5 ? 'bg-purple-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Data & Device Management */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-6 bg-[#ffd9a3] inline-block px-4 py-2 rounded">
              DATA & DEVICE MANAGEMENT
            </h2>
            
            <div className="mt-6 space-y-3">
              <button className="w-full text-left text-gray-700 py-2 border-b border-gray-300 hover:bg-gray-50 transition">
                Linked Devices
              </button>
              <button className="w-full text-left text-gray-700 py-2 border-b border-gray-300 hover:bg-gray-50 transition">
                Privacy Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
