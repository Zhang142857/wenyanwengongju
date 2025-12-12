import { useState, useCallback } from 'react';
import { ArticleWeight } from '@/types/weight';

interface UseChartInteractionsProps {
    articles: ArticleWeight[];
    onWeightChange: (articleId: string, weight: number) => void;
    onArticleToggle: (articleId: string, included: boolean) => void;
    readonly?: boolean;
    CHART_HEIGHT: number;
    CHART_PADDING: number;
    MAX_WEIGHT: number;
}

export function useChartInteractions({
    articles,
    onWeightChange,
    onArticleToggle,
    readonly = false,
    CHART_HEIGHT,
    CHART_PADDING,
    MAX_WEIGHT,
}: UseChartInteractionsProps) {
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const handleNodeMouseDown = useCallback((e: React.MouseEvent, articleId: string) => {
        if (readonly) return;
        e.preventDefault();
        e.stopPropagation();
        setDraggingNode(articleId);
    }, [readonly]);

    const handleNodeClick = useCallback((articleId: string) => {
        if (readonly || draggingNode) return;
        const article = articles.find(a => a.articleId === articleId);
        if (article) {
            onArticleToggle(articleId, !article.included);
        }
    }, [readonly, draggingNode, articles, onArticleToggle]);

    const updateDraggingNode = useCallback((y: number) => {
        if (draggingNode) {
            const weight = Math.round(
                Math.max(0, Math.min(MAX_WEIGHT,
                    ((CHART_HEIGHT - CHART_PADDING - y) / (CHART_HEIGHT - CHART_PADDING * 2)) * MAX_WEIGHT
                ))
            );
            onWeightChange(draggingNode, weight);
        }
    }, [draggingNode, onWeightChange, CHART_HEIGHT, CHART_PADDING, MAX_WEIGHT]);

    const finishInteraction = useCallback(() => {
        if (draggingNode) {
            setDraggingNode(null);
        }
    }, [draggingNode]);

    return {
        draggingNode, setDraggingNode,
        hoveredNode, setHoveredNode,
        handleNodeMouseDown,
        handleNodeClick,
        updateDraggingNode,
        finishInteraction,
    };
}
