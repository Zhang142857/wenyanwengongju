import { useRef, useCallback, useEffect } from 'react';

interface UseChartScrollProps {
    chartWidth: number;
    containerRef: React.RefObject<HTMLDivElement>;
    chartWrapperRef: React.RefObject<HTMLDivElement>;
    timelineWrapperRef: React.RefObject<HTMLDivElement>;
    setPan: React.Dispatch<React.SetStateAction<number>>;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
}

export function useChartScroll({
    chartWidth,
    containerRef,
    chartWrapperRef,
    timelineWrapperRef,
    setPan,
    setZoom,
}: UseChartScrollProps) {
    const autoScrollTimerRef = useRef<number | null>(null);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollTimerRef.current) {
            window.cancelAnimationFrame(autoScrollTimerRef.current);
            autoScrollTimerRef.current = null;
        }
    }, []);

    const startAutoScroll = useCallback((direction: 'left' | 'right') => {
        if (autoScrollTimerRef.current) return;

        const scroll = () => {
            setPan(prev => {
                const scrollSpeed = 5;
                const newPan = direction === 'left' ? prev + scrollSpeed : prev - scrollSpeed;
                const maxPan = 0;
                const minPan = -(chartWidth - (containerRef.current?.clientWidth || 800));
                return Math.max(minPan, Math.min(maxPan, newPan));
            });
            autoScrollTimerRef.current = window.requestAnimationFrame(scroll);
        };

        autoScrollTimerRef.current = window.requestAnimationFrame(scroll);
    }, [chartWidth, containerRef, setPan]);

    const checkAutoScroll = useCallback((clientX: number) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const edgeThreshold = 50;

        if (clientX < rect.left + edgeThreshold) {
            startAutoScroll('left');
        } else if (clientX > rect.right - edgeThreshold) {
            startAutoScroll('right');
        } else {
            stopAutoScroll();
        }
    }, [startAutoScroll, stopAutoScroll, containerRef]);

    const syncScroll = useCallback((source: 'chart' | 'timeline') => {
        const chartWrapper = chartWrapperRef.current;
        const timelineWrapper = timelineWrapperRef.current;
        if (!chartWrapper || !timelineWrapper) return;

        if (source === 'chart') {
            timelineWrapper.scrollLeft = chartWrapper.scrollLeft;
        } else {
            chartWrapper.scrollLeft = timelineWrapper.scrollLeft;
        }
    }, [chartWrapperRef, timelineWrapperRef]);

    // Zoom logic using native wheel event for better control
    useEffect(() => {
        const chartWrapper = chartWrapperRef.current;
        const timelineWrapper = timelineWrapperRef.current;

        const handleNativeWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
        };

        if (chartWrapper) {
            chartWrapper.addEventListener('wheel', handleNativeWheel, { passive: false });
        }
        if (timelineWrapper) {
            timelineWrapper.addEventListener('wheel', handleNativeWheel, { passive: false });
        }

        return () => {
            if (chartWrapper) {
                chartWrapper.removeEventListener('wheel', handleNativeWheel);
            }
            if (timelineWrapper) {
                timelineWrapper.removeEventListener('wheel', handleNativeWheel);
            }
        };
    }, [chartWrapperRef, timelineWrapperRef, setZoom]);

    return {
        startAutoScroll,
        stopAutoScroll,
        checkAutoScroll,
        syncScroll,
    };
}
