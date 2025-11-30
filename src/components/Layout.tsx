'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import { useSidebar } from '@/contexts/SidebarContext'
import OnboardingTour from './OnboardingTour'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  fullWidth?: boolean
}

export default function Layout({ children, title = '文言文查询', subtitle = 'Classical Chinese Query Tool', fullWidth = false }: LayoutProps) {
  const { collapsed } = useSidebar()
  
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={`${styles.mainContainer} ${collapsed ? styles.mainContainerCollapsed : ''}`}>
        <Header title={title} subtitle={subtitle} />
        <main className={`${styles.main} ${fullWidth ? styles.mainFullWidth : ''}`}>
          {children}
        </main>
      </div>
      <OnboardingTour />
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </header>
  )
}
