import { ArticleWeight } from '@/types/weight';

export interface ChartNode {
    x: number;
    y: number;
    articleId: string;
    articleTitle: string;
    weight: number;
    included: boolean;
    index: number;
}

export interface ArticleRange {
    id: string;
    startIndex: number;
    endIndex: number;
    color: string;
}
