'use client'

import { useState, useEffect } from 'react'
import { configService } from '@/services/configService'
import { ApiConfigGroup } from '@/types/config'
import CustomSelect from './CustomSelect'
import styles from './ApiConfigSelector.module.css'

interface ApiConfigSelectorProps {
    className?: string
    value?: string  // 受控模式：外部传入的值
    onChange?: (value: string) => void  // 受控模式：值变化回调
}

export default function ApiConfigSelector({ className = '', value, onChange }: ApiConfigSelectorProps) {
    const [groups, setGroups] = useState<ApiConfigGroup[]>([])
    const [activeGroupId, setActiveGroupId] = useState<string>('')
    const [isLoaded, setIsLoaded] = useState(false)
    
    // 判断是否为受控模式
    const isControlled = value !== undefined && onChange !== undefined

    useEffect(() => {
        // 加载初始配置
        const loadConfig = async () => {
            // 确保configService已初始化
            await configService.initialize()
            const config = configService.getConfig()
            if (config?.ai) {
                setGroups(config.ai.configGroups || [])
                setActiveGroupId(config.ai.activeGroupId || '')
            }
            setIsLoaded(true)
        }

        loadConfig()

        // 监听配置变化
        const unsubscribe = configService.onChange((newConfig) => {
            if (newConfig.ai) {
                setGroups(newConfig.ai.configGroups || [])
                setActiveGroupId(newConfig.ai.activeGroupId || '')
            }
        })

        return () => {
            unsubscribe()
        }
    }, [])

    const handleChange = async (newGroupId: string) => {
        if (!newGroupId) return

        if (isControlled) {
            // 受控模式：直接调用onChange
            onChange(newGroupId)
        } else {
            // 非受控模式：更新全局配置
            try {
                await configService.setActiveConfigGroup(newGroupId)
                // 状态更新由监听器处理
                console.log('已切换 API 配置组:', newGroupId)
            } catch (error) {
                console.error('切换配置组失败:', error)
            }
        }
    }

    if (!isLoaded) return null

    // 将配置组转换为选项格式
    const options = groups.map(group => ({
        value: group.id,
        label: group.name,
        description: group.description
    }))

    // 如果没有配置组，或者当前ID无效，显示默认提示
    if (options.length === 0) {
        return null
    }

    // 使用受控值或内部状态
    const currentValue = isControlled ? value : activeGroupId

    return (
        <div className={`${styles.container} ${className}`}>
            <span className={styles.label}>AI 配置:</span>
            <div className={styles.selectWrapper}>
                <CustomSelect
                    value={currentValue}
                    options={options}
                    onChange={handleChange}
                    placeholder="选择配置"
                />
            </div>
        </div>
    )
}
