'use client'

import { ReactNode } from 'react'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { ToastProvider } from '@/contexts/ToastContext'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SidebarProvider>
        {children}
      </SidebarProvider>
    </ToastProvider>
  )
}
