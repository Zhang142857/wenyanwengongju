'use client';

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { ArticleWeight } from '../types/weight';
import styles from './ArticleWeightChart.module.css';
import { useChartDimensions } from '../hooks/chart/useChartDimensions';
import { useChartScroll } from '../hooks/chart/useChartScroll';
import { useRangeSelection } from '../hooks/chart/useRangeSelection';
import { useChartInteractions } from '../hooks/chart/useChartInteractions';
import { ChartNode } from '../hooks/chart/types';

export interface ArticleWeightChartProps {
  articles: ArticleWeight[];
  onWeightChange: (articleId: string, weight: number) => void;
  onRangeSelect: (startIndex: number, endIndex: number) => void;
  onArticleToggle: (articleId: string, included: boolean) => void;
  readonly?: boolean;
}

export function ArticleWeightChart({
  articles,
  onWeightChange,
  onArticleToggle,
  readonly = false,
}: ArticleWeightChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const timelineRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const timelineWrapperRef = useRef<HTMLDivElement>(null);

  // 1. Dimensions Logic
  const {
    zoom, setZoom,
    pan, setPan,
    chartWidth,
    indexToX,
    xToIndex,
    CHART_HEIGHT,
    TIMELINE_HEIGHT,
    CHART_PADDING,
    NODE_RADIUS,
    MAX_WEIGHT,
  } = useChartDimensions({
    itemCount: articles.length,
    containerWidth: containerRef.current?.clientWidth
  });

  // 2. Scroll Logic
  const {
    checkAutoScroll,
    stopAutoScroll,
    syncScroll,
  } = useChartScroll({
    chartWidth,
    containerRef,
    chartWrapperRef,
    timelineWrapperRef,
    setPan,
    setZoom,
  });

  // 3. Range Logic
  const {
    ranges,
    isCreatingRange,
    creatingRange,
    draggingRange,
    hoveredRange,
    contextMenu,
    setHoveredRange,
    handleTimelineMouseDown,
    handleRangeEdgeMouseDown,
    handleRangeContextMenu,
    handleDeleteRange,
    updateCreatingRange,
    updateDraggingRange,
    finishInteraction: finishRangeInteraction,
    closeContextMenu,
  } = useRangeSelection({
    articles,
    onArticleToggle,
    onWeightChange,
    xToIndex,
    readonly,
  });

  // 4. Node Logic
  const {
    draggingNode,
    hoveredNode,
    setHoveredNode,
    handleNodeMouseDown,
    handleNodeClick,
    updateDraggingNode,
    finishInteraction: finishNodeInteraction,
  } = useChartInteractions({
    articles,
    onWeightChange,
    onArticleToggle,
    readonly,
    CHART_HEIGHT,
    CHART_PADDING,
    MAX_WEIGHT,
  });

  // Calculate Nodes
  const nodes: ChartNode[] = useMemo(() => articles.map((article, index) => {
    const x = indexToX(index);
    const y = CHART_HEIGHT - CHART_PADDING - (article.weight / MAX_WEIGHT) * (CHART_HEIGHT - CHART_PADDING * 2);
    return {
      x,
      y,
      articleId: article.articleId,
      articleTitle: article.articleTitle,
      weight: article.weight,
      included: article.included,
      index,
    };
  }), [articles, indexToX, CHART_HEIGHT, CHART_PADDING, MAX_WEIGHT]);

  // Generate Curve Path
  const generateCurvePath = useCallback((): string => {
    if (nodes.length < 2) return '';

    const includedNodes = nodes.filter(n => n.included);
    if (includedNodes.length < 2) return '';

    let path = `M ${includedNodes[0].x} ${includedNodes[0].y}`;

    for (let i = 1; i < includedNodes.length; i++) {
      const prev = includedNodes[i - 1];
      const curr = includedNodes[i];
      const cpX = (prev.x + curr.x) / 2;
      path += ` Q ${cpX} ${prev.y} ${cpX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
    }

    return path;
  }, [nodes]);

  // Global Event Handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const y = e.clientY - rect.top;
      updateDraggingNode(y);
    } else if (isCreatingRange || draggingRange) {
      const svg = timelineRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left - pan;
      const index = xToIndex(x);

      if (isCreatingRange) {
        updateCreatingRange(index);
      } else {
        updateDraggingRange(index);
      }

      checkAutoScroll(e.clientX);
    }
  }, [draggingNode, isCreatingRange, draggingRange, pan, xToIndex, updateDraggingNode, updateCreatingRange, updateDraggingRange, checkAutoScroll]);

  const handleGlobalMouseUp = useCallback(() => {
    stopAutoScroll();
    finishNodeInteraction();
    finishRangeInteraction();
  }, [stopAutoScroll, finishNodeInteraction, finishRangeInteraction]);

  const handleGlobalClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('click', handleGlobalClick);
      stopAutoScroll();
    };
  }, [handleGlobalMouseUp, handleGlobalClick, stopAutoScroll]);

  return (
    <div ref={containerRef} className={styles.chartContainer}>
      {/* 权重曲线图 */}
      <div
        ref={chartWrapperRef}
        className={styles.chartWrapper}
        onScroll={() => syncScroll('chart')}
      >
        <svg
          ref={svgRef}
          width={chartWidth}
          height={CHART_HEIGHT}
          className={styles.chart}
          onMouseMove={handleMouseMove}
          onMouseUp={handleGlobalMouseUp}
          onMouseLeave={handleGlobalMouseUp}
          style={{ minWidth: chartWidth }}
        >
          {/* Grid */}
          <g className={styles.grid}>
            {[0, 25, 50, 75, 100].map(weight => {
              const y = CHART_HEIGHT - CHART_PADDING - (weight / MAX_WEIGHT) * (CHART_HEIGHT - CHART_PADDING * 2);
              return (
                <g key={weight}>
                  <line
                    x1={CHART_PADDING}
                    y1={y}
                    x2={chartWidth - CHART_PADDING}
                    y2={y}
                    className={styles.gridLine}
                  />
                  <text x={5} y={y + 4} className={styles.axisLabel}>{weight}%</text>
                </g>
              );
            })}
          </g>

          {/* Curve */}
          <path
            d={generateCurvePath()}
            className={styles.weightCurve}
            fill="none"
            style={{ transition: 'd 0.3s ease' }}
          />

          {/* Nodes */}
          {nodes.map(node => (
            <g key={node.articleId}>
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                className={`${styles.node} ${node.included ? styles.included : styles.excluded} ${draggingNode === node.articleId ? styles.dragging : ''
                  } ${hoveredNode === node.articleId ? styles.hovered : ''}`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.articleId)}
                onMouseEnter={() => setHoveredNode(node.articleId)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.articleId)}
                style={{ transition: 'cy 0.2s ease, fill 0.2s ease' }}
              />
              <text
                x={node.x}
                y={CHART_HEIGHT - 10}
                className={styles.articleLabel}
                textAnchor="middle"
              >
                {node.index + 1}
              </text>
              {hoveredNode === node.articleId && (
                <g className={styles.tooltip}>
                  <rect
                    x={node.x - 70}
                    y={node.y - 55}
                    width={140}
                    height={45}
                    rx={4}
                    className={styles.tooltipBg}
                  />
                  <text x={node.x} y={node.y - 40} textAnchor="middle" className={styles.tooltipTitle}>
                    {node.index + 1}. {node.articleTitle.length > 10 ? node.articleTitle.slice(0, 10) + '...' : node.articleTitle}
                  </text>
                  <text x={node.x} y={node.y - 22} textAnchor="middle" className={styles.tooltipWeight}>
                    权重: {node.weight}%
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* 区间选择时间轴 */}
      <div
        ref={timelineWrapperRef}
        className={styles.timelineWrapper}
        onScroll={() => syncScroll('timeline')}
      >
        <div className={styles.timelineLabel}>区间选择轴</div>
        <svg
          ref={timelineRef}
          width={chartWidth}
          height={TIMELINE_HEIGHT}
          className={styles.timeline}
          onMouseDown={(e) => {
            const rect = timelineRef.current?.getBoundingClientRect();
            if (rect) handleTimelineMouseDown(e, pan, rect.left);
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleGlobalMouseUp}
          onMouseLeave={handleGlobalMouseUp}
          style={{ minWidth: chartWidth }}
        >
          <rect
            x={CHART_PADDING}
            y={0}
            width={chartWidth - CHART_PADDING * 2}
            height={TIMELINE_HEIGHT}
            fill="#f5f5f5"
            stroke="#ddd"
            strokeWidth={1}
          />

          {/* Ticks */}
          {articles.map((article, index) => {
            const x = indexToX(index);
            const showLabel = articles.length <= 20 || index % Math.ceil(articles.length / 20) === 0;
            return (
              <g key={article.articleId}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={showLabel ? 15 : 8}
                  stroke="#ccc"
                  strokeWidth={1}
                />
                {showLabel && (
                  <text
                    x={x}
                    y={TIMELINE_HEIGHT - 5}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#666"
                  >
                    {index + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* Ranges */}
          {ranges.map(range => {
            const start = Math.min(range.startIndex, range.endIndex);
            const end = Math.max(range.startIndex, range.endIndex);
            const startX = indexToX(start);
            const endX = indexToX(end);
            const width = endX - startX;
            return (
              <g key={range.id} className={styles.rangeGroup}>
                <rect
                  x={startX}
                  y={10}
                  width={Math.max(width, 4)}
                  height={TIMELINE_HEIGHT - 20}
                  fill={range.color}
                  opacity={hoveredRange === range.id ? 0.8 : 0.6}
                  rx={4}
                  className={styles.rangeRect}
                  onMouseEnter={() => !isCreatingRange && setHoveredRange(range.id)}
                  onMouseLeave={() => setHoveredRange(null)}
                  onContextMenu={(e) => !isCreatingRange && handleRangeContextMenu(e, range.id)}
                  style={{ transition: 'opacity 0.2s, fill 0.2s' }}
                />

                <rect
                  x={startX - 4}
                  y={10}
                  width={8}
                  height={TIMELINE_HEIGHT - 20}
                  fill={range.color}
                  opacity={0.9}
                  className={styles.rangeEdge}
                  onMouseDown={(e) => handleRangeEdgeMouseDown(e, range.id, 'start')}
                  style={{ cursor: 'ew-resize' }}
                />
                <rect
                  x={endX - 4}
                  y={10}
                  width={8}
                  height={TIMELINE_HEIGHT - 20}
                  fill={range.color}
                  opacity={0.9}
                  className={styles.rangeEdge}
                  onMouseDown={(e) => handleRangeEdgeMouseDown(e, range.id, 'end')}
                  style={{ cursor: 'ew-resize' }}
                />

                {width > 60 && (
                  <text
                    x={startX + width / 2}
                    y={TIMELINE_HEIGHT / 2 + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {articles[start]?.articleTitle.slice(0, 2)}~{articles[end]?.articleTitle.slice(0, 2)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Creating Range */}
          {isCreatingRange && creatingRange && (
            <g>
              {(() => {
                const start = Math.min(creatingRange.start, creatingRange.current);
                const end = Math.max(creatingRange.start, creatingRange.current);
                const startX = indexToX(start);
                const endX = indexToX(end);
                const width = endX - startX;
                return (
                  <rect
                    x={startX}
                    y={10}
                    width={Math.max(width, 4)}
                    height={TIMELINE_HEIGHT - 20}
                    fill="#999"
                    opacity={0.5}
                    rx={4}
                    className={styles.rangeRect}
                  />
                )
              })()}
            </g>
          )}

        </svg>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => handleDeleteRange(contextMenu.rangeId)}
          >
            删除区间
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendRow}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.included}`}></span>
            已选中
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.excluded}`}></span>
            未选中
          </span>
        </div>
        <div className={styles.legendHint}>
          上方：拖拽节点调整权重，点击切换选中状态 | 下方：拖拽创建区间，拖拽边缘调整，右键删除 | 滚轮缩放
        </div>
      </div>
    </div>
  );
}

export default ArticleWeightChart;
