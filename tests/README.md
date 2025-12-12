# 测试目录

本目录包含项目的所有测试文件。

## 目录结构

```
tests/
├── unit/           # 单元测试
├── integration/    # 集成测试
├── e2e/           # 端到端测试
└── fixtures/      # 测试数据和模拟数据
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

## 测试框架

- **Vitest** - 单元测试和集成测试
- **@testing-library/react** - React 组件测试

## 编写测试

### 单元测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/utils/myFunction';

describe('myFunction', () => {
  it('should return expected result', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### 组件测试示例

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from '../src/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## 测试覆盖率目标

- 语句覆盖率: > 80%
- 分支覆盖率: > 70%
- 函数覆盖率: > 80%
- 行覆盖率: > 80%
