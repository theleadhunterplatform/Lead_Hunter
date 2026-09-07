'use client'

import AppSidebar from '@/components/layout/AppSidebar'

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 pt-32 px-4 max-w-container mx-auto">
        <header className="mb-12">
          <h1 className="text-section text-text-primary">Analytics</h1>
          <p className="text-text-secondary mt-2">Manage your client acquisition intelligence.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-24px border-subtle bg-surface/40 min-h-[200px] flex items-center justify-center text-text-secondary italic">
            Analytics Module Placeholder
          </div>
          <div className="glass-panel p-6 rounded-24px border-subtle bg-surface/40 min-h-[200px] flex items-center justify-center text-text-secondary italic">
            Secondary Data Placeholder
          </div>
          <div className="glass-panel p-6 rounded-24px border-subtle bg-surface/40 min-h-[200px] flex items-center justify-center text-text-secondary italic">
            Quick Actions Placeholder
          </div>
        </div>
      </main>
    </div>
  )
}
