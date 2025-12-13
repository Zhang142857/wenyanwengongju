/**
 * 准备开源版本的脚本
 * 用于从私有仓库生成干净的开源版本
 */

const fs = require('fs');
const path = require('path');

// 需要排除的文件和目录（敏感数据或内部文件）
const EXCLUDE_FILES = [
  // 包含 API 密钥的配置文件
  'config/app-config.json',
  'config.default.json',
  'config-custom-*.json',
  
  // 内部文档
  '打包命令.md',
  '打包说明.md',
  '打包完成.txt',
  '打包完成说明.md',
  '打包完成说明_v1.0.0.md',
  '打包InnoSetup.bat',
  '发布新版本.bat',
  '发布新版本指南.md',
  '发布指南.md',
  '开始打包.txt',
  '每日一言.txt',
  '一键打包.bat',
  '自动发布系统说明.md',
  
  // 临时文件
  'temp_icon_base64.txt',
  'icon_backup.png',
  'DM_*.png',
  'example.docx',
  
  // IDE 和编辑器配置
  '.vscode/',
  '.kiro/',
  
  // 构建产物
  'dist/',
  'build/',
  'out/',
  '.next/',
  'node_modules/',
  
  // 缓存
  'cache/',
  'temp/',
];

// 需要包含的文件（即使在排除目录中）
const INCLUDE_FILES = [
  'config/libraries.json',
  'config/README.md',
];

// 需要重命名的文件
const RENAME_FILES = {
  'config.example.json': 'config.default.json',
};

console.log('=== 开源版本准备脚本 ===\n');
console.log('此脚本用于生成开源版本的文件清单。');
console.log('实际操作请手动执行或使用 GitHub Actions。\n');

console.log('需要排除的文件/目录:');
EXCLUDE_FILES.forEach(f => console.log(`  - ${f}`));

console.log('\n需要保留的文件:');
INCLUDE_FILES.forEach(f => console.log(`  + ${f}`));

console.log('\n需要重命名的文件:');
Object.entries(RENAME_FILES).forEach(([from, to]) => {
  console.log(`  ${from} -> ${to}`);
});

console.log('\n建议的 .gitignore 添加项（用于开源仓库）:');
console.log(`
# 用户配置（包含 API 密钥）
config/app-config.json
config-custom-*.json

# 保留示例配置
!config.example.json
!config.default.json
`);
