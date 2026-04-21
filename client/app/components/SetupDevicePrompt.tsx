import Link from 'next/link';

interface SetupDevicePromptProps {
  pageName: string;
}

export function SetupDevicePrompt({ pageName }: SetupDevicePromptProps) {
  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-[#ffd9a3]">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Set up a device to view {pageName}</h2>
      <p className="text-gray-700 mb-4">
        This page needs at least one monitor linked to your account. Go to Settings to claim an existing device
        or create a new one.
      </p>
      <Link
        href="/settings"
        className="inline-flex items-center px-4 py-2 rounded-lg bg-[#ffb84d] text-gray-900 font-semibold hover:brightness-95 transition"
      >
        Go to Settings
      </Link>
    </div>
  );
}