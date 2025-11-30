import type { Metadata } from 'next'
import { SidebarProvider } from '@/contexts/SidebarContext'
import './globals.css'

export const metadata: Metadata = {
  title: '文言文查询',
  description: '面向教师的文言文字词查询工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </body>
    </html>
  )
}
