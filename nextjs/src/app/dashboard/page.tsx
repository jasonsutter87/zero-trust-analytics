'use client'

import { useState, useEffect } from 'react'

interface Site {
  id: string
  domain: string
  name: string
  pageviews: number
  visitors: number
}

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSites() {
      try {
        const res = await fetch('/api/sites')
        const data = await res.json()
        setSites(data.sites || [])
      } catch (error) {
        console.error('Failed to fetch sites:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSites()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Your Sites</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Add Site
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-medium mb-2">No sites yet</h2>
          <p className="text-gray-500 mb-4">Get started by adding your first site</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Add Your First Site
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <div
              key={site.id}
              data-testid="site-card"
              className="p-6 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 hover:shadow-lg transition"
            >
              <h3 className="font-semibold mb-2">{site.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{site.domain}</p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{site.pageviews.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Pageviews</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{site.visitors.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Visitors</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  View Analytics
                </button>
                <button className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  Snippet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
