export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-verus-blue/20 to-verus-green/20">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
          {/* Animated Loading Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200/20 border-t-blue-400 rounded-full animate-spin"></div>
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin"
                style={{
                  animationDirection: 'reverse',
                  animationDuration: '1.5s',
                }}
              ></div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">
            Loading Verus Explorer
          </h2>

          <p className="text-blue-200 text-sm">
            Fetching the latest blockchain data...
          </p>

          {/* Loading Progress Bar */}
          <div className="mt-6">
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-verus-blue to-verus-green h-2 rounded-full animate-pulse"
                style={{ width: '60%' }}
              ></div>
            </div>
          </div>

          <div className="mt-4 text-xs text-blue-300">
            This may take a few moments
          </div>
        </div>
      </div>
    </div>
  );
}
