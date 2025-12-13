# 配置指南

本文档介绍如何配置文言文学习助手的各项功能。

## 目录

- [快速开始](#快速开始)
- [AI API 配置](#ai-api-配置)
- [配置文件详解](#配置文件详解)
- [常见问题](#常见问题)

## 快速开始

### 1. 基础使用（无需 API）

即使不配置 AI API，你也可以使用以下功能：
- 文本导入和管理
- 手动编辑义项和短句
- 搜索和查询
- 自动出题（基于已有数据）
- 思维导图手动编辑

### 2. 启用 AI 功能

要使用 AI 相关功能，需要配置 API：

```bash
# 复制配置模板
cp config.example.json config/app-config.json

# 编辑配置文件
# Windows: notepad config/app-config.json
# Mac/Linux: nano config/app-config.json
```

## AI API 配置

### 支持的 API 提供商

#### 1. SiliconFlow（硅基流动）- 推荐

国内服务，注册送额度，部分模型免费。

```json
{
  "ai": {
    "configGroups": [
      {
        "id": "siliconflow",
        "name": "硅基流动",
        "provider": "siliconflow",
        "baseUrl": "https://api.siliconflow.cn/v1",
        "apiKeys": ["sk-your-api-key"],
        "model": "Qwen/Qwen2.5-7B-Instruct",
        "isThinkingModel": false
      }
    ],
    "activeGroupId": "siliconflow"
  }
}
```

推荐模型：
- `Qwen/Qwen2.5-7B-Instruct` - 免费，速度快
- `deepseek-ai/DeepSeek-V2.5` - 效果好
- `zai-org/GLM-4.6` - 思考模型，质量高

#### 2. DeepSeek

国产大模型，价格低廉，中文效果好。

```json
{
  "ai": {
    "configGroups": [
      {
        "id": "deepseek",
        "name": "DeepSeek",
        "provider": "deepseek",
        "baseUrl": "https://api.deepseek.com/v1",
        "apiKeys": ["sk-your-api-key"],
        "model": "deepseek-chat",
        "isThinkingModel": false
      }
    ],
    "activeGroupId": "deepseek"
  }
}
```

#### 3. OpenAI

```json
{
  "ai": {
    "configGroups": [
      {
        "id": "openai",
        "name": "OpenAI",
        "provider": "openai",
        "baseUrl": "https://api.openai.com/v1",
        "apiKeys": ["sk-your-api-key"],
        "model": "gpt-3.5-turbo",
        "isThinkingModel": false
      }
    ],
    "activeGroupId": "openai"
  }
}
```

#### 4. 其他兼容 OpenAI API 的服务

只要兼容 OpenAI API 格式，都可以使用：
- Azure OpenAI
- Claude (通过兼容层)
- 本地部署的 LLM (如 Ollama)

### 多 API 轮询

支持配置多个 API Key 进行轮询，提高并发能力：

```json
{
  "apiKeys": [
    "sk-key1",
    "sk-key2",
    "sk-key3"
  ]
}
```

### 并发配置

```json
{
  "concurrency": {
    "aiDefinitionConcurrency": 10,
    "shortSentenceConcurrency": 10,
    "batchDelayMs": 100,
    "retryDelayMs": 500
  }
}
```

| 参数 | 说明 | 建议值 |
|------|------|--------|
| `aiDefinitionConcurrency` | AI 生成义项的并发数 | 5-20 |
| `shortSentenceConcurrency` | 短句处理的并发数 | 5-20 |
| `batchDelayMs` | 批次间延迟（毫秒） | 100-500 |
| `retryDelayMs` | 重试延迟（毫秒） | 500-1000 |

## 配置文件详解

### 完整配置示例

```json
{
  "version": "1.0.0",
  "edition": "opensource",
  "ai": {
    "configGroups": [...],
    "activeGroupId": "default",
    "concurrency": {...}
  },
  "libraries": {
    "defaultLibraries": [],
    "focusWords": "常用文言虚词...",
    "keyCharacters": []
  },
  "system": {
    "appTitle": "文言文小工具",
    "enableTour": true,
    "theme": "gradient"
  },
  "features": {
    "enableAIOrganize": true,
    "enableExam": true,
    "enableRegexGenerator": true,
    "enableImport": true,
    "enableManage": true
  }
}
```

### 配置项说明

#### `ai` - AI 配置
- `configGroups`: API 配置组数组
- `activeGroupId`: 当前激活的配置组 ID
- `concurrency`: 并发设置

#### `libraries` - 库配置
- `defaultLibraries`: 默认加载的库
- `focusWords`: 重点关注的文言虚词
- `keyCharacters`: 重点字符列表

#### `system` - 系统配置
- `appTitle`: 应用标题
- `enableTour`: 是否启用新手引导
- `theme`: 主题设置

#### `features` - 功能开关
- `enableAIOrganize`: AI 整理功能
- `enableExam`: 出题功能
- `enableRegexGenerator`: 正则生成器
- `enableImport`: 导入功能
- `enableManage`: 管理功能

## 常见问题

### Q: API 调用失败怎么办？

1. 检查 API Key 是否正确
2. 检查网络连接
3. 确认 API 余额是否充足
4. 查看控制台错误信息

### Q: 如何提高处理速度？

1. 增加 `concurrency` 中的并发数
2. 使用多个 API Key 轮询
3. 选择响应更快的模型

### Q: 配置文件在哪里？

- 开发模式：项目根目录 `config/app-config.json`
- 安装版本：`%APPDATA%/文言文查询/config/app-config.json`

### Q: 如何重置配置？

删除 `config/app-config.json` 文件，应用会使用默认配置。

### Q: 支持哪些模型？

理论上支持所有兼容 OpenAI Chat Completions API 的模型。推荐使用：
- 通用任务：Qwen、DeepSeek、GPT-3.5
- 高质量输出：GPT-4、Claude、DeepSeek-R1
- 思考模型：GLM-4.6、DeepSeek-R1（设置 `isThinkingModel: true`）
