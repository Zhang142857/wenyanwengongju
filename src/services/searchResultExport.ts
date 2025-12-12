/**
 * 查字结果导出服务
 * 将搜索结果导出为 Word 文档
 */

import { Document, Paragraph, TextRun, AlignmentType, UnderlineType, Packer, BorderStyle } from 'docx';
import type { SearchResult, Definition } from '@/types';
import type { StorageService } from './storage';

export interface ExportOptions {
  title?: string;
  showDefinitions?: boolean;  // 是否显示义项
  showSource?: boolean;       // 是否显示来源（文章、集、库）
  highlightChar?: string;     // 要高亮的字符
}

/**
 * 导出查字结果为 Word 文档
 */
export async function exportSearchResultsToWord(
  results: SearchResult[],
  storage: StorageService,
  options: ExportOptions = {}
): Promise<Blob> {
  const {
    title = '文言文查字结果',
    showDefinitions = true,
    showSource = true,
    highlightChar = '',
  } = options;

  const children: Paragraph[] = [];

  // 添加标题
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: title,
          font: '宋体',
          size: 36,
          bold: true,
        }),
      ],
    })
  );

  // 添加查询信息
  if (highlightChar) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `查询字符：`,
            font: '宋体',
            size: 24,
          }),
          new TextRun({
            text: highlightChar,
            font: '宋体',
            size: 24,
            bold: true,
          }),
          new TextRun({
            text: `    共 ${results.length} 条结果`,
            font: '宋体',
            size: 24,
            color: '666666',
          }),
        ],
      })
    );
  }

  // 添加分隔线
  children.push(
    new Paragraph({
      spacing: { after: 300 },
      border: {
        bottom: {
          color: 'CCCCCC',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      children: [],
    })
  );

  // 按文章分组结果
  const groupedResults = groupResultsByArticle(results);

  // 遍历每个文章组
  for (const [articleId, articleResults] of groupedResults) {
    const firstResult = articleResults[0];
    
    // 文章标题
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: `📖 ${firstResult.article.title}`,
            font: '宋体',
            size: 24,
            bold: true,
          }),
        ],
      })
    );

    // 来源信息
    if (showSource) {
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 200 },
          children: [
            new TextRun({
              text: `来源：${firstResult.library.name} / ${firstResult.collection.name}`,
              font: '宋体',
              size: 18,
              color: '888888',
            }),
          ],
        })
      );
    }

    // 遍历该文章的所有句子
    for (let i = 0; i < articleResults.length; i++) {
      const result = articleResults[i];
      
      // 句子内容（带高亮）
      const sentenceRuns = createHighlightedSentenceRuns(
        result.sentence.text,
        highlightChar,
        result.matchPositions
      );

      children.push(
        new Paragraph({
          spacing: { before: 100, after: 50 },
          indent: { left: 200 },
          children: [
            new TextRun({
              text: `${i + 1}. `,
              font: '宋体',
              size: 21,
              color: '666666',
            }),
            ...sentenceRuns,
          ],
        })
      );

      // 显示义项
      if (showDefinitions && highlightChar) {
        const definitions = getDefinitionsForSentence(
          storage,
          result.sentence.id,
          highlightChar
        );

        if (definitions.length > 0) {
          for (const def of definitions) {
            children.push(
              new Paragraph({
                spacing: { after: 50 },
                indent: { left: 400 },
                children: [
                  new TextRun({
                    text: `→ `,
                    font: '宋体',
                    size: 18,
                    color: '4A90D9',
                  }),
                  new TextRun({
                    text: `【${def.character}】`,
                    font: '宋体',
                    size: 18,
                    bold: true,
                    color: '4A90D9',
                  }),
                  new TextRun({
                    text: def.content,
                    font: '宋体',
                    size: 18,
                    color: '333333',
                  }),
                ],
              })
            );
          }
        }
      }
    }

    // 文章间分隔
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [],
      })
    );
  }

  // 添加页脚
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: `导出时间：${new Date().toLocaleString('zh-CN')}`,
          font: '宋体',
          size: 16,
          color: '999999',
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * 按文章分组结果
 */
function groupResultsByArticle(results: SearchResult[]): Map<string, SearchResult[]> {
  const grouped = new Map<string, SearchResult[]>();
  
  for (const result of results) {
    const articleId = result.article.id;
    if (!grouped.has(articleId)) {
      grouped.set(articleId, []);
    }
    grouped.get(articleId)!.push(result);
  }
  
  return grouped;
}

/**
 * 创建带高亮的句子文本
 */
function createHighlightedSentenceRuns(
  text: string,
  highlightChar: string,
  matchPositions: number[]
): TextRun[] {
  const runs: TextRun[] = [];
  
  if (!highlightChar) {
    runs.push(
      new TextRun({
        text,
        font: '宋体',
        size: 21,
      })
    );
    return runs;
  }

  // 创建位置集合
  const highlightPositions = new Set(matchPositions);
  
  let currentText = '';
  let isHighlighted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const shouldHighlight = highlightPositions.has(i);

    if (shouldHighlight !== isHighlighted) {
      // 状态变化，输出之前的文本
      if (currentText) {
        runs.push(
          new TextRun({
            text: currentText,
            font: '宋体',
            size: 21,
            bold: isHighlighted,
            underline: isHighlighted ? { type: UnderlineType.DOTTED } : undefined,
            color: isHighlighted ? 'E74C3C' : undefined,
          })
        );
      }
      currentText = char;
      isHighlighted = shouldHighlight;
    } else {
      currentText += char;
    }
  }

  // 输出最后的文本
  if (currentText) {
    runs.push(
      new TextRun({
        text: currentText,
        font: '宋体',
        size: 21,
        bold: isHighlighted,
        underline: isHighlighted ? { type: UnderlineType.DOTTED } : undefined,
        color: isHighlighted ? 'E74C3C' : undefined,
      })
    );
  }

  return runs;
}

/**
 * 获取句子中指定字符的义项
 */
function getDefinitionsForSentence(
  storage: StorageService,
  sentenceId: string,
  character: string
): Definition[] {
  const links = storage.getDefinitionLinksForSentence(sentenceId);
  const definitions: Definition[] = [];
  const addedIds = new Set<string>();

  for (const link of links) {
    if (addedIds.has(link.definitionId)) continue;
    
    const def = storage.getDefinitionById(link.definitionId);
    if (def && def.character === character) {
      definitions.push(def);
      addedIds.add(link.definitionId);
    }
  }

  return definitions;
}

/**
 * 下载 Word 文档
 */
export function downloadSearchResultWord(blob: Blob, filename: string = '查字结果.docx') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
