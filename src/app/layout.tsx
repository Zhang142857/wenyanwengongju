import type { Metadata } from 'next'
import Providers from '@/components/Providers'
import InitializeData from '@/components/InitializeData'
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
        <InitializeData />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
