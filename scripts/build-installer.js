// 完整的打包脚本 - 确保兼容性
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建文言文工具安装程序...\n');

// 检查必要的文件
function checkFiles() {
    console.log('📋 检查必要文件...');
    
    const requiredFiles = [
        'package.json',
        'main/index.js',
        'main/preload.js',
        'next.config.js'
    ];
    
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            console.error(`❌ 缺少必要文件: ${file}`);
            process.exit(1);
        }
    }
    
    console.log('✓ 所有必要文件存在\n');
}

// 生成临时图片
function generateImages() {
    console.log('🎨 生成安装程序图片...');
    
    const buildDir = path.join(__dirname, '..', 'build');
    
    // 检查是否已有图片
    const hasIcon = fs.existsSync(path.join(buildDir, 'icon.ico'));
    const hasHeader = fs.existsSync(path.join(buildDir, 'installerHeader.bmp'));
    const hasSidebar = fs.existsSync(path.join(buildDir, 'installerSidebar.bmp'));
    
    if (hasIcon && hasHeader && hasSidebar) {
        console.log('✓ 图片文件已存在，跳过生成\n');
        return;
    }
    
    try {
        execSync('node build/generate-temp-images.js', { stdio: 'inherit' });
        console.log();
    } catch (error) {
        console.error('❌ 生成图片失败，但将继续构建...\n');
    }
}

// 清理旧的构建
function cleanBuild() {
    console.log('🧹 清理旧的构建文件...');
    
    const dirsToClean = ['dist', '.next', 'out'];
    
    for (const dir of dirsToClean) {
        if (fs.existsSync(dir)) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                console.log(`✓ 已清理: ${dir}`);
            } catch (error) {
                console.log(`⚠ 无法清理 ${dir}: ${error.message}`);
            }
        }
    }
    
    console.log();
}

// 构建 Next.js 应用
function buildNext() {
    console.log('📦 构建 Next.js 应用...');
    console.log('这可能需要几分钟时间，请耐心等待...\n');
    
    try {
        execSync('npm run build', { stdio: 'inherit' });
        console.log('\n✓ Next.js 构建完成\n');
    } catch (error) {
        console.error('❌ Next.js 构建失败');
        process.exit(1);
    }
}

// 验证 out 目录
function verifyOut() {
    console.log('🔍 验证构建输出...');
    
    if (!fs.existsSync('out')) {
        console.error('❌ out 目录不存在');
        process.exit(1);
    }
    
    if (!fs.existsSync('out/index.html')) {
        console.error('❌ out/index.html 不存在');
        process.exit(1);
    }
    
    console.log('✓ 构建输出验证通过\n');
}

// 构建 Electron 应用
function buildElectron() {
    console.log('⚡ 打包 Electron 应用...');
    console.log('这可能需要较长时间，请耐心等待...\n');
    
    try {
        // 构建 Windows 安装程序（x64 和 ia32）
        execSync('electron-builder --win --x64 --ia32', { 
            stdio: 'inherit',
            env: {
                ...process.env,
                // 确保使用正确的 Node 版本
                npm_config_target_arch: 'x64'
            }
        });
        console.log('\n✓ Electron 打包完成\n');
    } catch (error) {
        console.error('❌ Electron 打包失败');
        process.exit(1);
    }
}

// 显示构建结果
function showResults() {
    console.log('🎉 构建完成！\n');
    console.log('📁 输出文件位置: dist/\n');
    
    if (fs.existsSync('dist')) {
        const files = fs.readdirSync('dist');
        console.log('生成的文件:');
        files.forEach(file => {
            const stats = fs.statSync(path.join('dist', file));
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`  • ${file} (${sizeMB} MB)`);
        });
    }
    
    console.log('\n💡 提示:');
    console.log('  • 安装程序支持 Windows 7/8/10/11');
    console.log('  • x64 版本适用于 64 位系统');
    console.log('  • ia32 版本适用于 32 位系统');
    console.log('  • 用户可以选择安装路径');
    console.log('  • 安装后会创建桌面快捷方式\n');
}

// 主流程
async function main() {
    try {
        checkFiles();
        generateImages();
        cleanBuild();
        buildNext();
        verifyOut();
        buildElectron();
        showResults();
    } catch (error) {
        console.error('\n❌ 构建过程中出现错误:', error.message);
        process.exit(1);
    }
}

main();
