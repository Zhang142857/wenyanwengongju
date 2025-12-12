import { useState, useCallback, useEffect } from 'react';
import { ArticleRange } from './types';
import { ArticleWeight } from '@/types/weight';

const RANGE_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

interface UseRangeSelectionProps {
    articles: ArticleWeight[];
    onArticleToggle: (articleId: string, included: boolean) => void;
    onWeightChange: (articleId: string, weight: number) => void;
    xToIndex: (x: number) => number;
    readonly?: boolean;
}

export function useRangeSelection({
    articles,
    onArticleToggle,
    onWeightChange,
    xToIndex,
    readonly = false,
}: UseRangeSelectionProps) {
    const [ranges, setRanges] = useState<ArticleRange[]>([]);
    const [isCreatingRange, setIsCreatingRange] = useState(false);
    const [creatingRange, setCreatingRange] = useState<{ start: number; current: number } | null>(null);
    const [draggingRange, setDraggingRange] = useState<{ id: string; edge: 'start' | 'end' } | null>(null);
    const [hoveredRange, setHoveredRange] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rangeId: string } | null>(null);

    const getNextColor = useCallback(() => {
        return RANGE_COLORS[ranges.length % RANGE_COLORS.length];
    }, [ranges.length]);

    // Handle syncing ranges to articles
    useEffect(() => {
        if (ranges.length === 0) return;

        // Merge all ranges
        const includedIndices = new Set<number>();
        ranges.forEach(range => {
            const start = Math.min(range.startIndex, range.endIndex);
            const end = Math.max(range.startIndex, range.endIndex);
            for (let i = start; i <= end; i++) {
                includedIndices.add(i);
            }
        });

        // Update article status and weight
        articles.forEach((article, index) => {
            const shouldInclude = includedIndices.has(index);
            if (article.included !== shouldInclude) {
                onArticleToggle(article.articleId, shouldInclude);
            }
            if (!shouldInclude && article.weight > 0) {
                onWeightChange(article.articleId, 0);
            }
        });
    }, [ranges, articles, onArticleToggle, onWeightChange]);

    const handleTimelineMouseDown = useCallback((e: React.MouseEvent, pan: number, rectLeft: number) => {
        if (readonly) return;

        const x = e.clientX - rectLeft - pan;
        const index = xToIndex(x);

        setIsCreatingRange(true);
        setCreatingRange({ start: index, current: index });
    }, [readonly, xToIndex]);

    const handleRangeEdgeMouseDown = useCallback((e: React.MouseEvent, rangeId: string, edge: 'start' | 'end') => {
        if (readonly) return;
        e.stopPropagation();
        setDraggingRange({ id: rangeId, edge });
    }, [readonly]);

    const handleRangeContextMenu = useCallback((e: React.MouseEvent, rangeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, rangeId });
    }, []);

    const handleDeleteRange = useCallback((rangeId: string) => {
        setRanges(prev => prev.filter(r => r.id !== rangeId));
        setContextMenu(null);
    }, []);

    const updateCreatingRange = useCallback((index: number) => {
        if (creatingRange) {
            setCreatingRange({ ...creatingRange, current: index });
        }
    }, [creatingRange]);

    const updateDraggingRange = useCallback((index: number) => {
        if (draggingRange) {
            setRanges(prev => prev.map(range => {
                if (range.id === draggingRange.id) {
                    if (draggingRange.edge === 'start') {
                        return { ...range, startIndex: index };
                    } else {
                        return { ...range, endIndex: index };
                    }
                }
                return range;
            }));
        }
    }, [draggingRange]);

    const finishInteraction = useCallback(() => {
        if (isCreatingRange && creatingRange) {
            const newRange: ArticleRange = {
                id: `range-${Date.now()}`,
                startIndex: creatingRange.start,
                endIndex: creatingRange.current,
                color: getNextColor(),
            };
            setRanges(prev => [...prev, newRange]);
            setIsCreatingRange(false);
            setCreatingRange(null);
        } else if (draggingRange) {
            setDraggingRange(null);
        }
    }, [isCreatingRange, creatingRange, draggingRange, getNextColor]);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    return {
        ranges, setRanges,
        isCreatingRange, setIsCreatingRange,
        creatingRange, setCreatingRange,
        draggingRange, setDraggingRange,
        hoveredRange, setHoveredRange,
        contextMenu, setContextMenu,
        handleTimelineMouseDown,
        handleRangeEdgeMouseDown,
        handleRangeContextMenu,
        handleDeleteRange,
        updateCreatingRange,
        updateDraggingRange,
        finishInteraction,
        closeContextMenu
    };
}
