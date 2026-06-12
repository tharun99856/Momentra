import type { Metadata } from 'next'
import '@/styles/global.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Momentra — AI-Powered Event Photo Management',
  description: 'The all-in-one SaaS platform for organizations to capture, manage, and share event photography with AI-powered galleries.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
