/**
 * 一键发布打包脚本
 * 
 * 使用方法：
 *   node scripts/build-release.js [配置文件路径]
 * 
 * 示例：
 *   node scripts/build-release.js config-custom-1764978626097.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  appName: '文言文工具',
  appVersion: '1.0.0',
};

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║           文言文工具 - 一键发布打包脚本                    ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// 1. 检查配置文件
function findConfigFile() {
  console.log('📋 步骤 1/6: 检查配置文件...');
  
  // 从命令行参数获取
  const configArg = process.argv[2];
  if (configArg && fs.existsSync(configArg)) {
    console.log(`   ✓ 使用指定配置: ${configArg}`);
    return configArg;
  }
  
  // 查找根目录的配置文件
  const rootDir = path.join(__dirname, '..');
  const configFiles = fs.readdirSync(rootDir).filter(f => 
    f.startsWith('config-custom-') && f.endsWith('.json')
  );
  
  if (configFiles.length > 0) {
    const configFile = path.join(rootDir, configFiles[0]);
    console.log(`   ✓ 找到配置: ${configFiles[0]}`);
    return configFile;
  }
  
  // 查找 dist 目录
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    const distConfigs = fs.readdirSync(distDir).filter(f => 
      f.startsWith('config-custom-') && f.endsWith('.json')
    );
    if (distConfigs.length > 0) {
      const configFile = path.join(distDir, distConfigs[0]);
      console.log(`   ✓ 找到配置: dist/${distConfigs[0]}`);
      return configFile;
    }
  }
  
  console.log('   ⚠ 未找到配置文件，将使用默认配置');
  return null;
}

// 2. 清理旧文件
function cleanBuild() {
  console.log('\n🧹 步骤 2/6: 清理旧的构建文件...');
  
  const dirsToClean = ['.next'];
  
  for (const dir of dirsToClean) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`   ✓ 已清理: ${dir}`);
      } catch (error) {
        console.log(`   ⚠ 无法清理 ${dir}`);
      }
    }
  }
}

// 3. 生成安装程序图片
function generateImages() {
  console.log('\n🎨 步骤 3/6: 生成安装程序图片...');
  
  try {
    execSync('node build/generate-simple-images.js', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    console.log('   ✓ 安装程序图片已生成');
  } catch (error) {
    console.log('   ⚠ 图片生成失败，使用现有图片');
  }
  
  // 生成向导图片
  try {
    execSync('node build/generate-wizard-images.js', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    console.log('   ✓ 向导图片已生成');
  } catch (error) {
    console.log('   ⚠ 向导图片生成失败');
  }
}

// 4. 构建 Next.js
function buildNext() {
  console.log('\n📦 步骤 4/6: 构建 Next.js 应用...');
  console.log('   这可能需要 2-3 分钟，请耐心等待...');
  
  try {
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('   ✓ Next.js 构建完成');
  } catch (error) {
    console.error('   ❌ Next.js 构建失败');
    process.exit(1);
  }
}

// 5. 复制配置文件
function copyConfig(configFile) {
  console.log('\n📋 步骤 5/6: 复制配置文件...');
  
  const outDir = path.join(__dirname, '..', 'out');
  const destFile = path.join(outDir, 'default-config.json');
  
  if (configFile && fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      fs.writeFileSync(destFile, JSON.stringify(config, null, 2), 'utf8');
      console.log('   ✓ 配置文件已复制');
      
      // 显示配置信息
      if (config.ai?.configGroups) {
        console.log(`   - API 配置组: ${config.ai.configGroups.length} 个`);
      }
    } catch (error) {
      console.error('   ❌ 配置文件复制失败:', error.message);
    }
  } else {
    console.log('   - 跳过配置文件复制');
  }
  
  // 复制更新补丁
  const patchSource = path.join(__dirname, '..', 'update-patch.json');
  const patchDest = path.join(outDir, 'update-patch.json');
  if (fs.existsSync(patchSource)) {
    fs.copyFileSync(patchSource, patchDest);
    console.log('   ✓ 更新补丁已复制');
  }
}

// 6. 打包 Electron
function buildElectron() {
  console.log('\n⚡ 步骤 6/6: 打包 Electron 应用...');
  console.log('   这可能需要 3-5 分钟，请耐心等待...');
  
  try {
    execSync('npx electron-builder --win nsis --x64', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('   ✓ Electron 打包完成');
  } catch (error) {
    console.error('   ❌ Electron 打包失败');
    process.exit(1);
  }
}

// 显示结果
function showResults() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 打包完成！                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir).filter(f => f.endsWith('.exe') && f.includes('Setup'));
    
    if (files.length > 0) {
      console.log('📁 生成的安装程序:');
      console.log('');
      
      files.forEach(file => {
        const filePath = path.join(distDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   ${file}`);
        console.log(`   大小: ${sizeMB} MB`);
        console.log('');
      });
    }
  }
  
  console.log('📂 输出目录: dist/');
  console.log('');
  console.log('💡 特性:');
  console.log('   ✓ 包含预设配置');
  console.log('   ✓ 中文安装界面');
  console.log('   ✓ 支持自定义安装路径');
  console.log('   ✓ 创建桌面快捷方式');
  console.log('   ✓ 安装后自动运行');
  console.log('');
}

// 主流程
async function main() {
  const startTime = Date.now();
  
  try {
    const configFile = findConfigFile();
    cleanBuild();
    generateImages();
    buildNext();
    copyConfig(configFile);
    buildElectron();
    showResults();
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`⏱ 总耗时: ${duration} 分钟`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 打包过程中出现错误:', error.message);
    process.exit(1);
  }
}

main();
