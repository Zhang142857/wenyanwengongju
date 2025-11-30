'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import type { Definition } from '@/types'

export default function FixLinksPage() {
  const [storage] = useState(() => new StorageService())
  const [isLoading, setIsLoading] = useState(true)
  const [isFixing, setIsFixing] = useState(false)
  const [stats, setStats] = useState({
    totalDefinitions: 0,
    withLinks: 0,
    withoutLinks: 0,
  })
  const [fixResult, setFixResult] = useState<{
    fixed: number
    notFixed: number
    details: Array<{ character: string; definition: string; status: string }>
  } | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    await storage.initialize()
    
    const definitions = storage.getDefinitions()
    const links = storage.getCharacterDefinitionLinks()
    
    const withLinks = definitions.filter(def => 
      links.some(link => link.definitionId === def.id)
    ).length
    
    setStats({
      totalDefinitions: definitions.length,
      withLinks,
      withoutLinks: definitions.length - withLinks,
    })
    setIsLoading(false)
  }

  const handleFix = async () => {
    setIsFixing(true)
    setFixResult(null)
    
    try {
      const definitions = storage.getDefinitions()
      const links = storage.getCharacterDefinitionLinks()
      const libraries = storage.getLibraries()
      
      // 找出没有例句的义项
      const definitionsWithoutLinks = definitions.filter(def => 
        !links.some(link => link.definitionId === def.id)
      )
      
      const details: Array<{ character: string; definition: string; status: string }> = []
      let fixed = 0
      let notFixed = 0
      
      // 收集所有句子
      const allSentences: Array<{ id: string; text: string }> = []
      for (const library of libraries) {
        for (const collection of library.collections) {
          for (const article of collection.articles) {
            allSentences.push(...article.sentences)
          }
        }
      }
      
      // 尝试为每个无例句的义项找到匹配的句子
      for (const def of definitionsWithoutLinks) {
        let linked = false
        
        // 查找包含该字的句子
        for (const sentence of allSentences) {
          if (sentence.text.includes(def.character)) {
            // 找到字在句子中的位置
            const charPosition = sentence.text.indexOf(def.character)
            if (charPosition !== -1) {
              // 检查是否已经有这个关联
              const existingLink = links.find(
                link => link.definitionId === def.id && link.sentenceId === sentence.id
              )
              
              if (!existingLink) {
                storage.addCharacterDefinitionLink(def.id, sentence.id, charPosition)
                linked = true
                fixed++
                details.push({
                  character: def.character,
                  definition: def.content,
                  status: `✅ 已关联到: "${sentence.text.substring(0, 30)}..."`
                })
                break
              }
            }
          }
        }
        
        if (!linked) {
          notFixed++
          details.push({
            character: def.character,
            definition: def.content,
            status: `❌ 未找到包含"${def.character}"的句子`
          })
        }
      }
      
      await storage.saveToLocal()
      
      setFixResult({ fixed, notFixed, details })
      await loadStats() // 重新加载统计
      
    } catch (error) {
      console.error('修复失败:', error)
      alert('修复失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsFixing(false)
    }
  }

  if (isLoading) {
    return (
      <Layout title="修复例句关联" subtitle="Fix Definition Links" fullWidth>
        <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>
      </Layout>
    )
  }

  return (
    <Layout title="修复例句关联" subtitle="Fix Definition Links" fullWidth>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>修复无例句的义项</h1>
        
        {/* 统计信息 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <StatCard title="总义项数" value={stats.totalDefinitions} />
          <StatCard title="有例句" value={stats.withLinks} color="#28a745" />
          <StatCard title="无例句" value={stats.withoutLinks} color="#dc3545" />
        </div>
        
        {/* 说明 */}
        <div style={{
          padding: '1.5rem',
          background: '#e7f3ff',
          border: '1px solid #b3d9ff',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>📋 修复原理</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>
            系统会自动查找文言文库中包含该字的句子，并建立关联。
            如果一个字在多个句子中出现，会关联到第一个找到的句子。
          </p>
        </div>
        
        {/* 操作按钮 */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={handleFix}
            disabled={isFixing || stats.withoutLinks === 0}
            style={{
              padding: '0.75rem 2rem',
              background: stats.withoutLinks === 0 ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: stats.withoutLinks === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isFixing ? '修复中...' : stats.withoutLinks === 0 ? '没有需要修复的义项' : `修复 ${stats.withoutLinks} 个无例句义项`}
          </button>
        </div>
        
        {/* 修复结果 */}
        {fixResult && (
          <div style={{
            padding: '1.5rem',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              修复结果：成功 {fixResult.fixed} 个，失败 {fixResult.notFixed} 个
            </h3>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>字</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>义项</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {fixResult.details.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontSize: '1.2rem', fontWeight: 'bold' }}>{item.character}</td>
                      <td style={{ padding: '0.75rem' }}>{item.definition}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function StatCard({ title, value, color }: { title: string; value: number; color?: string }) {
  return (
    <div style={{
      padding: '1.5rem',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color || '#333' }}>{value}</div>
    </div>
  )
}
