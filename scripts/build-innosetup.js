/**
 * Inno Setup 打包脚本
 * 
 * 使用 Inno Setup 创建自定义安装程序
 * 
 * 前置条件：
 * 1. 安装 Inno Setup 6.x (https://jrsoftware.org/isinfo.php)
 * 2. 将 ISCC.exe 添加到系统 PATH，或设置 INNO_SETUP_PATH 环境变量
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 从 package.json 读取版本号
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

// 配置
const CONFIG = {
  appName: '文言文工具',
  appVersion: packageJson.version || '1.0.0',
  issFile: path.join(__dirname, '..', 'build', 'installer.iss'),
  distDir: path.join(__dirname, '..', 'dist'),
  outDir: path.join(__dirname, '..', 'out'),
  buildDir: path.join(__dirname, '..', 'build'),
};

console.log('🚀 开始使用 Inno Setup 打包...\n');

// 1. 检查 Inno Setup 是否安装
function checkInnoSetup() {
  console.log('📋 检查 Inno Setup...');
  
  const possiblePaths = [
    process.env.INNO_SETUP_PATH,
    'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
    'ISCC.exe', // 如果在 PATH 中
  ].filter(Boolean);
  
  for (const isccPath of possiblePaths) {
    try {
      if (fs.existsSync(isccPath) || isccPath === 'ISCC.exe') {
        execSync(`"${isccPath}" /?`, { stdio: 'pipe' });
        console.log(`✓ 找到 Inno Setup: ${isccPath}`);
        return isccPath;
      }
    } catch (e) {
      // 继续尝试下一个路径
    }
  }
  
  console.error('❌ 未找到 Inno Setup');
  console.log('\n请安装 Inno Setup 6.x:');
  console.log('  下载地址: https://jrsoftware.org/isinfo.php');
  console.log('\n或设置环境变量 INNO_SETUP_PATH 指向 ISCC.exe');
  process.exit(1);
}

// 2. 检查必要文件
function checkRequiredFiles() {
  console.log('\n📋 检查必要文件...');
  
  // 检查 win-unpacked 目录
  const winUnpackedDir = path.join(CONFIG.distDir, 'win-unpacked');
  if (!fs.existsSync(winUnpackedDir)) {
    console.error('❌ 未找到 win-unpacked 目录');
    console.log('请先运行: npm run pack');
    process.exit(1);
  }
  console.log('✓ win-unpacked 目录存在');
  
  // 检查主程序
  const exePath = path.join(winUnpackedDir, `${CONFIG.appName}.exe`);
  if (!fs.existsSync(exePath)) {
    console.error(`❌ 未找到主程序: ${CONFIG.appName}.exe`);
    process.exit(1);
  }
  console.log('✓ 主程序存在');
  
  // 检查图标
  const iconPath = path.join(CONFIG.buildDir, 'icon.ico');
  if (!fs.existsSync(iconPath)) {
    console.error('❌ 未找到图标文件: build/icon.ico');
    process.exit(1);
  }
  console.log('✓ 图标文件存在');
  
  // 检查 ISS 脚本
  if (!fs.existsSync(CONFIG.issFile)) {
    console.error('❌ 未找到 ISS 脚本: build/installer.iss');
    process.exit(1);
  }
  console.log('✓ ISS 脚本存在');
}

// 3. 生成向导图片
function generateWizardImages() {
  console.log('\n🎨 检查向导图片...');
  
  const wizardImagePath = path.join(CONFIG.buildDir, 'wizard-image.bmp');
  const wizardSmallPath = path.join(CONFIG.buildDir, 'wizard-small.bmp');
  
  // 如果图片已存在，跳过
  if (fs.existsSync(wizardImagePath) && fs.existsSync(wizardSmallPath)) {
    console.log('✓ 向导图片已存在');
    return;
  }
  
  // 运行图片生成脚本
  console.log('生成向导图片...');
  try {
    execSync('node build/generate-wizard-images.js', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (e) {
    console.log('⚠ 图片生成失败，创建占位符');
    createPlaceholderBmp(wizardImagePath, 164, 314);
    createPlaceholderBmp(wizardSmallPath, 55, 55);
  }
}

// 创建占位符 BMP
function createPlaceholderBmp(filePath, width, height) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);
  
  // BMP 文件头
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);
  
  // DIB 头
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(pixelDataSize, 34);
  
  // 填充像素数据 (淡米色)
  let offset = 54;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buffer[offset++] = 245; // B
      buffer[offset++] = 248; // G
      buffer[offset++] = 250; // R
    }
    // 行填充
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      buffer[offset++] = 0;
    }
  }
  
  fs.writeFileSync(filePath, buffer);
}

// 4. 复制配置文件
function copyConfigFile(configFile) {
  console.log('\n📦 复制配置文件...');
  
  const destPath = path.join(CONFIG.outDir, 'default-config.json');
  
  if (configFile && fs.existsSync(configFile)) {
    fs.copyFileSync(configFile, destPath);
    console.log(`✓ 配置文件已复制: ${path.basename(configFile)}`);
  } else if (fs.existsSync(destPath)) {
    console.log('✓ 配置文件已存在');
  } else {
    console.log('⚠ 未找到配置文件，将使用默认配置');
  }
}

// 5. 更新 ISS 文件中的版本号
function updateIssVersion() {
  console.log('\n📝 更新 ISS 脚本版本号...');
  
  let issContent = fs.readFileSync(CONFIG.issFile, 'utf8');
  
  // 更新版本号
  issContent = issContent.replace(
    /#define MyAppVersion "[\d.]+"/,
    `#define MyAppVersion "${CONFIG.appVersion}"`
  );
  
  fs.writeFileSync(CONFIG.issFile, issContent, 'utf8');
  console.log(`✓ 版本号已更新为: ${CONFIG.appVersion}`);
}

// 6. 编译 Inno Setup 脚本
function compileInnoSetup(isccPath) {
  console.log('\n⚡ 编译 Inno Setup 脚本...');
  
  try {
    const result = execSync(`"${isccPath}" "${CONFIG.issFile}"`, {
      stdio: 'inherit',
      cwd: CONFIG.buildDir
    });
    
    console.log('\n✓ Inno Setup 编译完成');
  } catch (error) {
    console.error('❌ Inno Setup 编译失败');
    process.exit(1);
  }
}

// 7. 显示结果
function showResults() {
  console.log('\n🎉 打包完成！\n');
  
  // 查找生成的安装程序
  const possibleNames = [
    `${CONFIG.appName}-${CONFIG.appVersion}-InnoSetup.exe`,
    `${CONFIG.appName}-${CONFIG.appVersion}-Setup.exe`,
  ];
  
  for (const name of possibleNames) {
    const outputFile = path.join(CONFIG.distDir, name);
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`📁 输出文件: ${outputFile}`);
      console.log(`   大小: ${sizeMB} MB`);
      break;
    }
  }
  
  console.log('\n💡 特性:');
  console.log('  ✓ 自定义安装界面');
  console.log('  ✓ 中文界面');
  console.log('  ✓ 支持自定义安装路径');
  console.log('  ✓ 创建桌面快捷方式');
  console.log('  ✓ 安装后自动运行');
}

// 主流程
async function main() {
  try {
    // 获取配置文件参数
    const configFile = process.argv[2];
    
    console.log(`📦 应用版本: ${CONFIG.appVersion}\n`);
    
    const isccPath = checkInnoSetup();
    checkRequiredFiles();
    generateWizardImages();
    copyConfigFile(configFile);
    updateIssVersion();
    
    // 等待图片生成完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    compileInnoSetup(isccPath);
    showResults();
    
  } catch (error) {
    console.error('\n❌ 打包过程中出现错误:', error.message);
    process.exit(1);
  }
}

main();
