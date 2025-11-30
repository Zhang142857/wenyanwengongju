# 文言文学习助手 - 技术文档

## 🏗️ 技术架构

### 技术栈
- **前端框架**: Next.js 14 (App Router)
- **UI框架**: React 18
- **语言**: TypeScript
- **样式**: CSS Modules
- **桌面框架**: Electron
- **数据存储**: LocalStorage (JSON)
- **文档处理**: docx.js
- **测试框架**: Vitest

### 项目结构
```
src/
├── app/                    # Next.js App Router页面
│   ├── page.tsx           # 首页
│   ├── import/            # 导入功能
│   ├── organize/          # 整理功能
│   ├── ai-organize/       # AI整理功能
│   ├── exam/              # 自动出题
│   ├── manage/            # 管理功能
│   │   ├── definitions/   # 义项管理
│   │   ├── key-characters/# 重点字管理
│   │   └── concurrency-settings/ # 并发设置
│   └── regex-generator/   # 正则生成器
├── components/            # 可复用组件
│   ├── Layout.tsx        # 布局组件
│   ├── MindMapCanvas.tsx # 思维导图画布
│   ├── SearchPage.tsx    # 搜索组件
│   └── CustomMultiSelect.tsx # 多选组件
├── services/             # 业务逻辑服务
│   ├── storage.ts        # 数据存储服务
│   ├── ai.ts             # AI服务
│   ├── examGenerator.ts  # 出题引擎
│   ├── mindmap.ts        # 思维导图服务
│   ├── aiOrganize.ts     # AI整理服务
│   ├── shortSentence.ts  # 短句服务
│   ├── wordExport.ts     # Word导出服务
│   └── concurrencyConfig.ts # 并发配置
└── tools/                # 工具函数
    └── search.ts         # 搜索工具
```

## 📦 核心模块详解

### 1. 数据存储模块 (storage.ts)

#### 数据模型
```typescript
// 库
interface Library {
  id: string
  name: string
  order: number
  collections: Collection[]
}

// 集
interface Collection {
  id: string
  name: string
  order: number
  articles: Article[]
}

// 文章
interface Article {
  id: string
  title: string
  order: number
  sentences: Sentence[]
}

// 句子
interface Sentence {
  id: string
  text: string
  order: number
  translations?: Translation[]
}

// 义项
interface Definition {
  id: string
  character: string
  content: string
  createdAt: number
}

// 字符-义项-句子关联
interface CharacterDefinitionLink {
  id: string
  definitionId: string
  sentenceId: string
  charPosition: number
}

// 短句
interface ShortSentence {
  id: string
  text: string
  sourceId: string
  startIndex: number
  endIndex: number
  createdAt: number
}
```

#### 存储机制
- **LocalStorage**: 使用浏览器LocalStorage存储JSON数据
- **自动保存**: 每次数据变更自动保存
- **数据迁移**: 支持导入导出JSON格式

#### 关键方法
```typescript
class StorageService {
  // 初始化
  async initialize(): Promise<void>
  
  // 库操作
  addLibrary(name: string): Library
  getLibraries(): Library[]
  
  // 义项操作
  addDefinition(character: string, content: string): Definition
  getDefinitions(): Definition[]
  
  // 关联操作
  addCharacterDefinitionLink(
    definitionId: string,
    sentenceId: string,
    charPosition: number
  ): CharacterDefinitionLink
  
  // 短句操作
  addShortSentence(
    text: string,
    sourceId: string,
    startIndex: number,
    endIndex: number
  ): ShortSentence
}
```

### 2. AI服务模块 (ai.ts)

#### API配置
```typescript
interface APIConfig {
  provider: 'minimax' | 'deepseek' | 'custom'
  baseUrl: string
  apiKey: string
  model: string
}
```

#### 核心功能

##### 2.1 生成义项
```typescript
async function generateDefinition(
  sentence: string,
  character: string
): Promise<string>
```
- 使用AI分析句子中字符的含义
- 返回简洁的义项解释

##### 2.2 批量生成义项
```typescript
async function batchGenerateDefinitions(
  requests: AIDefinitionRequest[],
  concurrency: number = 3
): Promise<Array<{
  character: string
  definition: string
  sentence: string
}>>
```
- 支持并发控制
- 自动重试失败请求
- 进度回调

##### 2.3 找出重点字
```typescript
async function findKeyCharacters(
  sentences: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{
  sentence: string
  characters: string[]
}>>
```
- 分析句子找出需要注释的字
- 过滤常见字和虚词

### 3. 出题引擎 (examGenerator.ts)

#### 出题配置
```typescript
interface ExamConfig {
  questionCount: number              // 题目数量
  questionType: 'same-character' | 'different-characters'
  answerType: 'find-different' | 'find-same'
  optionsCount: 3 | 4               // 选项数量
  sentencesPerOption?: number       // 每选项短句数
  correctAnswer?: 'A' | 'B' | 'C' | 'D'
  targetCharacters?: string[]       // 优先考察的字
  scope: {                          // 考察范围
    libraryId?: string
    collectionId?: string
    articleId?: string
  }
  includePreviousKnowledge?: boolean
}
```

#### 出题流程

##### 3.1 同一个字题型
```typescript
// 1. 选择字符和义项
const character = selectCharacter()
const definition = selectDefinition(character)

// 2. 为正确答案找短句
const correctSentences = findSentences(character, definition)

// 3. 为干扰项找短句
const wrongSentences = findSentences(character, otherDefinitions)

// 4. 组装选项
const options = assembleOptions(correctSentences, wrongSentences)
```

##### 3.2 不同字题型
```typescript
// 1. 选择多个字符
const characters = selectMultipleCharacters()

// 2. 为每个字符选择义项
const charDefPairs = characters.map(char => ({
  character: char,
  definition: selectDefinition(char)
}))

// 3. 确定正确答案和干扰项
const correctPair = selectCorrectAnswer(charDefPairs)
const wrongPairs = selectWrongAnswers(charDefPairs)

// 4. 为每个字符找短句
const options = charDefPairs.map(pair => ({
  character: pair.character,
  definition: pair.definition,
  sentences: findSentences(pair.character, pair.definition)
}))
```

#### 智能推荐算法
```typescript
function analyzeDataAndRecommend(): {
  recommendedType: 'same-character' | 'different-characters'
  reason: string
} {
  const definitions = getDefinitions()
  const charGroups = groupByCharacter(definitions)
  
  // 统计多义项字符数量
  const multiDefChars = charGroups.filter(g => g.length >= 2).length
  
  // 推荐逻辑
  if (multiDefChars >= 10) {
    return {
      recommendedType: 'same-character',
      reason: '有足够的多义项字符'
    }
  } else {
    return {
      recommendedType: 'different-characters',
      reason: '多义项字符较少'
    }
  }
}
```

### 4. 思维导图模块 (mindmap.ts)

#### 数据结构
```typescript
interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  color?: string
  parentId?: string
  relatedSentenceIds?: string[]
}

interface MindMapData {
  nodes: MindMapNode[]
  articleId: string
  createdAt: number
  updatedAt: number
}
```

#### 核心功能
```typescript
class MindMapService {
  // 创建节点
  createNode(text: string, x: number, y: number): MindMapNode
  
  // 更新节点
  updateNode(id: string, updates: Partial<MindMapNode>): void
  
  // 删除节点
  deleteNode(id: string): void
  
  // 设置父子关系
  setParent(nodeId: string, parentId: string): void
  
  // 关联句子
  linkSentence(nodeId: string, sentenceId: string): void
  
  // 导出为图片
  exportAsImage(): Promise<Blob>
}
```

### 5. AI整理模块 (aiOrganize.ts)

#### 整理流程
```typescript
async function organizeArticle(
  article: Article,
  onProgress?: (stage: string, progress: number) => void
): Promise<MindMapData> {
  // 1. 分析文章结构
  const structure = await analyzeStructure(article)
  
  // 2. 生成节点
  const nodes = await generateNodes(structure)
  
  // 3. 建立关系
  const relationships = await buildRelationships(nodes)
  
  // 4. 关联句子
  const linkedNodes = await linkSentences(nodes, article.sentences)
  
  return {
    nodes: linkedNodes,
    articleId: article.id,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
```

### 6. Word导出模块 (wordExport.ts)

#### 导出功能
```typescript
type ExportVersion = 'teacher' | 'student' | 'both'

async function exportToWord(
  questions: ExamQuestion[],
  version: ExportVersion = 'teacher'
): Promise<Blob> {
  const doc = new Document({
    sections: [{
      children: [
        // 标题
        createTitle(version),
        
        // 题目
        ...questions.map(q => createQuestion(q, version)),
        
        // 答案（仅教师版）
        ...(version === 'teacher' ? createAnswers(questions) : [])
      ]
    }]
  })
  
  return await Packer.toBlob(doc)
}
```

#### 格式处理
- **加点字**: 使用虚线下划线标记
- **答案解析**: 红色粗体显示
- **版本控制**: 
  - 教师版：包含答案和解析
  - 学生版：只有题目
  - 批量导出：同时生成两个版本

### 7. 并发控制模块 (concurrencyConfig.ts)

#### 配置结构
```typescript
interface ConcurrencyConfig {
  global: {
    maxConcurrent: number
    timeout: number
  }
  features: {
    [key: string]: {
      maxConcurrent: number
      timeout: number
    }
  }
}
```

#### 并发管理
```typescript
class ConcurrencyManager {
  private queue: Array<() => Promise<any>> = []
  private running: number = 0
  
  async execute<T>(
    task: () => Promise<T>,
    feature: string
  ): Promise<T> {
    const config = getFeatureConfig(feature)
    
    // 等待队列
    while (this.running >= config.maxConcurrent) {
      await this.waitForSlot()
    }
    
    // 执行任务
    this.running++
    try {
      return await Promise.race([
        task(),
        timeout(config.timeout)
      ])
    } finally {
      this.running--
      this.processQueue()
    }
  }
}
```

### 8. 搜索模块 (search.ts)

#### 搜索算法
```typescript
interface SearchOptions {
  query: string
  types?: Array<'sentence' | 'definition' | 'shortSentence'>
  libraryId?: string
  fuzzy?: boolean
}

function search(options: SearchOptions): SearchResult[] {
  const results: SearchResult[] = []
  
  // 1. 预处理查询
  const normalizedQuery = normalizeQuery(options.query)
  
  // 2. 搜索句子
  if (options.types?.includes('sentence')) {
    results.push(...searchSentences(normalizedQuery, options))
  }
  
  // 3. 搜索义项
  if (options.types?.includes('definition')) {
    results.push(...searchDefinitions(normalizedQuery, options))
  }
  
  // 4. 搜索短句
  if (options.types?.includes('shortSentence')) {
    results.push(...searchShortSentences(normalizedQuery, options))
  }
  
  // 5. 排序和高亮
  return results
    .sort(byRelevance)
    .map(r => highlightMatches(r, normalizedQuery))
}
```

#### 模糊搜索
```typescript
function fuzzyMatch(text: string, query: string): boolean {
  let queryIndex = 0
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      queryIndex++
    }
  }
  return queryIndex === query.length
}
```

## 🔧 关键技术实现

### 1. 流式AI响应处理

#### MiniMax流式响应格式
```typescript
// SSE格式
data: {"choices":[{"delta":{"reasoning_content":"思考过程"}}]}
data: {"choices":[{"delta":{"content":"最终回答"}}]}
data: [DONE]
```

#### 处理逻辑
```typescript
async function handleStreamResponse(response: Response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let reasoningText = ''
  let answerText = ''
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    
    // 处理完整的行
    let newlineIndex
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.substring(0, newlineIndex)
      buffer = buffer.substring(newlineIndex + 1)
      
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') break
        
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta
        
        if (delta?.reasoning_content) {
          reasoningText += delta.reasoning_content
          updateUI(reasoningText, answerText)
        }
        
        if (delta?.content) {
          answerText += delta.content
          updateUI(reasoningText, answerText)
        }
      }
    }
  }
  
  return { reasoningText, answerText }
}
```

### 2. 正则表达式生成

#### Prompt工程
```typescript
const prompt = `你是一个正则表达式专家。用户需要一个正则表达式来实现以下需求：

${requirement}

请严格按照以下格式回复：

方法说明：
[详细说明实现思路和方法]

正则表达式：
[单独一行写出正则表达式代码]

要求：
1. 正则表达式必须单独成行
2. 要准确可用，可以直接在JavaScript中使用
3. 选择最简洁高效的实现
4. 考虑边界情况和特殊字符`
```

#### 解析响应
```typescript
function parseRegexResponse(content: string): {
  method: string
  regex: string
} {
  // 提取方法说明
  const methodMatch = content.match(
    /方法说明[：:]\s*([\s\S]*?)(?=正则表达式[：:]|$)/i
  )
  const method = methodMatch?.[1].trim() || ''
  
  // 提取正则表达式
  const regexMatch = content.match(
    /正则表达式[：:]\s*\n?(.+?)(?:\n|$)/i
  )
  let regex = regexMatch?.[1].trim() || ''
  
  // 清理格式符号
  regex = regex.replace(/^[`'"]+|[`'"]+$/g, '')
  if (regex.startsWith('/') && regex.includes('/')) {
    const lastSlash = regex.lastIndexOf('/')
    regex = regex.substring(1, lastSlash)
  }
  
  return { method, regex }
}
```

### 3. 思维导图渲染

#### Canvas绘制
```typescript
function renderMindMap(
  canvas: HTMLCanvasElement,
  nodes: MindMapNode[]
) {
  const ctx = canvas.getContext('2d')
  
  // 1. 绘制连线
  nodes.forEach(node => {
    if (node.parentId) {
      const parent = nodes.find(n => n.id === node.parentId)
      if (parent) {
        drawLine(ctx, parent, node)
      }
    }
  })
  
  // 2. 绘制节点
  nodes.forEach(node => {
    drawNode(ctx, node)
  })
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: MindMapNode
) {
  // 绘制圆形背景
  ctx.beginPath()
  ctx.arc(node.x, node.y, 30, 0, Math.PI * 2)
  ctx.fillStyle = node.color || '#4ECDC4'
  ctx.fill()
  
  // 绘制文字
  ctx.fillStyle = 'white'
  ctx.font = '16px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(node.text, node.x, node.y)
}
```

#### 拖拽交互
```typescript
function handleDrag(
  canvas: HTMLCanvasElement,
  nodes: MindMapNode[]
) {
  let draggedNode: MindMapNode | null = null
  let offsetX = 0
  let offsetY = 0
  
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    draggedNode = findNodeAt(nodes, x, y)
    if (draggedNode) {
      offsetX = x - draggedNode.x
      offsetY = y - draggedNode.y
    }
  })
  
  canvas.addEventListener('mousemove', (e) => {
    if (draggedNode) {
      const rect = canvas.getBoundingClientRect()
      draggedNode.x = e.clientX - rect.left - offsetX
      draggedNode.y = e.clientY - rect.top - offsetY
      renderMindMap(canvas, nodes)
    }
  })
  
  canvas.addEventListener('mouseup', () => {
    draggedNode = null
  })
}
```

### 4. 数据导入导出

#### 导出JSON
```typescript
function exportData(): string {
  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    libraries: storage.getLibraries(),
    definitions: storage.getDefinitions(),
    links: storage.getCharacterDefinitionLinks(),
    shortSentences: storage.getShortSentences(),
    mindMaps: storage.getMindMaps()
  }
  
  return JSON.stringify(data, null, 2)
}
```

#### 导入JSON
```typescript
async function importData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString)
  
  // 验证版本
  if (!data.version || data.version !== '1.0.0') {
    throw new Error('不支持的数据版本')
  }
  
  // 清空现有数据
  await storage.clear()
  
  // 导入数据
  data.libraries.forEach(lib => storage.importLibrary(lib))
  data.definitions.forEach(def => storage.importDefinition(def))
  data.links.forEach(link => storage.importLink(link))
  data.shortSentences.forEach(ss => storage.importShortSentence(ss))
  data.mindMaps.forEach(mm => storage.importMindMap(mm))
  
  // 保存
  await storage.saveToLocal()
}
```

## 🧪 测试

### 单元测试
```typescript
// examGenerator.test.ts
describe('ExamGenerator', () => {
  it('should generate questions with correct structure', () => {
    const questions = generator.generateExam(config)
    
    expect(questions).toHaveLength(config.questionCount)
    questions.forEach(q => {
      expect(q.options).toHaveLength(config.optionsCount)
      expect(q.correctAnswer).toMatch(/^[A-D]$/)
    })
  })
  
  it('should respect target characters', () => {
    const config = {
      ...baseConfig,
      targetCharacters: ['学', '而']
    }
    
    const questions = generator.generateExam(config)
    const characters = questions.map(q => q.character)
    
    expect(characters).toContain('学')
    expect(characters).toContain('而')
  })
})
```

### 集成测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test examGenerator

# 生成覆盖率报告
npm test -- --coverage
```

## 🚀 部署

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动Electron
npm run electron:dev
```

### 生产构建
```bash
# 构建Next.js应用
npm run build

# 打包Electron应用
npm run electron:build

# 输出目录
dist/
├── win-unpacked/     # Windows可执行文件
├── mac/              # macOS应用
└── linux-unpacked/   # Linux可执行文件
```

## 🔒 安全考虑

### API密钥保护
- 不在代码中硬编码API密钥
- 使用环境变量或配置文件
- 加密存储敏感信息

### 数据安全
- 本地存储，不上传云端
- 支持数据导出备份
- 定期清理临时数据

### XSS防护
- 使用React的自动转义
- 避免使用dangerouslySetInnerHTML
- 验证用户输入

## 📊 性能优化

### 1. 数据加载优化
- 懒加载大型数据集
- 使用虚拟滚动处理长列表
- 缓存常用数据

### 2. 渲染优化
- 使用React.memo减少重渲染
- 合理使用useMemo和useCallback
- 避免在渲染中进行复杂计算

### 3. AI请求优化
- 实现请求队列和并发控制
- 添加请求缓存
- 实现自动重试机制

## 🐛 调试技巧

### 开发者工具
```typescript
// 启用详细日志
localStorage.setItem('DEBUG', 'true')

// 查看存储数据
console.log(storage.getLibraries())

// 清空数据
storage.clear()
```

### 常见问题排查
1. **数据丢失**: 检查LocalStorage容量限制
2. **AI请求失败**: 检查网络和API配额
3. **性能问题**: 使用Chrome DevTools分析

## 📝 开发规范

### 代码风格
- 使用TypeScript严格模式
- 遵循ESLint规则
- 使用Prettier格式化代码

### 命名规范
- 组件: PascalCase (e.g., `MindMapCanvas`)
- 函数: camelCase (e.g., `generateExam`)
- 常量: UPPER_SNAKE_CASE (e.g., `MAX_CONCURRENT`)
- 文件: kebab-case (e.g., `exam-generator.ts`)

### Git提交规范
```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建/工具变动
```

## 🔄 版本历史

### v1.0.0 (2024)
- ✅ 基础导入导出功能
- ✅ 思维导图整理
- ✅ AI辅助整理
- ✅ 自动出题功能
- ✅ 义项管理
- ✅ 正则生成器
- ✅ 并发控制
- ✅ Word导出（教师版/学生版）

## 📚 参考资料

- [Next.js文档](https://nextjs.org/docs)
- [React文档](https://react.dev)
- [Electron文档](https://www.electronjs.org/docs)
- [docx.js文档](https://docx.js.org)
- [MiniMax API文档](https://api.minimax.chat/document)

---

**维护者**: 开发团队  
**最后更新**: 2024年
