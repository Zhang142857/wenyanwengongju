// 题目统计组件
// 统计生成题目中各文章、各字、各义项的分布情况

'use client';

import React, { useMemo } from 'react';
import { ExamQuestion } from '@/services/examGenerator';
import { StorageService } from '@/services/storage';
import styles from './ExamStatistics.module.css';

export interface ExamStatisticsProps {
  questions: ExamQuestion[];
  storage: StorageService;
}

interface ArticleStats {
  articleId: string;
  articleTitle: string;
  count: number;
}

interface CharacterStats {
  character: string;
  count: number;
}

interface DefinitionStats {
  character: string;
  definition: string;
  count: number;
}

export function ExamStatistics({ questions, storage }: ExamStatisticsProps) {
  // 统计各文章出现次数
  const articleStats = useMemo(() => {
    const statsMap = new Map<string, ArticleStats>();
    
    questions.forEach(q => {
      q.options.forEach(opt => {
        // 从选项的句子中提取短句，找到对应的文章
        const sentences = opt.sentence.split('   ');
        sentences.forEach(sentenceText => {
          const shortSentence = storage.getShortSentences().find(ss => ss.text === sentenceText.trim());
          if (shortSentence) {
            const sentence = storage.getSentenceById(shortSentence.sourceSentenceId);
            if (sentence) {
              const article = storage.getArticleById(sentence.articleId);
              if (article) {
                const existing = statsMap.get(article.id);
                if (existing) {
                  existing.count++;
                } else {
                  statsMap.set(article.id, {
                    articleId: article.id,
                    articleTitle: article.title,
                    count: 1,
                  });
                }
              }
            }
          }
        });
      });
    });
    
    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [questions, storage]);

  // 统计各字出现次数
  const characterStats = useMemo(() => {
    const statsMap = new Map<string, number>();
    
    questions.forEach(q => {
      if (q.questionType === 'same-character') {
        // 同一个字题型
        statsMap.set(q.character, (statsMap.get(q.character) || 0) + 1);
      } else if (q.questionType === 'different-characters' && q.characters) {
        // 不同字题型
        q.characters.forEach(char => {
          statsMap.set(char, (statsMap.get(char) || 0) + 1);
        });
      }
    });
    
    return Array.from(statsMap.entries())
      .map(([character, count]) => ({ character, count }))
      .sort((a, b) => b.count - a.count);
  }, [questions]);

  // 统计各义项出现次数
  const definitionStats = useMemo(() => {
    const statsMap = new Map<string, DefinitionStats>();
    
    questions.forEach(q => {
      if (q.questionType === 'same-character') {
        // 同一个字题型
        const key = `${q.character}:${q.definition}`;
        const existing = statsMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          statsMap.set(key, {
            character: q.character,
            definition: q.definition,
            count: 1,
          });
        }
      } else if (q.questionType === 'different-characters' && q.definitions) {
        // 不同字题型
        q.options.forEach(opt => {
          if (opt.character && opt.definition) {
            const key = `${opt.character}:${opt.definition}`;
            const existing = statsMap.get(key);
            if (existing) {
              existing.count++;
            } else {
              statsMap.set(key, {
                character: opt.character,
                definition: opt.definition,
                count: 1,
              });
            }
          }
        });
      }
    });
    
    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [questions]);

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className={styles.statsPanel}>
      <h3 className={styles.statsTitle}>
        📊 题目统计
      </h3>

      {/* 总体统计 */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{questions.length}</div>
          <div className={styles.statLabel}>题目总数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{articleStats.length}</div>
          <div className={styles.statLabel}>涉及文章</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{characterStats.length}</div>
          <div className={styles.statLabel}>考察字数</div>
        </div>
      </div>

      {/* 详细统计 */}
      <div className={styles.statsDetails}>
        {/* 文章分布 */}
        <div className={styles.statsSection}>
          <div className={styles.statsSectionTitle}>文章分布（前10）</div>
          {articleStats.length > 0 ? (
            <div className={styles.statsItems}>
              {articleStats.slice(0, 10).map(stat => (
                <div key={stat.articleId} className={styles.statsItem}>
                  <span className={styles.statsItemName}>{stat.articleTitle}</span>
                  <span className={styles.statsItemCount}>×{stat.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.statsEmpty}>暂无数据</div>
          )}
        </div>

        {/* 字符分布 */}
        <div className={styles.statsSection}>
          <div className={styles.statsSectionTitle}>字符分布（前15）</div>
          {characterStats.length > 0 ? (
            <div className={styles.statsItems}>
              {characterStats.slice(0, 15).map(stat => (
                <div key={stat.character} className={styles.statsItem}>
                  <span className={styles.statsItemName}>{stat.character}</span>
                  <span className={styles.statsItemCount}>×{stat.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.statsEmpty}>暂无数据</div>
          )}
        </div>

        {/* 义项分布 */}
        <div className={styles.statsSection}>
          <div className={styles.statsSectionTitle}>义项分布（前10）</div>
          {definitionStats.length > 0 ? (
            <div className={styles.statsItems}>
              {definitionStats.slice(0, 10).map((stat, index) => (
                <div key={index} className={styles.statsItem}>
                  <span className={styles.statsItemName}>
                    {stat.character}（{stat.definition.length > 8 ? stat.definition.slice(0, 8) + '...' : stat.definition}）
                  </span>
                  <span className={styles.statsItemCount}>×{stat.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.statsEmpty}>暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExamStatistics;
