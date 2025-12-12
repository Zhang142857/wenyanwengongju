# Requirements Document

## Introduction

本文档定义了自动出题功能的全面升级改造需求规范。升级内容包括：考察范围选择器改造为动态图表形式、加权随机系统整合、AI加权功能改进、重点字加权系统改造，以及统一的权重分配逻辑。核心目标是提供直观的可视化权重编辑体验，实现文章、义项、考察字的统一加权管理。

## Glossary

- **System**: 自动出题系统
- **考察范围**: 用户选择的文章集合，用于限定出题数据来源
- **权重编辑器**: 用于可视化编辑各项权重的图表组件
- **权重曲线**: 由文章节点连线形成的权重分布可视化曲线
- **重点字**: 用户指定的需要重点考察的字符
- **其他字**: 非重点字的所有可考察字符
- **加权设置对话框**: 原高级选项对话框，更名后专门用于权重相关设置
- **义项**: 文言文中某个字的具体含义解释
- **AI加权调整**: 使用AI服务自动调整权重分配的功能

## Requirements

### Requirement 1

**User Story:** 作为教师，我希望通过动态图表形式选择考察范围并调整文章权重，以便直观地控制各文章在出题中的比重。

#### Acceptance Criteria

1. WHEN 用户打开考察范围选择器时 THEN System SHALL 显示横轴为文章列表、纵轴为权重值的动态图表
2. WHEN 用户在图表横轴上拖拽选择时 THEN System SHALL 将拖拽范围内的文章添加到考察范围
3. WHEN 用户拖动文章节点时 THEN System SHALL 实时更新该文章的权重值并重绘权重曲线
4. WHEN 用户添加额外文章到考察范围时 THEN System SHALL 在图表中显示新增文章节点并自动连线
5. WHEN 文章权重发生变化时 THEN System SHALL 自动重新计算并显示节点间的权重曲线

### Requirement 2

**User Story:** 作为教师，我希望在统一的加权设置中管理文章、义项和考察字的权重，以便集中控制出题的随机分布。

#### Acceptance Criteria

1. WHEN 用户打开加权设置对话框时 THEN System SHALL 显示文章权重、义项权重和考察字权重的统一编辑界面
2. WHEN 用户在加权设置对话框中修改权重时 THEN System SHALL 将修改同步到自动出题页面的权重编辑器
3. WHEN 用户在自动出题页面修改权重时 THEN System SHALL 将修改同步到加权设置对话框
4. WHEN System 加载页面时 THEN System SHALL 从统一的权重配置存储中读取所有加权数据
5. WHEN 用户保存权重设置时 THEN System SHALL 将文章、义项、考察字的权重数据持久化到统一存储

### Requirement 3

**User Story:** 作为教师，我希望使用AI自动调整权重设置，以便快速获得合理的权重分配方案。

#### Acceptance Criteria

1. WHEN 用户点击单个选项的AI调整按钮时 THEN System SHALL 调用AI服务为该选项生成权重建议
2. WHEN 用户点击批量AI调整按钮时 THEN System SHALL 调用AI服务为所有选项生成权重建议
3. WHEN AI返回权重建议时 THEN System SHALL 在界面上显示建议值供用户确认
4. WHEN 用户确认AI建议时 THEN System SHALL 将建议的权重值应用到对应选项
5. WHEN AI调整请求失败时 THEN System SHALL 显示错误信息并保持原有权重值不变

### Requirement 4

**User Story:** 作为教师，我希望为重点字设置权重并自动分配剩余权重给其他字，以便精确控制重点字的考察概率。

#### Acceptance Criteria

1. WHEN 用户设定重点字时 THEN System SHALL 在加权编辑器中显示每个重点字的独立权重值
2. WHEN 用户调整重点字权重时 THEN System SHALL 自动计算并显示"其他字"的剩余权重
3. WHEN 所有重点字权重总和小于100%时 THEN System SHALL 将剩余权重分配给"其他字"项
4. WHEN 用户将"其他字"权重设为0时 THEN System SHALL 仅使用重点字生成题目
5. WHEN 重点字权重总和等于100%时 THEN System SHALL 自动将"其他字"权重设为0

### Requirement 5

**User Story:** 作为教师，我希望"其他字"在分配到权重时采用完全随机机制，以便在保证重点字优先的同时保持题目多样性。

#### Acceptance Criteria

1. WHEN "其他字"权重大于0时 THEN System SHALL 在该权重范围内对非重点字采用均匀随机选择
2. WHEN 生成题目时 THEN System SHALL 按照重点字权重和"其他字"权重的比例分配题目数量
3. WHEN 重点字数量不足以满足其权重比例时 THEN System SHALL 将多余权重转移给"其他字"
4. WHEN "其他字"权重为0且重点字不足时 THEN System SHALL 显示数据不足的错误提示

### Requirement 6

**User Story:** 作为教师，我希望权重编辑器提供实时可视化反馈，以便清晰了解当前的权重分配状态。

#### Acceptance Criteria

1. WHEN 用户调整任意权重值时 THEN System SHALL 在200毫秒内更新可视化显示
2. WHEN 权重分配发生变化时 THEN System SHALL 显示各项权重的百分比和绝对值
3. WHEN 权重总和不等于100%时 THEN System SHALL 显示警告提示并标记异常项
4. WHEN 用户悬停在权重节点上时 THEN System SHALL 显示该项的详细权重信息

### Requirement 7

**User Story:** 作为开发者，我希望系统具备统一的权重计算模型和数据同步机制，以便确保各组件间数据一致性。

#### Acceptance Criteria

1. WHEN 任意组件修改权重数据时 THEN System SHALL 通过统一的权重计算模型重新计算所有相关权重
2. WHEN 权重数据发生变化时 THEN System SHALL 在100毫秒内同步到所有订阅该数据的组件
3. WHEN System 序列化权重配置时 THEN System SHALL 使用JSON格式存储所有权重数据
4. WHEN System 反序列化权重配置时 THEN System SHALL 还原与序列化前相同的权重状态
