# 文言文数据导入指南

## 概述

本应用提供了一个简单的数据导入功能，允许你通过 JSON 格式批量导入文言文数据。导入操作会**完全覆盖**现有数据。

## 访问导入页面

1. 启动应用
2. 点击左侧边栏的"导入数据"
3. 或直接访问 `/import` 路径

## 数据格式

### 基本结构

```json
[
  {
    "name": "库名称",
    "collections": [
      {
        "name": "集名称",
        "order": 1,
        "articles": [
          {
            "title": "文章标题",
            "sentences": [
              "第一句话。",
              "第二句话。",
              "第三句话。"
            ]
          }
        ]
      }
    ]
  }
]
```

### 字段说明

#### 库 (Library)
- `name` (string, 必需): 库的名称，如"文言文库"、"诗词库"等
- `collections` (array, 必需): 该库包含的集的数组

#### 集 (Collection)
- `name` (string, 必需): 集的名称，如"七年级上册"、"唐诗三百首"等
- `order` (number, 必需): 集的排序顺序，数字越小越靠前
- `articles` (array, 必需): 该集包含的文章数组

#### 文章 (Article)
- `title` (string, 必需): 文章标题，如"论语十则"、"陋室铭"等
- `sentences` (array, 必需): 已分割好的句子数组

#### 句子 (Sentence)
- 每个句子是一个字符串
- 句子应该已经分割好，包含标点符号
- 空字符串会被自动过滤

## 完整示例

```json
[
  {
    "name": "文言文库",
    "collections": [
      {
        "name": "七年级上册",
        "order": 1,
        "articles": [
          {
            "title": "论语十则",
            "sentences": [
              "子曰：学而时习之，不亦说乎？",
              "有朋自远方来，不亦乐乎！",
              "人不知而不愠，不亦君子乎？",
              "温故而知新，可以为师矣。",
              "学而不思则罔，思而不学则殆。"
            ]
          },
          {
            "title": "陋室铭",
            "sentences": [
              "山不在高，有仙则名。",
              "水不在深，有龙则灵。",
              "斯是陋室，惟吾德馨。",
              "苔痕上阶绿，草色入帘青。",
              "谈笑有鸿儒，往来无白丁。"
            ]
          }
        ]
      },
      {
        "name": "八年级上册",
        "order": 2,
        "articles": [
          {
            "title": "桃花源记",
            "sentences": [
              "晋太元中，武陵人捕鱼为业。",
              "缘溪行，忘路之远近。",
              "忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。",
              "渔人甚异之，复前行，欲穷其林。"
            ]
          },
          {
            "title": "爱莲说",
            "sentences": [
              "水陆草木之花，可爱者甚蕃。",
              "晋陶渊明独爱菊。",
              "自李唐来，世人甚爱牡丹。",
              "予独爱莲之出淤泥而不染，濯清涟而不妖。"
            ]
          }
        ]
      }
    ]
  },
  {
    "name": "诗词库",
    "collections": [
      {
        "name": "唐诗",
        "order": 1,
        "articles": [
          {
            "title": "静夜思",
            "sentences": [
              "床前明月光，疑是地上霜。",
              "举头望明月，低头思故乡。"
            ]
          }
        ]
      }
    ]
  }
]
```

## 导入步骤

### 方法 1: 直接粘贴

1. 准备好 JSON 格式的数据
2. 访问导入页面
3. 将 JSON 数据粘贴到文本框中
4. 点击"导入数据"按钮
5. 等待导入完成

### 方法 2: 使用示例

1. 访问导入页面
2. 点击"加载示例"按钮
3. 查看示例格式
4. 修改为你的数据
5. 点击"导入数据"按钮

### 方法 3: 下载示例文件

1. 访问导入页面
2. 点击"下载示例文件"按钮
3. 在本地编辑 JSON 文件
4. 复制文件内容到文本框
5. 点击"导入数据"按钮

## 数据准备建议

### 1. 句子分割

建议按照以下标点符号分割句子：
- 句号 `。`
- 问号 `？`
- 感叹号 `！`
- 分号 `；`

示例：
```
原文: "山不在高，有仙则名。水不在深，有龙则灵。"
分割后:
[
  "山不在高，有仙则名。",
  "水不在深，有龙则灵。"
]
```

### 2. 保留标点

每个句子应该包含结尾的标点符号：
```json
✅ 正确: "子曰：学而时习之，不亦说乎？"
❌ 错误: "子曰：学而时习之，不亦说乎"
```

### 3. 去除空白

句子前后的空白会被自动去除，但建议提前清理：
```json
✅ 正确: "学而时习之，不亦说乎？"
⚠️ 可以: "  学而时习之，不亦说乎？  "
```

### 4. 组织结构

建议的组织方式：
- **库**: 按来源或类型分类（如"课本"、"课外读物"）
- **集**: 按年级、册次或主题分类（如"七年级上册"、"唐诗"）
- **文章**: 具体的篇目（如"论语十则"、"陋室铭"）
- **句子**: 文章的每一句话

## 使用 Python 准备数据

如果你有大量文本需要处理，可以使用 Python 脚本：

```python
import json
import re

def split_sentences(text):
    """按标点符号分割句子"""
    # 按句号、问号、感叹号、分号分割
    pattern = r'([。？！；])'
    parts = re.split(pattern, text)
    
    sentences = []
    current = ''
    
    for i, part in enumerate(parts):
        if re.match(pattern, part):
            current += part
            if current.strip():
                sentences.append(current.strip())
            current = ''
        else:
            current += part
    
    # 处理最后一个句子
    if current.strip():
        sentences.append(current.strip())
    
    return sentences

# 示例数据
data = [
    {
        "name": "文言文库",
        "collections": [
            {
                "name": "七年级上册",
                "order": 1,
                "articles": [
                    {
                        "title": "论语十则",
                        "sentences": split_sentences(
                            "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎！"
                        )
                    }
                ]
            }
        ]
    }
]

# 保存为 JSON
with open('import_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("数据已保存到 import_data.json")
```

## 使用 JavaScript/Node.js 准备数据

```javascript
const fs = require('fs');

function splitSentences(text) {
  // 按标点符号分割
  const pattern = /([。？！；])/g;
  const parts = text.split(pattern);
  
  const sentences = [];
  let current = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.match(pattern)) {
      current += part;
      if (current.trim()) {
        sentences.push(current.trim());
      }
      current = '';
    } else if (part.trim()) {
      current += part;
    }
  }
  
  // 处理最后一个句子
  if (current.trim()) {
    sentences.push(current.trim());
  }
  
  return sentences;
}

// 示例数据
const data = [
  {
    name: '文言文库',
    collections: [
      {
        name: '七年级上册',
        order: 1,
        articles: [
          {
            title: '论语十则',
            sentences: splitSentences(
              '子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎！'
            )
          }
        ]
      }
    ]
  }
];

// 保存为 JSON
fs.writeFileSync(
  'import_data.json',
  JSON.stringify(data, null, 2),
  'utf-8'
);

console.log('数据已保存到 import_data.json');
```

## 常见问题

### Q: 导入后原有数据会怎样？
A: 原有数据会被**完全覆盖**。建议在导入前备份重要数据。

### Q: 如何备份现有数据？
A: 打开浏览器开发者工具 (F12)，在 Console 中执行：
```javascript
console.log(localStorage.getItem('classical-chinese-data'))
```
复制输出的 JSON 数据保存到文件。

### Q: 导入失败怎么办？
A: 检查以下几点：
1. JSON 格式是否正确（可以使用在线 JSON 验证工具）
2. 所有必需字段是否都存在
3. 数据类型是否正确（name 是字符串，order 是数字等）
4. 句子数组是否为空

### Q: 可以导入多个库吗？
A: 可以。在 JSON 数组中添加多个库对象即可。

### Q: 句子顺序重要吗？
A: 是的。句子会按照数组中的顺序显示，建议按照原文顺序排列。

### Q: 可以导入部分数据吗？
A: 当前版本只支持完全覆盖。如果需要追加数据，建议：
1. 先导出现有数据
2. 合并新旧数据
3. 重新导入

## 数据验证

导入前，系统会自动验证：
- ✅ JSON 格式正确性
- ✅ 必需字段完整性
- ✅ 数据类型正确性
- ✅ 数组不为空
- ✅ 字符串不为空

如果验证失败，会显示具体的错误信息。

## 导入后的操作

导入成功后：
1. 系统会显示导入统计（库、集、文章、句子数量）
2. 数据会自动保存到浏览器本地存储
3. 可以立即在"查字"页面使用新数据
4. 建议刷新页面确保所有组件加载新数据

## 性能建议

- 单次导入建议不超过 10000 个句子
- 如果数据量很大，考虑分批导入
- 导入大量数据时，浏览器可能会短暂卡顿，这是正常现象

## 技术细节

### 存储位置
数据存储在浏览器的 localStorage 中，键名为 `classical-chinese-data`

### 数据结构
导入的数据会被转换为完整的内部数据结构，包括：
- 自动生成的 UUID
- 创建和更新时间戳
- 句子索引
- 文章内容重建

### ID 生成
所有 ID 使用 UUID v4 自动生成，确保唯一性。

## 示例文件下载

访问导入页面，点击"下载示例文件"按钮，可以下载一个完整的示例 JSON 文件作为参考。
