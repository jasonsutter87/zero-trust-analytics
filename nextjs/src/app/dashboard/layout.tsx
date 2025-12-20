import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <Link href="/dashboard" className="text-xl font-bold">
              ZTA
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-2" role="navigation">
            <Link
              href="/dashboard"
              className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Settings
            </Link>
          </nav>

          <div className="p-4 border-t dark:border-gray-700">
            <button
              className="w-full flex items-center px-4 py-2 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8" role="main">
        {children}
      </main>
    </div>
  )
}
