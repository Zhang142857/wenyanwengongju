# 查字页面UI优化说明

## 优化内容

### 1. 全新的两行布局
**第一行：**
- 搜索输入框（占左侧 1/3）
- 筛选器组（库、集、文章）
- 搜索按钮

**第二行：**
- 高级匹配选项
- 当前筛选条件显示

### 2. 统一控件尺寸
- 所有控件统一高度为 48px
- 边框宽度统一为 2px
- 圆角统一为 12px
- 最小宽度 140px（筛选器）

### 3. 优化视觉效果
- 更大的字体：1rem（搜索框和按钮）、0.95rem（筛选器）
- 更明显的边框：`2px solid rgba(255, 255, 255, 0.4)`
- 更好的内边距：水平 1.25rem
- 更大的间距：控件间 1rem，筛选器间 0.75rem

### 4. 改进的布局结构
- 使用 Grid 布局实现第一行的精确控制
- 搜索框占 35% 宽度（最小 250px）
- 筛选器自动填充剩余空间
- 搜索按钮固定在右侧

### 5. 响应式设计
- 1200px 以下：搜索框占 30%
- 900px 以下：切换为垂直堆叠
  - 搜索框
  - 筛选器组
  - 搜索按钮（全宽）
  - 高级选项和筛选条件（垂直排列）

## 修改的文件

1. `src/components/SearchPage.tsx` - 重构布局结构
2. `src/components/SearchPage.module.css` - 新增两行布局样式
3. `src/components/FilterPanel.module.css` - 适配新布局
4. `src/components/CustomSelect.module.css` - 增大控件尺寸
5. `src/components/CustomMultiSelect.module.css` - 增大控件尺寸
6. `src/components/AdvancedMatchMenu.module.css` - 增大控件尺寸
7. `src/components/ActiveFiltersIndicator.module.css` - 适配第二行布局

## 效果

- ✅ 更清晰的视觉层次
- ✅ 更合理的空间利用
- ✅ 更大的可点击区域
- ✅ 更好的信息组织
- ✅ 更流畅的操作体验
