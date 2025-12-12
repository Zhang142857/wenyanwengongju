/**
 * 完整的 Inno Setup 打包流程
 * 
 * 包含：
 * 1. 构建 Next.js 应用
 * 2. 打包 Electron 应用（生成 win-unpacked）
 * 3. 复制配置文件
 * 4. 使用 Inno Setup 创建安装程序
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 从 package.json 读取版本号
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const CONFIG = {
  appName: packageJson.build?.productName || '文言文工具',
  appVersion: packageJson.version || '1.0.0',
};

console.log('🚀 开始完整打包流程（Inno Setup）...\n');

// 1. 检查配置文件
function checkConfigFile() {
  console.log('📋 检查配置文件...');
  
  // 从命令行参数获取配置文件路径
  const configArg = process.argv[2];
  if (configArg && fs.existsSync(configArg)) {
    console.log(`✓ 使用指定配置文件: ${configArg}`);
    return configArg;
  }
  
  // 查找 dist 目录中的配置文件
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    const configFiles = fs.readdirSync(distDir).filter(f => 
      f.startsWith('config-custom-') && f.endsWith('.json')
    );
    
    if (configFiles.length > 0) {
      const configFile = path.join(distDir, configFiles[0]);
      console.log(`✓ 找到配置文件: ${configFiles[0]}`);
      return configFile;
    }
  }
  
  // 查找根目录的配置文件
  const rootDir = path.join(__dirname, '..');
  const rootConfigFiles = fs.readdirSync(rootDir).filter(f => 
    f.startsWith('config-custom-') && f.endsWith('.json')
  );
  
  if (rootConfigFiles.length > 0) {
    const configFile = path.join(rootDir, rootConfigFiles[0]);
    console.log(`✓ 找到配置文件: ${rootConfigFiles[0]}`);
    return configFile;
  }
  
  console.log('⚠ 未找到配置文件，将使用默认配置');
  return null;
}

// 2. 清理旧的构建文件
function cleanBuild() {
  console.log('\n🧹 清理旧的构建文件...');
  
  const dirsToClean = ['.next'];
  
  for (const dir of dirsToClean) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`✓ 已清理: ${dir}`);
      } catch (error) {
        console.log(`⚠ 无法清理 ${dir}: ${error.message}`);
      }
    }
  }
}

// 3. 构建 Next.js 应用
function buildNext() {
  console.log('\n📦 构建 Next.js 应用...');
  console.log('这可能需要几分钟时间，请耐心等待...\n');
  
  try {
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('\n✓ Next.js 构建完成');
  } catch (error) {
    console.error('❌ Next.js 构建失败');
    process.exit(1);
  }
}

// 4. 复制配置文件到 out 目录
function copyConfigToOut(configFile) {
  console.log('\n📦 复制配置文件...');
  
  const outDir = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const destFile = path.join(outDir, 'default-config.json');
  
  if (configFile && fs.existsSync(configFile)) {
    // 读取并验证配置文件
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      
      // 如果是导出的完整配置（包含 config 和 libraries）
      if (config.config || config.libraries) {
        fs.writeFileSync(destFile, JSON.stringify(config, null, 2), 'utf8');
      } else {
        // 如果只是配置对象，包装一下
        fs.writeFileSync(destFile, JSON.stringify({ config }, null, 2), 'utf8');
      }
      
      console.log(`✓ 配置文件已复制到: out/default-config.json`);
    } catch (error) {
      console.error('❌ 配置文件格式错误:', error.message);
      process.exit(1);
    }
  } else {
    console.log('⚠ 跳过配置文件复制');
  }
}

// 5. 复制更新补丁文件
function copyUpdatePatch() {
  console.log('\n🔄 检查更新补丁文件...');
  
  const patchSource = path.join(__dirname, '..', 'update-patch.json');
  const outDir = path.join(__dirname, '..', 'out');
  const patchDest = path.join(outDir, 'update-patch.json');
  
  if (fs.existsSync(patchSource)) {
    try {
      const patch = JSON.parse(fs.readFileSync(patchSource, 'utf8'));
      if (patch.id && patch.operations) {
        fs.copyFileSync(patchSource, patchDest);
        console.log(`✓ 更新补丁已复制: ${patch.id}`);
      }
    } catch (error) {
      console.log('⚠ 补丁文件解析失败，跳过');
    }
  } else {
    console.log('- 未发现更新补丁文件');
  }
}

// 6. 打包 Electron 应用（只生成 unpacked 目录）
function packElectron() {
  console.log('\n⚡ 打包 Electron 应用...');
  console.log('生成 win-unpacked 目录...\n');
  
  try {
    execSync('npx electron-builder --win --dir', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('\n✓ Electron 打包完成');
  } catch (error) {
    console.error('❌ Electron 打包失败');
    process.exit(1);
  }
}

// 7. 使用 Inno Setup 创建安装程序
function buildInnoSetup() {
  console.log('\n🔧 使用 Inno Setup 创建安装程序...');
  
  try {
    execSync('node scripts/build-innosetup.js', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error('❌ Inno Setup 打包失败');
    console.log('\n如果 Inno Setup 未安装，请下载安装:');
    console.log('  https://jrsoftware.org/isinfo.php');
    process.exit(1);
  }
}

// 8. 显示结果
function showResults() {
  console.log('\n' + '='.repeat(50));
  console.log('🎉 打包完成！');
  console.log('='.repeat(50) + '\n');
  
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir).filter(f => f.endsWith('.exe'));
    
    if (files.length > 0) {
      console.log('📁 生成的安装程序:\n');
      
      files.forEach(file => {
        const filePath = path.join(distDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`  • ${file}`);
        console.log(`    大小: ${sizeMB} MB\n`);
      });
    }
  }
  
  console.log('💡 特性:');
  console.log('  ✓ 自定义 Inno Setup 安装界面');
  console.log('  ✓ 中文界面');
  console.log('  ✓ 包含预设配置');
  console.log('  ✓ 支持自定义安装路径');
  console.log('  ✓ 创建桌面快捷方式');
  console.log('  ✓ 安装后自动运行\n');
}

// 主流程
async function main() {
  try {
    const configFile = checkConfigFile();
    cleanBuild();
    buildNext();
    copyConfigToOut(configFile);
    copyUpdatePatch();
    packElectron();
    buildInnoSetup();
    showResults();
  } catch (error) {
    console.error('\n❌ 打包过程中出现错误:', error.message);
    process.exit(1);
  }
}

main();
