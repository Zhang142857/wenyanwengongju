'use client'

import React, { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useWeightStore } from '@/stores/weightStore'
import { ArticleWeight, UnifiedWeightConfig } from '@/types/weight'
import styles from './WeightManager.module.css'
import ArticleWeightChart from './ArticleWeightChart'
import CharacterWeightEditor from './CharacterWeightEditor'

interface WeightManagerProps {
    configScope: {
        libraryId?: string
        collectionId?: string
        articleId?: string
    }
    libraries: any[]
    collections: any[]
}

export default function WeightManager({
    configScope,
    libraries,
    collections
}: WeightManagerProps) {
    const {
        currentConfig: weightConfig,
        loadConfig,
        setArticleWeight,
        setArticleIncluded,
        setArticleRange,
        setCharacterWeight,
        addCharacter,
        removeCharacter,
    } = useWeightStore()

    // 当考察范围变化时，更新文章权重图表数据
    useEffect(() => {
        if (!configScope.libraryId) return

        const articleWeights: ArticleWeight[] = []
        let order = 0

        const lib = libraries.find(l => l.id === configScope.libraryId)
        if (lib) {
            for (const collection of lib.collections) {
                // 如果选择了特定集，只显示该集的文章
                if (configScope.collectionId && collection.id !== configScope.collectionId) {
                    continue
                }

                for (const article of collection.articles) {
                    // 如果选择了特定文章，只显示该文章
                    if (configScope.articleId && article.id !== configScope.articleId) {
                        continue
                    }

                    // 检查是否在当前权重配置中
                    const existingWeight = weightConfig?.articleWeights.find(
                        aw => aw.articleId === article.id
                    )

                    articleWeights.push({
                        articleId: article.id,
                        articleTitle: article.title,
                        collectionId: collection.id,
                        collectionName: collection.name,
                        weight: existingWeight?.weight ?? 50,
                        included: existingWeight?.included ?? true,
                        order: order++,
                    })
                }
            }
        }

        // 更新权重配置
        if (articleWeights.length > 0) {
            const newConfig: UnifiedWeightConfig = {
                id: weightConfig?.id || uuidv4(),
                name: weightConfig?.name || '当前配置',
                articleWeights,
                characterWeights: weightConfig?.characterWeights || [],
                otherCharactersWeight: weightConfig?.otherCharactersWeight ?? 100,
                createdAt: weightConfig?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
            loadConfig(newConfig)
        }
    }, [configScope.libraryId, configScope.collectionId, configScope.articleId, libraries])

    if (!weightConfig) return null

    return (
        <div className={styles.weightManager}>
            {/* 文章权重图表 */}
            {weightConfig.articleWeights.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>文章权重调整</h3>
                    <p className={styles.sectionHint}>拖拽节点调整权重，点击切换选中状态，在横轴拖拽选择范围</p>
                    <ArticleWeightChart
                        articles={weightConfig.articleWeights}
                        onWeightChange={setArticleWeight}
                        onRangeSelect={setArticleRange}
                        onArticleToggle={setArticleIncluded}
                    />
                </div>
            )}

            {/* 重点字权重编辑器 */}
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>重点字权重</h3>
                <p className={styles.sectionHint}>设置重点字的考察权重，剩余权重自动分配给其他字</p>
                <CharacterWeightEditor
                    characterWeights={weightConfig.characterWeights}
                    otherCharactersWeight={weightConfig.otherCharactersWeight}
                    onCharacterWeightChange={setCharacterWeight}
                    onAddCharacter={addCharacter}
                    onRemoveCharacter={removeCharacter}
                />
            </div>
        </div>
    )
}
