'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, SearchIcon, EditIcon, BookIcon, MindMapIcon } from './Icons'
import { useSidebar } from '@/contexts/SidebarContext'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggleCollapsed } = useSidebar()

  const navItems = [
    { name: '首页', path: '/', icon: HomeIcon },
    { name: '查字', path: '/query', icon: SearchIcon },
    { name: '义项整理', path: '/organize', icon: MindMapIcon },
    { name: 'AI义项整理', path: '/ai-organize', icon: MindMapIcon },
    { name: '编辑库', path: '/manage', icon: EditIcon },
    { name: '导入数据', path: '/import', icon: EditIcon },
    { name: '自动出题', path: '/exam', icon: EditIcon },
  ]

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logo}>
        <BookIcon className={styles.logoIcon} />
        {!collapsed && <span className={styles.logoText}>文言文</span>}
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
              title={collapsed ? item.name : undefined}
            >
              <Icon className={styles.navIcon} />
              {!collapsed && <span className={styles.navText}>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <button 
        className={styles.toggleButton}
        onClick={toggleCollapsed}
        aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        <svg 
          className={styles.toggleIcon}
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          {collapsed ? (
            <path d="M9 18l6-6-6-6" />
          ) : (
            <path d="M15 18l-6-6 6-6" />
          )}
        </svg>
      </button>
    </aside>
  )
}
