#!/usr/bin/env node
/**
 * 同步到开源仓库的脚本
 * 
 * 功能：
 * 1. 复制源代码到开源目录
 * 2. 排除敏感文件
 * 3. 替换配置文件为示例版本
 * 4. 更新 README
 * 
 * 使用方法：
 *   node scripts/sync-to-opensource.js <目标目录>
 * 
 * 示例：
 *   node scripts/sync-to-opensource.js ../wenyanwen-opensource
 */

const fs = require('fs');
const path = require('path');

// 需要排除的文件和目录
const EXCLUDE_PATTERNS = [
  // Git 和 IDE
  '.git',
  '.vscode',
  '.kiro',
  'node_modules',
  
  // 构建产物
  '.next',
  'out',
  'dist',
  'build',
  
  // 敏感配置文件（包含 API 密钥）
  'config/app-config.json',
  'config\\app-config.json',
  'config.default.json',
  /^config-custom-.*\.json$/,
  /app-config\.json$/,
  
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
  /^DM_.*\.png$/,
  'example.docx',
  
  // 缓存
  'cache',
  'temp',
  
  // 同步脚本自身
  'scripts/sync-to-opensource.js',
  'scripts/prepare-opensource.js',
  'docs/opensource',
];

// 需要特殊处理的文件
const SPECIAL_FILES = {
  // 使用开源版 README
  'README.md': 'docs/opensource/README.opensource.md',
  // 使用开源版 .gitignore
  '.gitignore': 'docs/opensource/.gitignore.opensource',
};

// 需要添加的文件
const ADD_FILES = {
  'docs/SETUP.md': 'docs/opensource/SETUP.md',
};

function shouldExclude(relativePath) {
  const fileName = path.basename(relativePath);
  
  for (const pattern of EXCLUDE_PATTERNS) {
    if (typeof pattern === 'string') {
      if (relativePath === pattern || relativePath.startsWith(pattern + '/') || relativePath.startsWith(pattern + '\\')) {
        return true;
      }
      if (fileName === pattern) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(fileName)) {
        return true;
      }
    }
  }
  return false;
}

function copyDir(src, dest, baseDir = src) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relativePath = path.relative(baseDir, srcPath);
    
    if (shouldExclude(relativePath)) {
      console.log(`  跳过: ${relativePath}`);
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, baseDir);
    } else {
      // 检查是否需要特殊处理
      if (SPECIAL_FILES[relativePath]) {
        const specialSrc = path.join(baseDir, SPECIAL_FILES[relativePath]);
        if (fs.existsSync(specialSrc)) {
          fs.copyFileSync(specialSrc, destPath);
          console.log(`  替换: ${relativePath} <- ${SPECIAL_FILES[relativePath]}`);
        } else {
          console.log(`  警告: 特殊文件不存在 ${specialSrc}`);
          fs.copyFileSync(srcPath, destPath);
        }
      } else {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  复制: ${relativePath}`);
      }
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node scripts/sync-to-opensource.js <目标目录>');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/sync-to-opensource.js ../wenyanwen-opensource');
    console.log('');
    console.log('此脚本会：');
    console.log('  1. 复制源代码到目标目录');
    console.log('  2. 排除敏感文件（API 密钥、内部文档等）');
    console.log('  3. 使用开源版 README 和 .gitignore');
    console.log('  4. 添加配置说明文档');
    process.exit(1);
  }
  
  const targetDir = path.resolve(args[0]);
  const sourceDir = path.resolve(__dirname, '..');
  
  console.log('=== 同步到开源仓库 ===');
  console.log(`源目录: ${sourceDir}`);
  console.log(`目标目录: ${targetDir}`);
  console.log('');
  
  // 确认操作
  if (fs.existsSync(targetDir)) {
    console.log('警告: 目标目录已存在，将覆盖现有文件');
  }
  
  console.log('开始同步...');
  console.log('');
  
  copyDir(sourceDir, targetDir);
  
  // 添加额外文件
  console.log('');
  console.log('添加额外文件...');
  for (const [destRelative, srcRelative] of Object.entries(ADD_FILES)) {
    const srcPath = path.join(sourceDir, srcRelative);
    const destPath = path.join(targetDir, destRelative);
    
    if (fs.existsSync(srcPath)) {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      console.log(`  添加: ${destRelative}`);
    }
  }
  
  console.log('');
  console.log('=== 同步完成 ===');
  console.log('');
  console.log('后续步骤:');
  console.log(`  1. cd ${targetDir}`);
  console.log('  2. 检查文件，确保没有敏感信息');
  console.log('  3. git init (如果是新仓库)');
  console.log('  4. git add -A');
  console.log('  5. git commit -m "sync: 同步代码"');
  console.log('  6. git push');
}

main();
