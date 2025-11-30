# MiniMax-M2 API 配置指南

## 概述

系统已升级为使用 **MiniMax-M2** 推理模型（通过硅基流动），这是一个高性能的推理模型，速度快且质量好。

## 当前配置

### 主要模型：MiniMax-M2
- **提供商**：硅基流动（代理MiniMax）
- **模型**：MiniMaxAI/MiniMax-M2（推理模型）
- **特点**：速度快、推理能力强、适合文言文处理
- **用途**：
  - AI义项生成
  - 短句提取
- **优势**：无需单独的MiniMax账户，直接使用硅基流动API

## 配置位置

### 1. AI服务配置 (`src/services/ai.ts`)
```typescript
// 硅基流动 API - 使用MiniMax-M2模型
const ALL_API_CONFIGS: ApiConfig[] = [
  {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-xxxxx',  // 硅基流动API Key
    model: 'MiniMaxAI/MiniMax-M2',
    provider: 'siliconflow',
  },
  // ... 更多API Key
]
```

### 2. 短句服务配置 (`src/services/shortSentence.ts`)
```typescript
// 硅基流动 API - 使用MiniMax-M2模型
const API_BASE_URL = 'https://api.siliconflow.cn/v1';
const MODEL = 'MiniMaxAI/MiniMax-M2';

const API_KEYS = [
  'sk-xxxxx',  // 硅基流动API Key
  // ... 更多API Key
];
```

## 如何获取API Key

### 方式1：使用硅基流动（推荐）
1. 访问 [硅基流动官网](https://www.siliconflow.cn/)
2. 注册账户
3. 进入控制台获取API Key
4. 复制API Key到配置文件

### 方式2：使用MiniMax官方API（可选）
1. 访问 [MiniMax官网](https://www.minimaxi.com/)
2. 注册账户
3. 创建API Key
4. 需要修改代码以支持MiniMax官方API

## 更新API Key

### 方法1：直接编辑源代码
编辑以下文件中的API Key：
- `src/services/ai.ts` - 第16-42行
- `src/services/shortSentence.ts` - 第8-14行

### 方法2：使用环境变量（推荐）
创建 `.env.local` 文件：
```
NEXT_PUBLIC_SILICONFLOW_API_KEYS=sk-xxxxx,sk-yyyyy,sk-zzzzz
```

然后在代码中使用：
```typescript
const API_KEYS = (process.env.NEXT_PUBLIC_SILICONFLOW_API_KEYS || '').split(',');
```

## 性能对比

| 指标 | MiniMax-M2 | GLM-4.5-Air | DeepSeek-V3 |
|------|-----------|------------|------------|
| 速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 推理能力 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 文言文处理 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 成本 | 低 | 低 | 低 |

## 故障排查

### 问题1：API 返回错误
**解决方案**：
1. 检查API Key是否正确
2. 检查API配额是否充足
3. 查看控制台日志获取详细错误信息

### 问题2：请求超时
**解决方案**：
1. 检查网络连接
2. 增加超时时间
3. 减少并发数（在"⚙️ 设置"中调整）

### 问题3：生成质量不佳
**解决方案**：
1. 调整温度参数（temperature）
2. 增加max_tokens
3. 优化提示词

## 并发参数建议

对于MiniMax-M2模型，建议配置：
- **AI义项生成并发数**：4-6（MiniMax速度快，可以提高并发）
- **短句生成并发数**：12-16
- **批次间延迟**：100-200ms
- **重试延迟**：300-500ms

在管理页面的"⚙️ 设置"中可以动态调整这些参数。

## 监控和日志

系统会在控制台输出以下日志：
```
[AI请求] 使用: minimax - MiniMax-M2
[短句生成] 使用 MiniMax-M2 模型
```

如果切换到备用方案：
```
[短句生成] MiniMax 请求失败，尝试硅基流动备用方案
[短句生成] 使用硅基流动备用方案
```

## 成本估算

假设每月处理10000个句子（通过硅基流动）：
- **MiniMax-M2**：约 ¥20-50
- **GLM-4.5-Air**：约 ¥10-30
- **DeepSeek-V3**：约 ¥15-40

## 更新日志

### v1.0 (当前)
- ✅ 集成MiniMax-M2模型
- ✅ 自动故障转移到硅基流动
- ✅ 支持动态并发参数调整
- ✅ 完整的日志和监控

## 相关文档

- [MiniMax API文档](https://www.minimaxi.com/docs)
- [硅基流动API文档](https://docs.siliconflow.cn/)
- [并发参数调整指南](./CONCURRENCY_SETTINGS.md)
