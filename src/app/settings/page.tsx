'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { configService } from '@/services/configService'
import { StorageService } from '@/services/storage'
import type { AppConfig, ApiConfigGroup, AutoFilterConfig } from '@/types/config'
import type { Library } from '@/types'
import Tour, { type TourStep } from '@/components/Tour'
import ImageTour from '@/components/ImageTour'
import styles from './settings.module.css'

// 图片教程弹窗组件
function ImageTourModal({ onClose }: { onClose: () => void }) {
    return <ImageTour onComplete={onClose} forceShow={true} />
}

export default function SettingsPage() {
    const router = useRouter()
    const [config, setConfig] = useState<AppConfig | null>(null)
    const [activeTab, setActiveTab] = useState<'ai' | 'data' | 'system' | 'about'>('ai')
    const [saved, setSaved] = useState(false)
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
    const [libraries, setLibraries] = useState<Library[]>([])

    // 添加API Key对话框状态
    const [showAddKeyDialog, setShowAddKeyDialog] = useState(false)
    const [newApiKey, setNewApiKey] = useState('')
    const [addKeyGroupId, setAddKeyGroupId] = useState<string | null>(null)

    useEffect(() => {
        const loadConfig = async () => {
            await configService.initialize()
            setConfig(configService.getConfig())
            
            // 加载库列表用于自动筛选设置
            const storage = new StorageService()
            await storage.initialize()
            setLibraries(storage.getLibraries())
        }
        loadConfig()
    }, [])

    const showSavedMessage = () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const handleSaveToFile = () => {
        if (!config) return
        const jsonString = configService.exportConfig()
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `config-${config.edition}-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleSaveFullDataToFile = () => {
        if (!config) return
        const jsonString = configService.exportFullData()
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `fulldata-${config.edition}-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string
                const result = await configService.importFullData(content)
                setConfig(configService.getConfig())
                
                // 重新加载库列表
                const storage = new StorageService()
                await storage.initialize()
                setLibraries(storage.getLibraries())
                
                showSavedMessage()
                
                // 显示导入结果
                if (result.configImported && result.librariesImported) {
                    alert('✅ 配置和库数据导入成功！')
                } else if (result.configImported) {
                    alert('✅ 配置导入成功！（未包含库数据）')
                } else {
                    alert('⚠️ 导入完成，但部分数据可能未成功导入')
                }
            } catch (error) {
                alert('❌ 导入失败：' + (error as Error).message)
            }
        }
        reader.readAsText(file)
    }

    const handleResetToDefault = async () => {
        if (confirm('确定要重置为默认配置吗？这将清除所有自定义设置。')) {
            await configService.resetToDefault()
            setConfig(configService.getConfig())
            showSavedMessage()
        }
    }

    // ========== API配置组管理 ==========

    const handleAddConfigGroup = async () => {
        const newGroup: Omit<ApiConfigGroup, 'id'> = {
            name: '新配置',
            description: '',
            provider: 'siliconflow',
            baseUrl: 'https://api.siliconflow.cn/v1',
            apiKeys: [],
            model: 'inclusionAI/Ling-flash-2.0',
            isThinkingModel: false,
            concurrency: {
                aiDefinitionConcurrency: 30,
                shortSentenceConcurrency: 34,
                batchDelayMs: 100,
                retryDelayMs: 500,
            }
        }
        const groupId = await configService.addConfigGroup(newGroup)
        setConfig(configService.getConfig())
        setEditingGroupId(groupId)
    }

    const handleDeleteConfigGroup = async (groupId: string) => {
        if (config?.ai.configGroups.length === 1) {
            alert('至少需要保留一个配置组')
            return
        }
        if (confirm('确定要删除这个配置组吗？')) {
            await configService.deleteConfigGroup(groupId)
            setConfig(configService.getConfig())
        }
    }

    const handleSetActiveGroup = async (groupId: string) => {
        await configService.setActiveConfigGroup(groupId)
        setConfig(configService.getConfig())
        showSavedMessage()
    }

    const handleUpdateConfigGroup = async (groupId: string, updates: Partial<ApiConfigGroup>) => {
        await configService.updateConfigGroup(groupId, updates)
        setConfig(configService.getConfig())
    }

    // 打开添加API Key对话框
    const openAddKeyDialog = (groupId: string) => {
        setAddKeyGroupId(groupId)
        setNewApiKey('')
        setShowAddKeyDialog(true)
    }

    // 确认添加API Key
    const handleConfirmAddKey = async () => {
        if (addKeyGroupId && newApiKey.trim()) {
            await configService.addApiKeyToGroup(addKeyGroupId, newApiKey.trim())
            setConfig(configService.getConfig())
            showSavedMessage()
        }
        setShowAddKeyDialog(false)
        setNewApiKey('')
        setAddKeyGroupId(null)
    }

    const handleRemoveApiKey = async (groupId: string, keyIndex: number) => {
        if (confirm('确定要删除这个API Key吗？')) {
            await configService.removeApiKeyFromGroup(groupId, keyIndex)
            setConfig(configService.getConfig())
            showSavedMessage()
        }
    }

    const handleUpdateConcurrency = async (key: string, value: number | string | boolean) => {
        await configService.updateConcurrencyConfig({ [key]: value } as any)
        setConfig(configService.getConfig())
        showSavedMessage()
    }

    const handleUpdateAutoFilter = async (updates: Partial<AutoFilterConfig>) => {
        await configService.updateAutoFilterConfig(updates)
        setConfig(configService.getConfig())
        showSavedMessage()
    }

    const tourSteps: TourStep[] = [
        {
            target: '#tour-ai-config-tab',
            title: 'AI配置',
            content: '在这里配置AI API，支持多个配置组和API Key池。',
            position: 'right'
        },
        {
            target: '#tour-import-btn',
            title: '配置管理',
            content: '支持导入和导出JSON格式的配置文件，方便备份和迁移。',
            position: 'bottom'
        }
    ]

    if (!config) {
        return (
            <Layout>
                <div className={styles.loading}>加载配置中...</div>
            </Layout>
        )
    }

    return (
        <Layout>
            <Tour pageId="settings" steps={tourSteps} />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>⚙️ 系统设置</h1>
                    <div className={styles.headerActions}>
                        <button onClick={handleResetToDefault} className={styles.resetBtn}>
                            🔄 重置
                        </button>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImportFromFile}
                            style={{ display: 'none' }}
                            id="import-config"
                        />
                        <label htmlFor="import-config" className={styles.importBtn} id="tour-import-btn">
                            📥 导入
                        </label>
                        <button onClick={handleSaveToFile} className={styles.exportBtn}>
                            💾 导出配置
                        </button>
                        <button onClick={handleSaveFullDataToFile} className={styles.exportBtn}>
                            💾 导出全部
                        </button>
                    </div>
                </div>

                <div className={styles.tabContainer}>
                    <div className={styles.tabs}>
                        <button
                            id="tour-ai-config-tab"
                            className={`${styles.tab} ${activeTab === 'ai' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('ai')}
                        >
                            🤖 AI配置
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'data' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('data')}
                        >
                            📚 数据配置
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'system' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('system')}
                        >
                            🎨 系统设置
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('about')}
                        >
                            ℹ️ 关于
                        </button>
                    </div>
                    <div className={styles.tabContent}>
                        {activeTab === 'ai' && (
                            <div className={styles.section}>
                                <h2>API配置组</h2>
                                <p className={styles.sectionDesc}>
                                    创建多个配置组以适应不同场景（如"高质量"、"快速"），每个配置组支持多个API Key轮询使用。
                                </p>

                                <div className={styles.configGroupList}>
                                    {config.ai.configGroups.map((group) => (
                                        <ConfigGroupCard
                                            key={group.id}
                                            group={group}
                                            isActive={config.ai.activeGroupId === group.id}
                                            isEditing={editingGroupId === group.id}
                                            onEdit={() => setEditingGroupId(editingGroupId === group.id ? null : group.id)}
                                            onActivate={() => handleSetActiveGroup(group.id)}
                                            onDelete={() => handleDeleteConfigGroup(group.id)}
                                            onUpdate={(updates) => handleUpdateConfigGroup(group.id, updates)}
                                            onAddKey={() => openAddKeyDialog(group.id)}
                                            onRemoveKey={(index) => handleRemoveApiKey(group.id, index)}
                                        />
                                    ))}
                                </div>

                                <button onClick={handleAddConfigGroup} className={styles.addBtn}>
                                    ➕ 添加配置组
                                </button>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className={styles.section}>
                                <h2>数据库配置</h2>
                                <p>词库管理和数据导入导出功能（开发中）</p>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className={styles.section}>
                                <h2>系统设置</h2>
                                <SystemSettings 
                                    config={config.system} 
                                    libraries={libraries}
                                    onUpdateAutoFilter={handleUpdateAutoFilter}
                                />
                            </div>
                        )}

                        {activeTab === 'about' && (
                            <div className={styles.section}>
                                <h2>关于</h2>
                                <AboutSection config={config} />
                            </div>
                        )}
                    </div>
                </div>

                {saved && (
                    <div className={styles.savedMessage}>
                        ✅ 配置已保存
                    </div>
                )}

                {/* 添加API Key对话框 */}
                {showAddKeyDialog && (
                    <div className={styles.dialogOverlay} onClick={() => setShowAddKeyDialog(false)}>
                        <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                            <h3>添加API Key</h3>
                            <input
                                type="text"
                                value={newApiKey}
                                onChange={e => setNewApiKey(e.target.value)}
                                placeholder="请输入API Key，如 sk-xxx..."
                                className={styles.dialogInput}
                                autoFocus
                            />
                            <div className={styles.dialogActions}>
                                <button onClick={() => setShowAddKeyDialog(false)} className={styles.cancelBtn}>
                                    取消
                                </button>
                                <button onClick={handleConfirmAddKey} className={styles.saveBtn}>
                                    添加
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

function ConfigGroupCard({
    group,
    isActive,
    isEditing,
    onEdit,
    onActivate,
    onDelete,
    onUpdate,
    onAddKey,
    onRemoveKey,
}: {
    group: ApiConfigGroup
    isActive: boolean
    isEditing: boolean
    onEdit: () => void
    onActivate: () => void
    onDelete: () => void
    onUpdate: (updates: Partial<ApiConfigGroup>) => void
    onAddKey: () => void
    onRemoveKey: (index: number) => void
}) {
    const [localGroup, setLocalGroup] = useState(group)

    useEffect(() => {
        setLocalGroup(group)
    }, [group])

    const handleSave = () => {
        onUpdate(localGroup)
        onEdit()
    }

    return (
        <div className={`${styles.configGroupCard} ${isActive ? styles.configGroupActive : ''}`}>
            <div className={styles.configGroupHeader}>
                <div className={styles.configGroupInfo}>
                    {isActive && <span className={styles.activeBadge}>当前使用</span>}
                    <h3>{group.name}</h3>
                    {group.description && <p className={styles.groupDesc}>{group.description}</p>}
                </div>
                <div className={styles.configGroupActions}>
                    {!isActive && (
                        <button onClick={onActivate} className={styles.activateBtn}>
                            使用此配置
                        </button>
                    )}
                    <button onClick={onEdit} className={styles.editBtn}>
                        {isEditing ? '收起' : '编辑'}
                    </button>
                    <button onClick={onDelete} className={styles.deleteBtn}>
                        删除
                    </button>
                </div>
            </div>

            <div className={styles.configGroupMeta}>
                <span>🔗 {group.provider}</span>
                <span>🤖 {group.model}</span>
                <span>🔑 {group.apiKeys.length} 个API Key</span>
                {group.isThinkingModel && <span>🧠 思考模型</span>}
            </div>

            {isEditing && (
                <div className={styles.configGroupEdit}>
                    <div className={styles.formGroup}>
                        <label>配置名称:</label>
                        <input
                            type="text"
                            value={localGroup.name}
                            onChange={(e) => setLocalGroup({ ...localGroup, name: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>描述:</label>
                        <input
                            type="text"
                            value={localGroup.description || ''}
                            onChange={(e) => setLocalGroup({ ...localGroup, description: e.target.value })}
                            placeholder="例如：高质量模式，适合精细处理"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Provider:</label>
                        <select
                            value={localGroup.provider}
                            onChange={(e) => setLocalGroup({ ...localGroup, provider: e.target.value as any })}
                        >
                            <option value="siliconflow">Silicon Flow</option>
                            <option value="minimax">MiniMax</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="custom">自定义</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Base URL:</label>
                        <input
                            type="text"
                            value={localGroup.baseUrl}
                            onChange={(e) => setLocalGroup({ ...localGroup, baseUrl: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Model:</label>
                        <input
                            type="text"
                            value={localGroup.model}
                            onChange={(e) => setLocalGroup({ ...localGroup, model: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={localGroup.isThinkingModel}
                                onChange={(e) => setLocalGroup({ ...localGroup, isThinkingModel: e.target.checked })}
                            />
                            思考模型（会解析&lt;think&gt;标签提取最终答案）
                        </label>
                    </div>

                    <div className={styles.concurrencySection}>
                        <h4>并发设置</h4>
                        <div className={styles.setting}>
                            <label>AI义项生成并发数: {localGroup.concurrency?.aiDefinitionConcurrency || 30}</label>
                            <input
                                type="range"
                                min="1"
                                max="512"
                                value={localGroup.concurrency?.aiDefinitionConcurrency || 30}
                                onChange={(e) => setLocalGroup({
                                    ...localGroup,
                                    concurrency: {
                                        ...(localGroup.concurrency || {
                                            aiDefinitionConcurrency: 30,
                                            shortSentenceConcurrency: 34,
                                            batchDelayMs: 100,
                                            retryDelayMs: 500
                                        }),
                                        aiDefinitionConcurrency: parseInt(e.target.value)
                                    }
                                })}
                            />
                        </div>
                        <div className={styles.setting}>
                            <label>短句生成并发数: {localGroup.concurrency?.shortSentenceConcurrency || 34}</label>
                            <input
                                type="range"
                                min="1"
                                max="512"
                                value={localGroup.concurrency?.shortSentenceConcurrency || 34}
                                onChange={(e) => setLocalGroup({
                                    ...localGroup,
                                    concurrency: {
                                        ...(localGroup.concurrency || {
                                            aiDefinitionConcurrency: 30,
                                            shortSentenceConcurrency: 34,
                                            batchDelayMs: 100,
                                            retryDelayMs: 500
                                        }),
                                        shortSentenceConcurrency: parseInt(e.target.value)
                                    }
                                })}
                            />
                        </div>
                        <div className={styles.setting}>
                            <label>批次间延迟: {localGroup.concurrency?.batchDelayMs || 100}ms</label>
                            <input
                                type="range"
                                min="0"
                                max="5000"
                                step="100"
                                value={localGroup.concurrency?.batchDelayMs || 100}
                                onChange={(e) => setLocalGroup({
                                    ...localGroup,
                                    concurrency: {
                                        ...(localGroup.concurrency || {
                                            aiDefinitionConcurrency: 30,
                                            shortSentenceConcurrency: 34,
                                            batchDelayMs: 100,
                                            retryDelayMs: 500
                                        }),
                                        batchDelayMs: parseInt(e.target.value)
                                    }
                                })}
                            />
                        </div>
                    </div>

                    <div className={styles.apiKeySection}>
                        <div className={styles.apiKeySectionHeader}>
                            <label>API Keys ({group.apiKeys.length}个):</label>
                            <button onClick={onAddKey} className={styles.addKeyBtn}>
                                ➕ 添加Key
                            </button>
                        </div>
                        <div className={styles.apiKeyList}>
                            {group.apiKeys.map((key, index) => (
                                <div key={index} className={styles.apiKeyItem}>
                                    <span className={styles.apiKeyText}>
                                        {key.slice(0, 8)}...{key.slice(-4)}
                                    </span>
                                    <button
                                        onClick={() => onRemoveKey(index)}
                                        className={styles.removeKeyBtn}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            {group.apiKeys.length === 0 && (
                                <p className={styles.noKeys}>暂无API Key，请添加</p>
                            )}
                        </div>
                    </div>

                    <div className={styles.editActions}>
                        <button onClick={handleSave} className={styles.saveBtn}>
                            💾 保存修改
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// 并发设置组件 - 移除了modelId设置
function ConcurrencySettings({
    config,
    onUpdate
}: {
    config: AppConfig['ai']['concurrency']
    onUpdate: (key: string, value: any) => void
}) {
    return (
        <div className={styles.concurrencySettings}>
            <div className={styles.setting}>
                <label>AI义项生成并发数: {config.aiDefinitionConcurrency}</label>
                <input
                    type="range"
                    min="1"
                    max="512"
                    value={config.aiDefinitionConcurrency}
                    onChange={(e) => onUpdate('aiDefinitionConcurrency', parseInt(e.target.value))}
                />
            </div>
            <div className={styles.setting}>
                <label>短句生成并发数: {config.shortSentenceConcurrency}</label>
                <input
                    type="range"
                    min="1"
                    max="512"
                    value={config.shortSentenceConcurrency}
                    onChange={(e) => onUpdate('shortSentenceConcurrency', parseInt(e.target.value))}
                />
            </div>
            <div className={styles.setting}>
                <label>批次间延迟: {config.batchDelayMs}ms</label>
                <input
                    type="range"
                    min="0"
                    max="5000"
                    step="100"
                    value={config.batchDelayMs}
                    onChange={(e) => onUpdate('batchDelayMs', parseInt(e.target.value))}
                />
            </div>
        </div>
    )
}

// 系统设置组件
function SystemSettings({ 
    config, 
    libraries,
    onUpdateAutoFilter 
}: { 
    config: AppConfig['system']
    libraries: Library[]
    onUpdateAutoFilter: (updates: Partial<AutoFilterConfig>) => void
}) {
    const autoFilter = config.autoFilter || { enabled: true, defaultLibraryId: '' }
    const [showImageTour, setShowImageTour] = useState(false)
    const [directoryInfo, setDirectoryInfo] = useState<{
        root: string
        config: string
        temp: string
        cache: string
    } | null>(null)
    
    // 加载目录信息
    useEffect(() => {
        const loadDirectoryInfo = async () => {
            const info = await configService.getDirectoryInfo()
            setDirectoryInfo(info)
        }
        loadDirectoryInfo()
    }, [])
    
    const handleReplayImageTour = () => {
        setShowImageTour(true)
    }

    const handleReplayOnboardingTour = () => {
        localStorage.removeItem('hasSeenOnboardingTour')
        window.location.reload()
    }

    const handleResetAllTours = async () => {
        localStorage.removeItem('hasSeenImageTour')
        localStorage.removeItem('hasSeenOnboardingTour')
        await configService.resetTourRecord()
        window.location.reload()
    }

    const handleOpenConfigDirectory = async () => {
        const success = await configService.openConfigDirectory()
        if (!success) {
            alert('无法打开配置目录，可能不在 Electron 环境中运行')
        }
    }

    const handleClearCache = async () => {
        if (confirm('确定要清理缓存吗？这将删除所有背景媒体缓存文件。')) {
            const success = await configService.clearCache()
            if (success) {
                alert('✅ 缓存已清理')
            } else {
                alert('❌ 清理缓存失败')
            }
        }
    }
    
    return (
        <div className={styles.systemSettings}>
            <div className={styles.settingGroup}>
                <h3>基本设置</h3>
                <p>应用标题: {config.appTitle}</p>
                <p>启用教程: {config.enableTour ? '是' : '否'}</p>
                <p>主题: {config.theme}</p>
            </div>

            {/* 配置目录管理 */}
            <div className={styles.settingGroup}>
                <h3>📁 配置目录</h3>
                <p className={styles.settingDesc}>
                    配置文件存储在程序目录的 config 文件夹中，您可以直接编辑这些文件，程序会自动检测并应用更改。
                </p>
                {directoryInfo ? (
                    <div className={styles.directoryInfo}>
                        <p><strong>配置目录:</strong> {directoryInfo.config}</p>
                        <p><strong>缓存目录:</strong> {directoryInfo.cache}</p>
                    </div>
                ) : (
                    <p className={styles.hint}>目录信息仅在桌面应用中可用</p>
                )}
                <div className={styles.directoryActions}>
                    <button onClick={handleOpenConfigDirectory} className={styles.directoryBtn}>
                        📂 打开配置目录
                    </button>
                    <button onClick={handleClearCache} className={styles.clearCacheBtn}>
                        🗑️ 清理缓存
                    </button>
                </div>
            </div>

            <div className={styles.settingGroup}>
                <h3>📖 教程管理</h3>
                <p className={styles.settingDesc}>
                    重新播放新手教程，了解应用的主要功能。
                </p>
                <div className={styles.tourButtons}>
                    <button onClick={handleReplayImageTour} className={styles.tourBtn}>
                        🖼️ 播放图片教程
                    </button>
                    <button onClick={handleReplayOnboardingTour} className={styles.tourBtn}>
                        📝 播放文字教程
                    </button>
                    <button onClick={handleResetAllTours} className={styles.tourResetBtn}>
                        🔄 重置所有教程
                    </button>
                </div>
            </div>
            
            <div className={styles.settingGroup}>
                <h3>🔍 自动筛选</h3>
                <p className={styles.settingDesc}>
                    启用后，在查字等页面会自动将筛选库设置为指定的库，方便快速查询。
                </p>
                
                <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={autoFilter.enabled}
                            onChange={(e) => onUpdateAutoFilter({ enabled: e.target.checked })}
                        />
                        启用自动筛选
                    </label>
                </div>
                
                {autoFilter.enabled && (
                    <div className={styles.formGroup}>
                        <label>默认筛选库:</label>
                        <select
                            value={autoFilter.defaultLibraryId}
                            onChange={(e) => onUpdateAutoFilter({ defaultLibraryId: e.target.value })}
                            className={styles.selectInput}
                        >
                            <option value="">不自动筛选</option>
                            {libraries.map(lib => (
                                <option key={lib.id} value={lib.id}>
                                    {lib.name}
                                </option>
                            ))}
                        </select>
                        {libraries.length === 0 && (
                            <p className={styles.hint}>暂无可用的库，请先导入数据</p>
                        )}
                    </div>
                )}
            </div>

            {/* 图片教程弹窗 */}
            {showImageTour && (
                <ImageTourModal onClose={() => setShowImageTour(false)} />
            )}
        </div>
    )
}

// 关于section
function AboutSection({ config }: { config: AppConfig }) {
    return (
        <div className={styles.about}>
            <p><strong>版本:</strong> {config.version}</p>
            <p><strong>版本类型:</strong> {config.edition}</p>
            <p><strong>项目:</strong> 文言文小工具</p>
            <p><strong>配置组数:</strong> {config.ai.configGroups.length}</p>
            <p><strong>API Key总数:</strong> {config.ai.configGroups.reduce((sum, g) => sum + g.apiKeys.length, 0)}</p>
        </div>
    )
}
