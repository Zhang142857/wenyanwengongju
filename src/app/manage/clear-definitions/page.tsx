'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { StorageService } from '@/services/storage'
import styles from './clear.module.css'

export default function ClearDefinitionsPage() {
  const [storage] = useState(() => new StorageService())
  const [stats, setStats] = useState({
    totalDefinitions: 0,
    totalLinks: 0,
    totalShortSentences: 0,
  })
  const [isClearing, setIsClearing] = useState(false)
  const [confirmStep, setConfirmStep] = useState(0)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    await storage.initialize()
    setStats({
      totalDefinitions: storage.getDefinitions().length,
      totalLinks: storage.getCharacterDefinitionLinks().length,
      totalShortSentences: storage.getShortSentences().length,
    })
  }

  const handleClear = async () => {
    if (confirmStep < 2) {
      setConfirmStep(confirmStep + 1)
      return
    }

    setIsClearing(true)
    try {
      storage.clearAllDefinitions()
      await storage.saveToLocal()
      setStats({
        totalDefinitions: 0,
        totalLinks: 0,
        totalShortSentences: 0,
      })
      setConfirmStep(0)
      alert('✅ 义项库已成功清空！')
    } catch (error) {
      alert('❌ 清空失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsClearing(false)
    }
  }

  const handleCancel = () => {
    setConfirmStep(0)
  }

  return (
    <Layout title="清空义项库" subtitle="Clear Definition Library" fullWidth>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>⚠️ 清空义项库</h1>
          <p className={styles.warning}>
            此操作将永久删除所有义项数据，包括义项、例句关联和短句库。此操作不可撤销！
          </p>

          {/* 统计信息 */}
          <div className={styles.statsSection}>
            <h2>将要删除的数据</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{stats.totalDefinitions}</div>
                <div className={styles.statLabel}>个义项</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{stats.totalLinks}</div>
                <div className={styles.statLabel}>个例句关联</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{stats.totalShortSentences}</div>
                <div className={styles.statLabel}>个短句</div>
              </div>
            </div>
          </div>

          {/* 确认步骤 */}
          <div className={styles.confirmSection}>
            {confirmStep === 0 && (
              <div className={styles.step}>
                <p className={styles.stepText}>确定要清空义项库吗？</p>
                <div className={styles.actions}>
                  <button
                    onClick={handleClear}
                    className={styles.dangerButton}
                    disabled={isClearing}
                  >
                    是的，清空
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className={styles.cancelButton}
                    disabled={isClearing}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {confirmStep === 1 && (
              <div className={styles.step}>
                <p className={styles.stepText}>⚠️ 再次确认：此操作不可撤销！</p>
                <p className={styles.stepSubtext}>
                  所有义项、例句关联和短句都将被永久删除。
                </p>
                <div className={styles.actions}>
                  <button
                    onClick={handleClear}
                    className={styles.dangerButton}
                    disabled={isClearing}
                  >
                    确认清空
                  </button>
                  <button
                    onClick={handleCancel}
                    className={styles.cancelButton}
                    disabled={isClearing}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {confirmStep === 2 && (
              <div className={styles.step}>
                <p className={styles.stepText}>🔴 最后确认：真的要清空吗？</p>
                <p className={styles.stepSubtext}>
                  这是最后一次确认。清空后无法恢复！
                </p>
                <div className={styles.actions}>
                  <button
                    onClick={handleClear}
                    className={styles.dangerButton}
                    disabled={isClearing}
                  >
                    {isClearing ? '清空中...' : '彻底清空'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className={styles.cancelButton}
                    disabled={isClearing}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 建议 */}
          <div className={styles.tipsSection}>
            <h3>💡 建议</h3>
            <ul>
              <li>清空前请确保已备份重要数据</li>
              <li>清空后可以使用"AI自动生成义项"功能重新生成</li>
              <li>如果只想删除某些义项，请使用"义项库管理"页面逐个删除</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  )
}
