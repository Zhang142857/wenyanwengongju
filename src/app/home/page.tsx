'use client'

import Link from 'next/link'
import styles from './home.module.css'

export default function HomePage() {
  const tools = [
    {
      id: 'classical-chinese',
      name: '文言文查询',
      description: '查询文言文字词和句子',
      icon: '📚',
      link: '/',
      category: '文字处理'
    },
    {
      id: 'json-formatter',
      name: 'JSON 格式化',
      description: '美化和校验JSON代码',
      icon: '{ }',
      link: '#',
      category: '开发工具'
    },
    {
      id: 'base64',
      name: 'Base64 编解码',
      description: '字符串与Base64互转',
      icon: '🔄',
      link: '#',
      category: '开发工具'
    },
    {
      id: 'calculator',
      name: '计算器',
      description: '执行基本数学运算',
      icon: '🔢',
      link: '#',
      category: '日常工具'
    },
    {
      id: 'qrcode',
      name: '二维码生成',
      description: '生成自定义二维码',
      icon: '📱',
      link: '#',
      category: '图片工具'
    },
    {
      id: 'timestamp',
      name: '时间戳转换',
      description: '时间与时间戳互转',
      icon: '⏰',
      link: '#',
      category: '开发工具'
    }
  ]

  const categories = ['全部', '文字处理', '图片工具', '开发工具', '日常工具']

  return (
    <div className={styles.container}>
      <div className={styles.overlay}></div>
      
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.icon}>🧰</span>
            <h1 className={styles.title}>工具箱</h1>
          </div>
          
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="搜索工具..." 
              className={styles.searchInput}
            />
          </div>
        </header>

        <div className={styles.main}>
          <div className={styles.categories}>
            {categories.map((category, index) => (
              <button
                key={category}
                className={`${styles.categoryBtn} ${index === 0 ? styles.active : ''}`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className={styles.toolsGrid}>
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.link}
                className={styles.toolCard}
              >
                <div className={styles.toolIcon}>{tool.icon}</div>
                <div className={styles.toolInfo}>
                  <h2 className={styles.toolName}>{tool.name}</h2>
                  <p className={styles.toolDesc}>{tool.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
