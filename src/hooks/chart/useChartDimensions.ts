import { useState, useMemo } from 'react';

interface UseChartDimensionsProps {
    itemCount: number;
    containerWidth?: number;
}

export const CHART_HEIGHT = 200;
export const TIMELINE_HEIGHT = 80;
export const CHART_PADDING = 40;
export const NODE_RADIUS = 8;
export const MAX_WEIGHT = 100;

export function useChartDimensions({ itemCount, containerWidth = 800 }: UseChartDimensionsProps) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState(0);

    const baseWidth = Math.max(containerWidth, itemCount * 80 + CHART_PADDING * 2);
    const chartWidth = baseWidth * zoom;

    const indexToX = useMemo(() => (index: number) => {
        if (itemCount <= 1) return chartWidth / 2;
        return CHART_PADDING + (index * (chartWidth - CHART_PADDING * 2)) / (itemCount - 1);
    }, [itemCount, chartWidth]);

    const xToIndex = useMemo(() => (x: number) => {
        if (itemCount <= 1) return 0;
        const relativeX = x - CHART_PADDING;
        const index = Math.round((relativeX * (itemCount - 1)) / (chartWidth - CHART_PADDING * 2));
        return Math.max(0, Math.min(itemCount - 1, index));
    }, [itemCount, chartWidth]);

    return {
        zoom,
        setZoom,
        pan,
        setPan,
        chartWidth,
        indexToX,
        xToIndex,
        CHART_HEIGHT,
        TIMELINE_HEIGHT,
        CHART_PADDING,
        NODE_RADIUS,
        MAX_WEIGHT,
    };
}
