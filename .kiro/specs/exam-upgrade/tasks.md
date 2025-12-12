# Implementation Plan

- [x] 1. 搭建权重系统基础架构




  - [x] 1.1 创建统一权重配置类型定义


    - 在 `src/types/weight.ts` 中定义 ArticleWeight、CharacterWeight、UnifiedWeightConfig 接口
    - 定义 ValidationResult 接口
    - _Requirements: 2.1, 7.1_

  - [x] 1.2 实现权重计算器 (WeightCalculator)


    - 创建 `src/services/weightCalculator.ts`
    - 实现 calculateOtherCharactersWeight 方法
    - 实现 validateWeights 方法
    - 实现 selectCharacterByWeight 方法
    - 实现 calculateQuestionDistribution 方法
    - _Requirements: 4.2, 4.3, 5.1, 5.2, 7.1_

  - [x] 1.3 编写权重自动计算属性测试


    - **Property 8: 重点字权重自动计算**
    - **Validates: Requirements 4.2, 4.3, 4.5**

  - [x] 1.4 实现权重存储服务 (WeightStorage)


    - 创建 `src/services/weightStorage.ts`
    - 实现 JSON 序列化/反序列化
    - 实现 LocalStorage 持久化
    - _Requirements: 2.4, 2.5, 7.3, 7.4_

  - [x] 1.5 编写序列化Round-Trip属性测试


    - **Property 4: 权重配置序列化Round-Trip**
    - **Validates: Requirements 2.4, 2.5, 7.3, 7.4**

- [x] 2. Checkpoint - 确保基础架构测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. 实现权重状态管理





  - [x] 3.1 创建 Zustand 权重状态 Store


    - 创建 `src/stores/weightStore.ts`
    - 实现文章权重操作方法
    - 实现重点字权重操作方法
    - 实现配置管理方法
    - _Requirements: 2.2, 2.3, 7.1_


  - [x] 3.2 编写双向数据同步属性测试

    - **Property 3: 双向数据同步**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 3.3 实现权重事件总线 (WeightEventBus)


    - 创建 `src/services/weightEventBus.ts`
    - 实现订阅/发布机制
    - 确保100ms内同步到所有订阅组件
    - _Requirements: 2.2, 2.3, 7.2_


  - [x] 3.4 编写统一权重计算模型属性测试

    - **Property 13: 统一权重计算模型**
    - **Validates: Requirements 7.1**

- [x] 4. 实现动态图表组件


  - [x] 4.1 创建文章权重图表组件 (ArticleWeightChart)


    - 创建 `src/components/ArticleWeightChart.tsx`
    - 实现横轴文章列表显示
    - 实现纵轴权重值显示
    - 实现节点拖拽调整权重
    - 实现权重曲线绑定
    - _Requirements: 1.1, 1.3, 1.5_


  - [x] 4.2 编写权重更新一致性属性测试

    - **Property 2: 权重更新一致性**
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [x] 4.3 实现拖拽范围选择功能


    - 在图表横轴上支持拖拽选择文章范围
    - 将选中范围内的文章添加到考察范围
    - _Requirements: 1.2_


  - [x] 4.4 编写拖拽范围选择属性测试

    - **Property 1: 拖拽范围选择正确性**
    - **Validates: Requirements 1.2**


  - [x] 4.5 实现添加额外文章功能

    - 支持在图表中添加额外文章节点
    - 自动连线形成权重曲线
    - _Requirements: 1.4_

- [x] 5. Checkpoint - 确保图表组件测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. 实现重点字权重编辑器



  - [x] 6.1 创建重点字权重编辑组件 (CharacterWeightEditor)

    - 创建 `src/components/CharacterWeightEditor.tsx`
    - 显示每个重点字的独立权重值
    - 显示"其他字"权重项
    - 实现权重滑块/输入控件
    - _Requirements: 4.1, 4.2, 6.2_


  - [x] 6.2 实现权重自动计算逻辑

    - 当重点字权重变化时自动计算"其他字"权重
    - 当重点字权重总和达到100%时自动将"其他字"设为0
    - _Requirements: 4.2, 4.3, 4.5_


  - [x] 6.3 实现权重验证和警告显示

    - 当权重总和不等于100%时显示警告
    - 标记异常项
    - _Requirements: 6.3_


  - [x] 6.4 编写权重显示完整性属性测试

    - **Property 12: 权重显示完整性**
    - **Validates: Requirements 6.2, 6.3**

- [x] 7. 实现加权设置对话框


  - [x] 7.1 创建加权设置对话框组件 (WeightSettingsDialog)


    - 创建 `src/components/WeightSettingsDialog.tsx`
    - 整合文章权重图表
    - 整合重点字权重编辑器
    - 移除原"包含之前的知识"选项
    - _Requirements: 2.1_


  - [x] 7.2 实现与自动出题页面的数据同步
    - 使用 WeightStore 实现双向同步
    - 确保两个编辑器数据一致
    - _Requirements: 2.2, 2.3_

- [x] 8. Checkpoint - 确保UI组件测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. 实现AI权重调整功能


  - [x] 9.1 创建AI权重调整服务 (AIWeightService)

    - 创建 `src/services/aiWeightService.ts`
    - 定义 AIWeightRequest 和 AIWeightResult 接口
    - 实现 adjustWeight 方法
    - _Requirements: 3.1, 3.2_


  - [x] 9.2 编写AI请求参数完整性属性测试
    - **Property 5: AI请求参数完整性**
    - **Validates: Requirements 3.1, 3.2**


  - [x] 9.3 实现单个选项AI调整
    - 在权重编辑器中添加单个AI调整按钮
    - 调用AI服务生成权重建议
    - _Requirements: 3.1_


  - [x] 9.4 实现批量AI调整
    - 添加批量AI调整按钮
    - 为所有选项生成权重建议
    - _Requirements: 3.2_


  - [x] 9.5 实现AI建议确认和应用
    - 显示AI建议值供用户确认
    - 确认后应用建议的权重值

    - _Requirements: 3.3, 3.4_

  - [x] 9.6 编写AI结果应用属性测试

    - **Property 6: AI结果应用正确性**
    - **Validates: Requirements 3.3, 3.4**

  - [x] 9.7 实现AI错误处理

    - 请求失败时显示错误信息
    - 保持原有权重值不变
    - _Requirements: 3.5_

  - [x] 9.8 编写AI错误处理属性测试
    - **Property 7: AI错误处理保持原值**
    - **Validates: Requirements 3.5**

- [x] 10. Checkpoint - 确保AI功能测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. 修改出题生成器支持新权重系统


  - [x] 11.1 修改 ExamGenerator 支持重点字权重

    - 根据重点字权重和"其他字"权重分配题目
    - 实现加权随机选择逻辑
    - _Requirements: 5.1, 5.2_


  - [x] 11.2 编写题目分配比例属性测试
    - **Property 10: 题目分配比例**
    - **Validates: Requirements 5.1, 5.2, 5.3**


  - [x] 11.3 实现仅重点字出题模式
    - 当"其他字"权重为0时只使用重点字
    - _Requirements: 4.4_


  - [x] 11.4 编写仅重点字出题属性测试
    - **Property 9: 仅重点字出题**
    - **Validates: Requirements 4.4**


  - [x] 11.5 实现数据不足错误处理
    - 当重点字不足时将多余权重转移给"其他字"
    - 当"其他字"权重为0且重点字不足时显示错误
    - _Requirements: 5.3, 5.4_


  - [x] 11.6 编写数据不足错误处理属性测试
    - **Property 11: 数据不足错误处理**
    - **Validates: Requirements 5.4**

- [x] 12. 集成到自动出题页面



  - [x] 12.1 更新 ExamPage 集成新权重系统



    - 替换原有的考察范围选择器为动态图表
    - 集成重点字权重编辑器
    - 添加"加权设置"按钮打开对话框
    - _Requirements: 1.1, 2.1, 6.1_


  - [ ] 12.2 实现实时可视化反馈
    - 权重调整后200ms内更新显示
    - 显示各项权重的百分比和绝对值
    - _Requirements: 6.1, 6.2_


  - [x] 12.3 移除原高级选项对话框中的非加权选项
    - 将"高级选项"更名为"加权设置"
    - 移除"包含之前的知识"选项
    - _Requirements: 2.1_

- [x] 13. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
