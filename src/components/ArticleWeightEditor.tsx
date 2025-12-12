'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Library } from '../types';
import { ArticleWeight } from '../types/weight';
import { StorageService } from '../services/storage';
import styles from './ArticleWeightEditor.module.css';

export interface ArticleWeightEditorProps {
  libraries: Library[];
  onWeightsChange?: (weights: ArticleWeight[]) => void;
  onRangesChange?: (ranges: any[]) => void; // Keep for compatibility but might not use
  initialLibraryId?: string;
  readonly?: boolean;
}

// Extended article type for internal state
interface ExtendedArticle {
  id: string;
  title: string;
  collectionId: string;
  collectionName: string;
  index: number;
  sentenceCount: number;
  definitionCount: number;
  weight: number;
  included: boolean;
}

type ViewType = 'axis' | 'list' | 'stats';

export function ArticleWeightEditor({
  libraries,
  onWeightsChange,
  initialLibraryId,
  readonly = false,
}: ArticleWeightEditorProps) {
  // State
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>(initialLibraryId || '');
  const [activeView, setActiveView] = useState<ViewType>('axis');
  const [articles, setArticles] = useState<ExtendedArticle[]>([]);
  const [storage] = useState(() => new StorageService());
  
  // History for Undo/Redo
  const [history, setHistory] = useState<ExtendedArticle[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Filter State
  const [searchText, setSearchText] = useState('');
  const [filterCollection, setFilterCollection] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'selected' | 'unselected'>('all');
  
  // Sort State
  const [sortField, setSortField] = useState<keyof ExtendedArticle>('index');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Initialization
  useEffect(() => {
    storage.initialize();
  }, [storage]);

  // Load articles when library changes
  useEffect(() => {
    if (!selectedLibraryId) {
      setArticles([]);
      return;
    }

    const library = libraries.find(lib => lib.id === selectedLibraryId);
    if (!library) return;

    // Get stats from storage
    const definitions = storage.getDefinitions();
    // Pre-calculate counts for efficiency could be better, but doing it simple here
    // Actually getting sentence count is easy from library data
    // Definition count requires mapping

    const newArticles: ExtendedArticle[] = [];
    let globalIndex = 0;

    library.collections.forEach(collection => {
      collection.articles.forEach(article => {
        // Calculate counts
        const sentenceCount = article.sentences.length;
        // This is an approximation for definition count as we'd need to link definitions to sentences
        // For now, let's use a placeholder or try to calculate if cheap
        // Doing full calculation might be slow for 1000 articles. 
        // Let's defer exact definition count or do it async? 
        // For now, let's just count sentences.
        
        newArticles.push({
          id: article.id,
          title: article.title,
          collectionId: collection.id,
          collectionName: collection.name,
          index: globalIndex++,
          sentenceCount,
          definitionCount: 0, // Pending implementation
          weight: 50, // Default weight
          included: false,
        });
      });
    });

    setArticles(newArticles);
    setHistory([newArticles]);
    setHistoryIndex(0);
  }, [selectedLibraryId, libraries, storage]);

  // Sync to parent
  useEffect(() => {
    if (onWeightsChange && articles.length > 0) {
      const weights: ArticleWeight[] = articles.map(a => ({
        articleId: a.id,
        articleTitle: a.title,
        collectionId: a.collectionId,
        collectionName: a.collectionName,
        weight: a.weight,
        included: a.included,
        order: a.index,
      }));
      onWeightsChange(weights);
    }
  }, [articles, onWeightsChange]);

  // History Management
  const pushHistory = useCallback((newArticles: ExtendedArticle[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newArticles);
    // Limit history size
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setArticles(newArticles);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setArticles(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setArticles(history[historyIndex + 1]);
    }
  };

  // Actions
  const updateArticle = (id: string, updates: Partial<ExtendedArticle>) => {
    const newArticles = articles.map(a => a.id === id ? { ...a, ...updates } : a);
    pushHistory(newArticles);
  };

  const toggleSelection = (id: string) => {
    const article = articles.find(a => a.id === id);
    if (article) {
      updateArticle(id, { included: !article.included });
    }
  };

  const setWeight = (id: string, weight: number) => {
    updateArticle(id, { weight });
  };

  const getFilteredIds = () => new Set(filteredArticles.map(a => a.id));

  const selectAll = () => {
    const targetIds = getFilteredIds();
    const newArticles = articles.map(a => 
      targetIds.has(a.id) ? { ...a, included: true } : a
    );
    pushHistory(newArticles);
  };

  const deselectAll = () => {
    const targetIds = getFilteredIds();
    const newArticles = articles.map(a => 
      targetIds.has(a.id) ? { ...a, included: false } : a
    );
    pushHistory(newArticles);
  };

  const invertSelection = () => {
    const targetIds = getFilteredIds();
    const newArticles = articles.map(a => 
      targetIds.has(a.id) ? { ...a, included: !a.included } : a
    );
    pushHistory(newArticles);
  };

  const setBatchWeight = (weight: number) => {
    const targetIds = getFilteredIds();
    const newArticles = articles.map(a => 
      targetIds.has(a.id) ? { ...a, weight } : a
    );
    pushHistory(newArticles);
  };

  const setAllWeights = (weight: number) => {
    // Legacy support or specific use case?
    // Let's use setBatchWeight instead for UI calls
    setBatchWeight(weight);
  };

  // Filter Logic
  const filteredArticles = useMemo(() => {
    const result = articles.filter(a => {
      if (searchText && !a.title.includes(searchText)) return false;
      if (filterCollection !== 'all' && a.collectionId !== filterCollection) return false;
      if (filterStatus === 'selected' && !a.included) return false;
      if (filterStatus === 'unselected' && a.included) return false;
      return true;
    });

    return result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Boolean sort (false comes before true in asc)
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
         return sortDirection === 'asc' 
           ? (aValue === bValue ? 0 : aValue ? 1 : -1)
           : (aValue === bValue ? 0 : aValue ? -1 : 1);
      }

      return 0;
    });
  }, [articles, searchText, filterCollection, filterStatus, sortField, sortDirection]);

  // Collections for filter
  const collections = useMemo(() => {
    const lib = libraries.find(l => l.id === selectedLibraryId);
    return lib ? lib.collections : [];
  }, [libraries, selectedLibraryId]);

  // Stats
  const stats = useMemo(() => {
    const selected = articles.filter(a => a.included);
    const totalSentences = selected.reduce((sum, a) => sum + a.sentenceCount, 0);
    const avgSentences = selected.length ? Math.round(totalSentences / selected.length) : 0;
    
    // Sufficiency Check (Mock logic)
    // Assume we need at least 5 articles or 100 sentences for "Sufficient"
    const isSufficient = selected.length >= 5 && totalSentences >= 100;
    const expectedQuestions = Math.floor(totalSentences / 15); // Approx 1 question per 15 sentences

    return {
      selectedCount: selected.length,
      totalCount: articles.length,
      sentenceCount: totalSentences,
      avgSentences,
      avgWeight: selected.length ? Math.round(selected.reduce((sum, a) => sum + a.weight, 0) / selected.length) : 0,
      isSufficient,
      expectedQuestions,
    };
  }, [articles]);

  // View Components
  const AxisView = () => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
    const [selectionRect, setSelectionRect] = useState<{ x: number, width: number } | null>(null);
    const [selectedRange, setSelectedRange] = useState<{ start: number, end: number } | null>(null);

    // Zoom state
    const [zoom, setZoom] = useState(1);
    const itemWidth = 20 * zoom;
    const itemGap = 4 * zoom;
    
    const getArticleIndexAtX = (x: number) => {
      return Math.floor((x - 20) / (itemWidth + itemGap));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (readonly) return;
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left + (wrapperRef.current?.scrollLeft || 0);
      const clickedIndex = getArticleIndexAtX(x);
      
      setDragStart(x);
      setDragStartIndex(clickedIndex);
      setIsDragging(true);
      setSelectionRect({ x, width: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || dragStart === null || !wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left + wrapperRef.current.scrollLeft;
      
      const x = Math.min(dragStart, currentX);
      const width = Math.abs(currentX - dragStart);
      setSelectionRect({ x, width });
    };

    const handleMouseUp = (e: React.MouseEvent) => {
      if (!isDragging || dragStart === null || !wrapperRef.current) {
        setIsDragging(false);
        setDragStart(null);
        setDragStartIndex(null);
        setSelectionRect(null);
        return;
      }

      const rect = wrapperRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left + wrapperRef.current.scrollLeft;
      const currentIndex = getArticleIndexAtX(currentX);
      
      // 检查是否拖动了至少1篇文章的距离
      const draggedArticles = Math.abs(currentIndex - (dragStartIndex || 0));
      
      if (draggedArticles >= 1 && selectionRect) {
        // 创建区间：拖动了至少1篇文章
        const startIdx = Math.min(dragStartIndex || 0, currentIndex);
        const endIdx = Math.max(dragStartIndex || 0, currentIndex);

        // 更新文章选中状态
        const newArticles = [...articles];
        let changed = false;
        for (let i = startIdx; i <= endIdx; i++) {
          if (newArticles[i]) {
            newArticles[i] = { ...newArticles[i], included: true };
            changed = true;
          }
        }

        if (changed) {
          pushHistory(newArticles);
          setSelectedRange({ start: startIdx, end: endIdx });
        }
      } else {
        // 点击：选中或取消选中区间
        const clickedIndex = dragStartIndex;
        if (clickedIndex !== null && clickedIndex >= 0 && clickedIndex < articles.length) {
          // 检查是否点击了已有区间
          if (selectedRange && clickedIndex >= selectedRange.start && clickedIndex <= selectedRange.end) {
            // 点击了选中的区间，保持选中状态（可以用Delete删除）
            // 不做任何操作
          } else {
            // 点击了其他位置，清除区间选择
            setSelectedRange(null);
          }
        }
      }
      
      setIsDragging(false);
      setDragStart(null);
      setDragStartIndex(null);
      setSelectionRect(null);
    };

    // 键盘事件：Delete删除选中的区间
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Delete' && selectedRange && !readonly) {
          // 取消选中区间内的所有文章
          const newArticles = [...articles];
          let changed = false;
          for (let i = selectedRange.start; i <= selectedRange.end; i++) {
            if (newArticles[i] && newArticles[i].included) {
              newArticles[i] = { ...newArticles[i], included: false };
              changed = true;
            }
          }
          if (changed) {
            pushHistory(newArticles);
          }
          setSelectedRange(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedRange, articles, readonly, pushHistory]);

    // Wheel to zoom
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(z => Math.max(0.5, Math.min(3, z * delta)));
        }
    };

    return (
      <div className={styles.axisView}>
        <div className={styles.hint}>
          按住拖拽至少1篇文章创建区间 | 点击选中区间 | Delete删除选中区间 | 颜色深浅代表权重 | Ctrl+滚轮缩放
        </div>
        <div 
          className={styles.axisWrapper} 
          ref={wrapperRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg height={150} width={Math.max(800, articles.length * (itemWidth + itemGap) + 40)}>
             {/* Background */}
            <rect x={0} y={20} width="100%" height={110} fill="#f8f9fa" rx={4} />
            
            {/* Selected Range Highlight */}
            {selectedRange && (
              <rect
                x={20 + selectedRange.start * (itemWidth + itemGap)}
                y={35}
                width={(selectedRange.end - selectedRange.start + 1) * (itemWidth + itemGap) - itemGap}
                height={70}
                fill="rgba(255, 193, 7, 0.15)"
                stroke="#ffc107"
                strokeWidth={2}
                strokeDasharray="5,3"
                rx={4}
                pointerEvents="none"
              />
            )}
            
            {articles.map((article, i) => {
              const x = 20 + i * (itemWidth + itemGap);
              const isSelected = article.included;
              const isInSelectedRange = selectedRange && i >= selectedRange.start && i <= selectedRange.end;
              const opacity = 0.3 + (article.weight / 100) * 0.7;
              
              return (
                <g key={article.id}>
                   {/* Tick mark */}
                   <line x1={x + itemWidth/2} y1={20} x2={x + itemWidth/2} y2={30} stroke="#ddd" />
                   
                   {/* Article Indicator */}
                   <rect
                     x={x}
                     y={40}
                     width={itemWidth}
                     height={60}
                     fill={isSelected ? `rgba(74, 144, 217, ${opacity})` : '#e0e0e0'}
                     stroke={isInSelectedRange ? '#ffc107' : (isSelected ? '#4a90d9' : '#ccc')}
                     strokeWidth={isInSelectedRange ? 2 : 1}
                     rx={2}
                     style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
                   >
                     <title>{article.title} (权重: {article.weight}%)</title>
                   </rect>

                   {/* Label */}
                   {(zoom > 0.8 || i % 5 === 0) && (
                     <text 
                       x={x + itemWidth/2} 
                       y={120} 
                       fontSize={10} 
                       textAnchor="middle" 
                       fill="#666"
                       transform={`rotate(45, ${x + itemWidth/2}, 120)`}
                     >
                       {article.title.slice(0, 4)}
                     </text>
                   )}
                </g>
              );
            })}

            {/* Dragging Selection Rect */}
            {isDragging && selectionRect && selectionRect.width > 0 && (
              <rect
                x={selectionRect.x}
                y={20}
                width={selectionRect.width}
                height={110}
                fill="rgba(74, 144, 217, 0.15)"
                stroke="#4a90d9"
                strokeDasharray="4"
                pointerEvents="none"
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  const ListView = () => {
    const handleSort = (field: keyof ExtendedArticle) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };

    const SortIcon = ({ field }: { field: keyof ExtendedArticle }) => {
      if (sortField !== field) return <span style={{opacity: 0.3}}>⇅</span>;
      return <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
      <div className={styles.listView}>
        <div className={styles.tableHeader}>
          <span onClick={() => handleSort('index')} style={{cursor: 'pointer'}}># <SortIcon field="index"/></span>
          <span onClick={() => handleSort('title')} style={{cursor: 'pointer'}}>文章名称 <SortIcon field="title"/></span>
          <span onClick={() => handleSort('collectionName')} style={{cursor: 'pointer'}}>集 <SortIcon field="collectionName"/></span>
          <span onClick={() => handleSort('sentenceCount')} style={{cursor: 'pointer'}}>句子 <SortIcon field="sentenceCount"/></span>
          <span onClick={() => handleSort('weight')} style={{cursor: 'pointer'}}>权重 <SortIcon field="weight"/></span>
          <span>设置</span>
          <span onClick={() => handleSort('included')} style={{cursor: 'pointer'}}>选 <SortIcon field="included"/></span>
        </div>
        <div className={styles.tableBody}>
          {filteredArticles.map((article, index) => (
            <div key={article.id} className={`${styles.tableRow} ${article.included ? styles.selected : ''}`}>
              <span>{article.index + 1}</span>
              <span style={{fontWeight: 500}}>{article.title}</span>
              <span style={{color: '#666'}}>{article.collectionName}</span>
              <span>{article.sentenceCount}</span>
              <div className={styles.weightControl}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={article.weight}
                  disabled={readonly}
                  onChange={(e) => setWeight(article.id, parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span style={{width: '30px', textAlign: 'right'}}>{article.weight}</span>
              </div>
              <div className={styles.quickActions}>
                 <button className={styles.toolButton} onClick={() => setWeight(article.id, 0)}>0</button>
                 <button className={styles.toolButton} onClick={() => setWeight(article.id, 50)}>50</button>
                 <button className={styles.toolButton} onClick={() => setWeight(article.id, 100)}>100</button>
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={article.included}
                  onChange={() => toggleSelection(article.id)}
                  className={styles.checkbox}
                  disabled={readonly}
                />
              </div>
            </div>
          ))}
          {filteredArticles.length === 0 && (
             <div className={styles.emptyState}>没有找到匹配的文章</div>
          )}
        </div>
      </div>
    );
  };

  const StatsView = () => {
    return (
      <div className={styles.statsView}>
        <div className={styles.chartTitle}>📊 统计信息</div>
        <div className={styles.statsGrid}>
           <div className={styles.statCard}>
              <div className={styles.statLabel}>已选中文章</div>
              <div className={styles.statValue}>{stats.selectedCount} <span style={{fontSize: 14, color: '#999'}}>/ {stats.totalCount}</span></div>
           </div>
           <div className={styles.statCard}>
              <div className={styles.statLabel}>句子总数</div>
              <div className={styles.statValue}>{stats.sentenceCount}</div>
           </div>
           <div className={styles.statCard}>
              <div className={styles.statLabel}>平均句子/篇</div>
              <div className={styles.statValue}>{stats.avgSentences}</div>
           </div>
           <div className={styles.statCard}>
              <div className={styles.statLabel}>平均权重</div>
              <div className={styles.statValue}>{stats.avgWeight}%</div>
           </div>
           <div className={styles.statCard}>
              <div className={styles.statLabel}>数据充足度</div>
              <div className={styles.statValue} style={{color: stats.isSufficient ? '#52c41a' : '#faad14'}}>
                {stats.isSufficient ? '✓ 充足' : '⚠ 不足'}
              </div>
           </div>
           <div className={styles.statCard}>
              <div className={styles.statLabel}>预计题目数</div>
              <div className={styles.statValue}>~{stats.expectedQuestions}</div>
           </div>
        </div>
        
        <div className={styles.chartSection}>
          <div className={styles.chartTitle}>📈 权重分布</div>
          <div className={styles.distributionBar}>
            {[0, 25, 50, 75, 100].map((w, i) => {
               const count = articles.filter(a => a.included && a.weight >= w && a.weight < w + 25).length;
               const percent = stats.selectedCount ? (count / stats.selectedCount) * 100 : 0;
               if (percent === 0) return null;
               return (
                 <div 
                   key={w} 
                   className={styles.distributionSegment} 
                   style={{
                     width: `${percent}%`, 
                     background: `rgba(74, 144, 217, ${0.2 + i * 0.2})`
                   }} 
                   title={`${w}-${w+25}%: ${count}篇`}
                 />
               );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <h3 className={styles.title}>文章权重配置</h3>
          <div className={styles.librarySelector}>
            <select
              className={styles.select}
              value={selectedLibraryId}
              onChange={(e) => setSelectedLibraryId(e.target.value)}
              disabled={readonly}
            >
              <option value="">请选择库...</option>
              {libraries.map(lib => (
                <option key={lib.id} value={lib.id}>{lib.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.controls}>
           <div className={styles.toolbar}>
             <button className={styles.toolButton} onClick={undo} disabled={historyIndex <= 0} title="撤销">↶</button>
             <button className={styles.toolButton} onClick={redo} disabled={historyIndex >= history.length - 1} title="重做">↷</button>
             <div style={{width: 1, height: 16, background: '#ddd', margin: '0 4px'}} />
             <button className={styles.toolButton} onClick={selectAll} title="选择当前视图中的所有文章">全选</button>
             <button className={styles.toolButton} onClick={invertSelection} title="反转当前视图中的选择">反选</button>
             <button className={`${styles.toolButton} ${styles.danger}`} onClick={deselectAll} title="清空当前视图中的选择">清空</button>
             <div style={{width: 1, height: 16, background: '#ddd', margin: '0 4px'}} />
             <span style={{fontSize: 12, color: '#999', padding: '0 4px'}}>权重:</span>
             <button className={styles.toolButton} onClick={() => setBatchWeight(0)}>0</button>
             <button className={styles.toolButton} onClick={() => setBatchWeight(50)}>50</button>
             <button className={styles.toolButton} onClick={() => setBatchWeight(100)}>100</button>
           </div>
        </div>
      </div>

      {selectedLibraryId ? (
        <>
          <div className={styles.header} style={{marginBottom: 0}}>
             <div className={styles.tabs}>
                <button 
                  className={`${styles.tab} ${activeView === 'axis' ? styles.active : ''}`}
                  onClick={() => setActiveView('axis')}
                >
                  轴视图
                </button>
                <button 
                  className={`${styles.tab} ${activeView === 'list' ? styles.active : ''}`}
                  onClick={() => setActiveView('list')}
                >
                  列表视图
                </button>
                <button 
                  className={`${styles.tab} ${activeView === 'stats' ? styles.active : ''}`}
                  onClick={() => setActiveView('stats')}
                >
                  统计视图
                </button>
             </div>
             
             {activeView === 'list' && (
                <div className={styles.filterBar}>
                   <input 
                     type="text" 
                     placeholder="搜索文章..." 
                     className={styles.searchBox}
                     value={searchText}
                     onChange={e => setSearchText(e.target.value)}
                   />
                   <select 
                     className={styles.select} 
                     style={{minWidth: 100}}
                     value={filterCollection}
                     onChange={e => setFilterCollection(e.target.value)}
                   >
                     <option value="all">所有集</option>
                     {collections.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                   </select>
                   <select 
                     className={styles.select} 
                     style={{minWidth: 100}}
                     value={filterStatus}
                     onChange={e => setFilterStatus(e.target.value as any)}
                   >
                     <option value="all">全部状态</option>
                     <option value="selected">已选中</option>
                     <option value="unselected">未选中</option>
                   </select>
                </div>
             )}
          </div>

          <div className={styles.content}>
            {activeView === 'axis' && <AxisView />}
            {activeView === 'list' && <ListView />}
            {activeView === 'stats' && <StatsView />}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          请先选择一个文言文库以开始配置
        </div>
      )}
    </div>
  );
}

export default ArticleWeightEditor;
