'use client'

import { useState, useEffect } from 'react'
import { StorageService } from '@/services/storage'

interface DiagnosticResult {
  totalDefinitions: number
  definitionsWithLinks: number
  definitionsWithoutLinks: number
  totalLinks: number
  totalShortSentences: number
  charactersWithMultipleDefinitions: string[]
  charactersWithSingleDefinition: string[]
  examplesByDefinition: Map<string, number>
  topCharacters: Array<{ 
    character: string
    definitionCount: number
    exampleCount: number
    shortSentenceCount: number
    definitionShortSentenceCounts: number[]
    canReallyGenerateExam: boolean
  }>
}

interface DebugInfo {
  character: string
  definitions: Array<{
    id: string
    content: string
    linkedSentenceIds: string[]
    matchingShortSentences: Array<{ text: string; sourceSentenceId: string }>
  }>
  allShortSentencesWithChar: Array<{ text: string; sourceSentenceId: string }>
}

export default function DefinitionDiagnostic() {
  const [storage] = useState(() => new StorageService())
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  useEffect(() => {
    diagnose()
  }, [])

  const showDebugInfo = (character: string) => {
    const definitions = storage.getDefinitions().filter(d => d.character === character)
    const links = storage.getCharacterDefinitionLinks()
    const shortSentences = storage.getShortSentences()
    
    const allShortSentencesWithChar = shortSentences
      .filter(ss => ss.text.includes(character))
      .map(ss => ({ text: ss.text, sourceSentenceId: ss.sourceSentenceId }))
    
    const definitionDetails = definitions.map(def => {
      const defLinks = links.filter(link => link.definitionId === def.id)
      const linkedSentenceIds = defLinks.map(link => link.sentenceId)
      const linkedSentenceIdSet = new Set(linkedSentenceIds)
      
      // 获取关联句子的文本（用于模糊匹配）
      const linkedSentenceTexts: string[] = []
      for (const link of defLinks) {
        const sentence = storage.getSentenceById(link.sentenceId)
        if (sentence) {
          linkedSentenceTexts.push(sentence.text)
        }
      }
      
      // 策略1：精确匹配
      let matchingShortSentences = shortSentences
        .filter(ss => ss.text.includes(character) && linkedSentenceIdSet.has(ss.sourceSentenceId))
        .map(ss => ({ text: ss.text, sourceSentenceId: ss.sourceSentenceId }))
      
      // 策略2：模糊匹配
      const additionalMatches = shortSentences
        .filter(ss => {
          if (!ss.text.includes(character)) return false
          if (linkedSentenceIdSet.has(ss.sourceSentenceId)) return false
          return linkedSentenceTexts.some(sentenceText => sentenceText.includes(ss.text))
        })
        .map(ss => ({ text: ss.text, sourceSentenceId: ss.sourceSentenceId }))
      
      matchingShortSentences = [...matchingShortSentences, ...additionalMatches]
      
      return {
        id: def.id,
        content: def.content,
        linkedSentenceIds,
        matchingShortSentences
      }
    })
    
    setDebugInfo({
      character,
      definitions: definitionDetails,
      allShortSentencesWithChar
    })
  }

  const diagnose = async () => {
    setIsLoading(true)
    await storage.initialize()

    const definitions = storage.getDefinitions()
    const links = storage.getCharacterDefinitionLinks()
    const shortSentences = storage.getShortSentences()

    // 统计每个义项的例句数量
    const examplesByDefinition = new Map<string, number>()
    definitions.forEach(def => {
      const defLinks = links.filter(link => link.definitionId === def.id)
      examplesByDefinition.set(def.id, defLinks.length)
    })

    // 有例句的义项
    const definitionsWithLinks = definitions.filter(def => {
      const count = examplesByDefinition.get(def.id) || 0
      return count > 0
    })

    // 没有例句的义项
    const definitionsWithoutLinks = definitions.filter(def => {
      const count = examplesByDefinition.get(def.id) || 0
      return count === 0
    })

    // 按字分组
    const charGroups = new Map<string, typeof definitions>()
    definitions.forEach(def => {
      if (!charGroups.has(def.character)) {
        charGroups.set(def.character, [])
      }
      charGroups.get(def.character)!.push(def)
    })

    // 有多个义项的字
    const charactersWithMultiple = Array.from(charGroups.entries())
      .filter(([_, defs]) => defs.length >= 2)
      .map(([char]) => char)

    // 只有一个义项的字
    const charactersWithSingle = Array.from(charGroups.entries())
      .filter(([_, defs]) => defs.length === 1)
      .map(([char]) => char)

    // 统计每个字的义项数、例句数和短句数，以及是否真正可出题
    const topCharacters = Array.from(charGroups.entries())
      .map(([character, defs]) => {
        const exampleCount = defs.reduce((sum, def) => {
          return sum + (examplesByDefinition.get(def.id) || 0)
        }, 0)
        
        // 统计包含该字的短句数量
        const shortSentenceCount = shortSentences.filter(ss => ss.text.includes(character)).length
        
        // 计算每个义项能匹配到的短句数量（使用与出题生成器相同的匹配策略）
        const definitionShortSentenceCounts: number[] = []
        for (const def of defs) {
          const defLinks = links.filter(link => link.definitionId === def.id)
          const linkedSentenceIds = new Set(defLinks.map(link => link.sentenceId))
          
          // 获取关联句子的文本（用于模糊匹配）
          const linkedSentenceTexts: string[] = []
          for (const link of defLinks) {
            const sentence = storage.getSentenceById(link.sentenceId)
            if (sentence) {
              linkedSentenceTexts.push(sentence.text)
            }
          }
          
          // 策略1：通过sourceSentenceId精确匹配
          let matchingShortSentences = shortSentences.filter(ss => 
            ss.text.includes(character) && linkedSentenceIds.has(ss.sourceSentenceId)
          )
          
          // 策略2：通过文本包含关系模糊匹配
          const additionalMatches = shortSentences.filter(ss => {
            if (!ss.text.includes(character)) return false
            if (linkedSentenceIds.has(ss.sourceSentenceId)) return false // 已经匹配过
            // 检查短句是否是某个关联句子的子串
            return linkedSentenceTexts.some(sentenceText => sentenceText.includes(ss.text))
          })
          matchingShortSentences = [...matchingShortSentences, ...additionalMatches]
          
          definitionShortSentenceCounts.push(matchingShortSentences.length)
        }
        
        // 判断是否真正可出题：
        // 1. 至少2个义项
        // 2. 至少有1个义项有>=3个短句（用于正确答案）
        // 3. 其他义项合计有>=9个短句（用于3个干扰项，每个3个短句）
        let canReallyGenerateExam = false
        if (defs.length >= 2) {
          // 按短句数量排序
          const sortedCounts = [...definitionShortSentenceCounts].sort((a, b) => b - a)
          // 最多短句的义项用于正确答案
          const correctAnswerCount = sortedCounts[0] || 0
          // 其他义项的短句用于干扰项
          const otherCount = sortedCounts.slice(1).reduce((sum, c) => sum + c, 0)
          // 正确答案需要3个短句，干扰项需要9个短句（3个选项×3个短句）
          canReallyGenerateExam = correctAnswerCount >= 3 && otherCount >= 9
        }
        
        return {
          character,
          definitionCount: defs.length,
          exampleCount,
          shortSentenceCount,
          definitionShortSentenceCounts,
          canReallyGenerateExam
        }
      })
      .sort((a, b) => b.shortSentenceCount - a.shortSentenceCount)
      .slice(0, 20)

    setResult({
      totalDefinitions: definitions.length,
      definitionsWithLinks: definitionsWithLinks.length,
      definitionsWithoutLinks: definitionsWithoutLinks.length,
      totalLinks: links.length,
      totalShortSentences: shortSentences.length,
      charactersWithMultipleDefinitions: charactersWithMultiple,
      charactersWithSingleDefinition: charactersWithSingle,
      examplesByDefinition,
      topCharacters
    })

    setIsLoading(false)
  }

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>正在诊断义项库...</div>
  }

  if (!result) {
    return <div style={{ padding: '2rem' }}>无法加载诊断结果</div>
  }

  const canGenerateExam = result.charactersWithMultipleDefinitions.length > 0 &&
    result.definitionsWithLinks >= 6 && // 至少需要6个有例句的义项
    result.totalShortSentences >= 30 // 至少需要30个短句

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>义项库诊断报告</h1>

      {/* 总体状态 */}
      <div style={{
        padding: '1.5rem',
        background: canGenerateExam ? '#d4edda' : '#f8d7da',
        border: `1px solid ${canGenerateExam ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          {canGenerateExam ? '✅ 可以出题' : '❌ 暂时无法出题'}
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          {canGenerateExam
            ? '义项库数据充足，可以开始出题'
            : '义项库数据不足，请先使用"AI自动生成义项"功能'}
        </p>
      </div>

      {/* 统计数据 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <StatCard title="总义项数" value={result.totalDefinitions} />
        <StatCard title="有例句的义项" value={result.definitionsWithLinks} color="#28a745" />
        <StatCard title="无例句的义项" value={result.definitionsWithoutLinks} color="#dc3545" />
        <StatCard title="总例句关联数" value={result.totalLinks} />
        <StatCard title="短句库" value={result.totalShortSentences} color="#007bff" />
        <StatCard
          title="可出题的字"
          value={result.charactersWithMultipleDefinitions.length}
          subtitle="(有2个以上义项)"
          color="#007bff"
        />
        <StatCard
          title="无法出题的字"
          value={result.charactersWithSingleDefinition.length}
          subtitle="(只有1个义项)"
          color="#ffc107"
        />
      </div>

      {/* 出题要求 */}
      <div style={{
        padding: '1.5rem',
        background: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📋 出题要求（4选项，每选项3短句）</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', lineHeight: '1.8' }}>
          <li>每个字至少需要 <strong>2个不同的义项</strong></li>
          <li>正确答案：需要 <strong>1个义项有≥3个短句</strong></li>
          <li>干扰项：需要 <strong>其他义项合计≥9个短句</strong>（3个选项×3个短句）</li>
          <li><strong>关键</strong>：短句必须来源于义项关联的例句（通过sourceSentenceId匹配）</li>
          <li><strong>必须先生成短句库</strong>，否则无法出题</li>
        </ul>
        <p style={{ margin: '1rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
          💡 "各义项短句分布"列显示每个义项能匹配到的短句数量。如果分布不均匀（如 0/0/0...），说明短句和义项关联不匹配。
        </p>
      </div>

      {/* 短句库状态 */}
      {result.totalShortSentences === 0 && (
        <div style={{
          padding: '1.5rem',
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>⚠️ 短句库为空</h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', lineHeight: '1.6' }}>
            自动出题功能需要使用短句库。请先生成短句库。
          </p>
          <button
            onClick={() => window.location.href = '/manage/short-sentences'}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ffc107',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📝 生成短句库
          </button>
        </div>
      )}

      {/* Top 20 字符 */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📊 短句最多的前20个字</h3>
        <div style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={thStyle}>字</th>
                <th style={thStyle}>义项数</th>
                <th style={thStyle}>例句数</th>
                <th style={thStyle}>短句数</th>
                <th style={thStyle}>各义项短句分布</th>
                <th style={thStyle}>可出题</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {result.topCharacters.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{item.character}</span>
                  </td>
                  <td style={tdStyle}>{item.definitionCount}</td>
                  <td style={tdStyle}>{item.exampleCount}</td>
                  <td style={tdStyle}>{item.shortSentenceCount}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                      {item.definitionShortSentenceCounts.join(' / ')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {item.canReallyGenerateExam
                      ? <span style={{ color: '#28a745' }}>✅ 是</span>
                      : <span style={{ color: '#dc3545' }}>❌ 否</span>}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => showDebugInfo(item.character)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      🔍 调试
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 修复无例句义项 */}
      {result.definitionsWithoutLinks > 0 && (
        <div style={{
          padding: '1.5rem',
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>⚠️ 发现 {result.definitionsWithoutLinks} 个无例句的义项</h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', lineHeight: '1.6' }}>
            这些义项没有关联到任何例句，无法用于出题。点击下方按钮尝试自动修复。
          </p>
          <button
            onClick={() => window.location.href = '/manage/definitions/fix-links'}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🔧 修复无例句义项
          </button>
        </div>
      )}

      {/* 建议 */}
      {!canGenerateExam && (
        <div style={{
          padding: '1.5rem',
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>💡 建议</h3>
          <ol style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', lineHeight: '1.8' }}>
            <li>前往"AI义项整理"页面</li>
            <li>选择要处理的库/集/文章</li>
            <li>点击"开始处理"按钮</li>
            <li>等待AI自动生成义项和例句</li>
            <li>如果有无例句的义项，点击"修复无例句义项"按钮</li>
            <li>返回"自动出题"页面开始出题</li>
          </ol>
        </div>
      )}

      {/* 调试信息 */}
      {debugInfo && (
        <div style={{
          padding: '1.5rem',
          background: '#f8f9fa',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>🔍 调试信息：字 "{debugInfo.character}"</h3>
            <button
              onClick={() => setDebugInfo(null)}
              style={{
                padding: '0.25rem 0.5rem',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              关闭
            </button>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              包含该字的所有短句（共 {debugInfo.allShortSentencesWithChar.length} 个）
            </h4>
            <div style={{ 
              maxHeight: '150px', 
              overflow: 'auto', 
              background: 'white', 
              padding: '0.5rem', 
              borderRadius: '4px',
              fontSize: '0.8rem'
            }}>
              {debugInfo.allShortSentencesWithChar.slice(0, 20).map((ss, i) => (
                <div key={i} style={{ marginBottom: '0.25rem' }}>
                  <span style={{ color: '#333' }}>{ss.text}</span>
                  <span style={{ color: '#999', marginLeft: '0.5rem' }}>
                    (来源: {ss.sourceSentenceId.substring(0, 8)}...)
                  </span>
                </div>
              ))}
              {debugInfo.allShortSentencesWithChar.length > 20 && (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  ... 还有 {debugInfo.allShortSentencesWithChar.length - 20} 个短句
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              各义项详情（共 {debugInfo.definitions.length} 个义项）
            </h4>
            {debugInfo.definitions.map((def, i) => (
              <div key={i} style={{ 
                background: 'white', 
                padding: '0.75rem', 
                borderRadius: '4px',
                marginBottom: '0.5rem',
                border: def.matchingShortSentences.length >= 3 ? '2px solid #28a745' : '1px solid #ddd'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  义项 {i + 1}: {def.content}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  关联例句ID: {def.linkedSentenceIds.length} 个
                  {def.linkedSentenceIds.length > 0 && (
                    <span style={{ marginLeft: '0.5rem' }}>
                      ({def.linkedSentenceIds.slice(0, 3).map(id => id.substring(0, 8)).join(', ')}...)
                    </span>
                  )}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: def.matchingShortSentences.length >= 3 ? '#28a745' : '#dc3545',
                  fontWeight: 'bold'
                }}>
                  匹配短句: {def.matchingShortSentences.length} 个
                  {def.matchingShortSentences.length < 3 && ' (不足3个，无法用于出题)'}
                </div>
                {def.matchingShortSentences.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                    {def.matchingShortSentences.slice(0, 5).map(ss => ss.text).join(' | ')}
                    {def.matchingShortSentences.length > 5 && ' ...'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {debugInfo.definitions.every(d => d.matchingShortSentences.length === 0) && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px'
            }}>
              <strong>⚠️ 问题诊断：</strong>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                所有义项的匹配短句数都是0，说明短句的来源句子ID和义项关联的句子ID不匹配。
                <br />
                可能原因：
                <br />
                1. 短句和义项是在不同时间生成的，句子ID发生了变化
                <br />
                2. 需要重新生成短句库或重新运行AI义项整理
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle, color }: {
  title: string
  value: number
  subtitle?: string
  color?: string
}) {
  return (
    <div style={{
      padding: '1rem',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: color || '#333' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem',
  textAlign: 'left',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#333'
}

const tdStyle: React.CSSProperties = {
  padding: '0.75rem',
  fontSize: '0.9rem'
}
