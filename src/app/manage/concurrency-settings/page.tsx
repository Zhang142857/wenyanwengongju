'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import {
  getConcurrencyConfig,
  updateConcurrencyConfig,
  resetConcurrencyConfig,
  initConcurrencyConfig,
  type ConcurrencyConfig,
} from '@/services/concurrencyConfig'

export default function ConcurrencySettingsPage() {
  const [config, setConfig] = useState<ConcurrencyConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    initConcurrencyConfig()
    setConfig(getConcurrencyConfig())
    setIsLoading(false)
  }, [])

  const handleChange = (key: keyof ConcurrencyConfig, value: number) => {
    if (config) {
      setConfig({ ...config, [key]: value })
      setIsSaved(false)
    }
  }

  const handleSave = () => {
    if (config) {
      updateConcurrencyConfig(config)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }

  const handleReset = () => {
    if (confirm('确定要重置为默认配置吗？')) {
      const defaultConfig = resetConcurrencyConfig()
      setConfig(defaultConfig)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  }

  if (isLoading || !config) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>⚙️ 并发参数设置</h1>

        {/* 说明 */}
        <div
          style={{
            padding: '1.5rem',
            background: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '8px',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>📋 说明</h3>
          <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', lineHeight: '1.6' }}>
            这些参数控制AI请求和短句生成的并发行为。调整这些参数可以优化处理速度和稳定性。
          </p>
          <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
            <li>并发数越高，处理速度越快，但可能导致API限流</li>
            <li>延迟越长，越稳定，但处理速度越慢</li>
            <li>建议根据API配额和网络状况调整</li>
          </ul>
        </div>

        {/* 配置表单 */}
        <div
          style={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          {/* AI定义并发数 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              AI义项生成并发数
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="range"
                min="1"
                max="512"
                value={config.aiDefinitionConcurrency}
                onChange={(e) => handleChange('aiDefinitionConcurrency', parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  minWidth: '60px',
                  padding: '0.5rem 1rem',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              >
                {config.aiDefinitionConcurrency}
              </span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
              范围: 1-512 | 默认: 2 | 建议: 4-8
            </p>
          </div>

          {/* 短句生成并发数 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              短句生成并发数
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="range"
                min="1"
                max="512"
                value={config.shortSentenceConcurrency}
                onChange={(e) => handleChange('shortSentenceConcurrency', parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  minWidth: '60px',
                  padding: '0.5rem 1rem',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              >
                {config.shortSentenceConcurrency}
              </span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
              范围: 1-512 | 默认: 12 | 建议: 8-16
            </p>
          </div>

          {/* 批次间延迟 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              批次间延迟 (毫秒)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={config.batchDelayMs}
                onChange={(e) => handleChange('batchDelayMs', parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  minWidth: '80px',
                  padding: '0.5rem 1rem',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              >
                {config.batchDelayMs}ms
              </span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
              范围: 0-5000ms | 默认: 200ms | 建议: 200-500ms
            </p>
          </div>

          {/* 重试延迟 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              重试延迟 (毫秒)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={config.retryDelayMs}
                onChange={(e) => handleChange('retryDelayMs', parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  minWidth: '80px',
                  padding: '0.5rem 1rem',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              >
                {config.retryDelayMs}ms
              </span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
              范围: 0-5000ms | 默认: 500ms | 建议: 500-1000ms
            </p>
          </div>
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '0.75rem 2rem',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#218838')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#28a745')}
          >
            💾 保存配置
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '0.75rem 2rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#5a6268')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#6c757d')}
          >
            🔄 重置默认
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('hasSeenOnboardingTour')
              window.location.reload()
            }}
            style={{
              padding: '0.75rem 2rem',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#0056b3')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#007bff')}
          >
            📖 重新查看教程
          </button>
        </div>

        {/* 保存提示 */}
        {isSaved && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '6px',
              color: '#155724',
              textAlign: 'center',
              animation: 'fadeOut 2s ease-in-out',
            }}
          >
            ✅ 配置已保存
          </div>
        )}

        {/* 当前配置预览 */}
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📊 当前配置</h3>
          <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', lineHeight: '1.8' }}>
            <div>AI义项并发: <strong>{config.aiDefinitionConcurrency}</strong></div>
            <div>短句生成并发: <strong>{config.shortSentenceConcurrency}</strong></div>
            <div>批次间延迟: <strong>{config.batchDelayMs}ms</strong></div>
            <div>重试延迟: <strong>{config.retryDelayMs}ms</strong></div>
          </div>
        </div>

        <style>{`
          @keyframes fadeOut {
            0% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    </Layout>
  )
}
