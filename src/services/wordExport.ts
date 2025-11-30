import { Document, Paragraph, TextRun, AlignmentType, UnderlineType, Packer } from 'docx';
import type { ExamQuestion } from './examGenerator';

export type ExportVersion = 'teacher' | 'student' | 'both';

/**
 * 导出题目为 Word 文档
 * @param questions 题目列表
 * @param version 导出版本：teacher(教师版带答案)、student(学生版不带答案)、both(两个版本)
 */
export async function exportToWord(questions: ExamQuestion[], version: ExportVersion = 'teacher'): Promise<Blob> {
  const children: Paragraph[] = [];

  // 添加标题
  const titleText = version === 'student' ? '文言文练习题（学生版）' : 
                    version === 'teacher' ? '文言文练习题（教师版）' : '文言文练习题';
  
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: titleText,
          font: '宋体',
          size: 32,
          bold: true,
        }),
      ],
    })
  );

  questions.forEach((question, index) => {
    // 根据答案类型生成题目标题
    const questionTitle = question.answerType === 'find-same'
      ? `${index + 1}.下列选项中加点字的意思都相同的一项是（   ）`
      : `${index + 1}.下列选项中加点字的意思不完全相同的一项是（   ）`;

    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: questionTitle,
            font: '宋体',
            size: 21,
          }),
        ],
      })
    );

    // 选项
    question.options.forEach((option) => {
      const optionText = option.sentence;
      const textRuns: TextRun[] = [];
      
      // 确定要高亮的字符
      const targetChar = question.questionType === 'different-characters' 
        ? (option.character || question.character)
        : question.character;

      // 选项标签
      textRuns.push(
        new TextRun({
          text: `${option.label}.`,
          font: '宋体',
          size: 21,
        })
      );

      // 处理句子，给所有目标字加点
      let lastIndex = 0;
      let currentIndex = optionText.indexOf(targetChar, lastIndex);

      while (currentIndex !== -1) {
        // 字符前的文本
        if (currentIndex > lastIndex) {
          textRuns.push(
            new TextRun({
              text: optionText.substring(lastIndex, currentIndex),
              font: '宋体',
              size: 21,
            })
          );
        }

        // 加点的字
        textRuns.push(
          new TextRun({
            text: targetChar,
            font: '宋体',
            size: 21,
            underline: {
              type: UnderlineType.DOTTED,
            },
          })
        );

        lastIndex = currentIndex + targetChar.length;
        currentIndex = optionText.indexOf(targetChar, lastIndex);
      }

      // 剩余的文本
      if (lastIndex < optionText.length) {
        textRuns.push(
          new TextRun({
            text: optionText.substring(lastIndex),
            font: '宋体',
            size: 21,
          })
        );
      }

      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: {
            left: 300,
          },
          children: textRuns,
        })
      );
    });

    // 只有教师版才显示答案解析
    if (version === 'teacher') {
      const analysisText = generateAnalysis(question);
      children.push(
        new Paragraph({
          spacing: {
            line: 360,
          },
          children: [
            new TextRun({
              text: analysisText,
              font: '宋体',
              size: 21,
              bold: true,
              color: 'FF0000',
            }),
          ],
        })
      );
    }

    // 空行
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '' })],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * 导出教师版和学生版两个文档
 */
export async function exportBothVersions(questions: ExamQuestion[]): Promise<{ teacher: Blob; student: Blob }> {
  const [teacher, student] = await Promise.all([
    exportToWord(questions, 'teacher'),
    exportToWord(questions, 'student'),
  ]);
  return { teacher, student };
}

/**
 * 生成答案解析文本
 */
function generateAnalysis(question: ExamQuestion): string {
  const parts: string[] = [];

  // 正确答案说明
  const correctOption = question.options.find(opt => opt.label === question.correctAnswer);
  if (correctOption) {
    parts.push(`【详解】${question.correctAnswer}.${question.definition}/${question.definition}/${question.definition}；`);
  }

  // 其他选项说明
  const wrongOptions = question.options.filter(opt => opt.label !== question.correctAnswer);
  wrongOptions.forEach((opt, index) => {
    const prefix = index === 0 ? '    ' : '      ';
    parts.push(`${prefix}${opt.label}.${question.definition}/${question.definition}/其他义项；`);
  });

  return parts.join('\n');
}

/**
 * 下载 Word 文档
 */
export function downloadWord(blob: Blob, filename: string = '文言文练习题.docx') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
