// 带配置文件的打包脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建文言文工具（包含预设配置）...\n');

// 1. 检查配置文件
function checkConfigFile() {
    console.log('📋 检查配置文件...');
    
    // 首先检查项目根目录
    const rootDir = path.join(__dirname, '..');
    let configFiles = fs.readdirSync(rootDir).filter(f => f.startsWith('config-custom-') && f.endsWith('.json'));
    let configDir = rootDir;
    
    // 如果根目录没有，检查 dist 目录
    if (configFiles.length === 0) {
        const distDir = path.join(__dirname, '..', 'dist');
        if (fs.existsSync(distDir)) {
            configFiles = fs.readdirSync(distDir).filter(f => f.startsWith('config-custom-') && f.endsWith('.json'));
            configDir = distDir;
        }
    }
    
    if (configFiles.length === 0) {
        console.error('❌ 未找到配置文件 (config-custom-*.json)');
        console.log('请先在设置页面导出配置文件到项目根目录或 dist 目录');
        process.exit(1);
    }
    
    const configFile = path.join(configDir, configFiles[0]);
    console.log(`✓ 找到配置文件: ${configFiles[0]}`);
    
    // 验证配置文件
    try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        if (config.config && config.libraries) {
            console.log('✓ 配置文件格式正确（包含配置和库数据）');
            
            // 统计信息
            const libCount = config.libraries.libraries?.length || 0;
            const defCount = config.libraries.definitions?.length || 0;
            const linkCount = config.libraries.characterDefinitionLinks?.length || 0;
            console.log(`  - 库数量: ${libCount}`);
            console.log(`  - 义项数量: ${defCount}`);
            console.log(`  - 关联数量: ${linkCount}`);
        } else {
            console.log('⚠ 配置文件只包含配置，不包含库数据');
        }
    } catch (error) {
        console.error('❌ 配置文件格式错误:', error.message);
        process.exit(1);
    }
    
    console.log();
    return configFile;
}

// 2. 复制配置文件到构建目录
function copyConfigToOut(configFile) {
    console.log('📦 复制配置文件到构建目录...');
    
    const outDir = path.join(__dirname, '..', 'out');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    
    const destFile = path.join(outDir, 'default-config.json');
    fs.copyFileSync(configFile, destFile);
    
    console.log(`✓ 配置文件已复制到: out/default-config.json\n`);
}

// 3. 生成安装程序图片
function generateImages() {
    console.log('🎨 生成安装程序图片...');
    
    try {
        execSync('node build/generate-simple-images.js', { stdio: 'inherit' });
        console.log();
    } catch (error) {
        console.error('❌ 生成图片失败');
        process.exit(1);
    }
}

// 4. 清理旧的构建
function cleanBuild() {
    console.log('🧹 清理旧的构建文件...');
    
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
    
    console.log();
}

// 5. 构建 Next.js 应用
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

// 6. 再次复制配置文件（确保在 out 目录中）
function ensureConfigInOut(configFile) {
    console.log('🔍 确保配置文件在 out 目录中...');
    
    const outDir = path.join(__dirname, '..', 'out');
    const destFile = path.join(outDir, 'default-config.json');
    
    if (!fs.existsSync(destFile)) {
        fs.copyFileSync(configFile, destFile);
        console.log('✓ 配置文件已复制到 out 目录');
    } else {
        console.log('✓ 配置文件已存在于 out 目录');
    }
    
    console.log();
}

// 6.2 复制配置到新的 config 目录
function copyConfigToConfigDir(configFile) {
    console.log('📁 复制配置到 config 目录...');
    
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    try {
        const fullConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        
        // 复制应用配置
        if (fullConfig.config) {
            const appConfigPath = path.join(configDir, 'app-config.json');
            fs.writeFileSync(appConfigPath, JSON.stringify(fullConfig.config, null, 2), 'utf8');
            console.log('✓ 应用配置已复制到 config/app-config.json');
        }
        
        // 复制库数据
        if (fullConfig.libraries) {
            const librariesPath = path.join(configDir, 'libraries.json');
            fs.writeFileSync(librariesPath, JSON.stringify(fullConfig.libraries, null, 2), 'utf8');
            console.log('✓ 库数据已复制到 config/libraries.json');
        }
    } catch (error) {
        console.error('⚠ 复制配置到 config 目录失败:', error.message);
    }
    
    console.log();
}

// 6.5 复制更新补丁文件（如果存在）
function copyUpdatePatch() {
    console.log('🔄 检查更新补丁文件...');
    
    const patchSource = path.join(__dirname, '..', 'update-patch.json');
    const outDir = path.join(__dirname, '..', 'out');
    const patchDest = path.join(outDir, 'update-patch.json');
    
    if (fs.existsSync(patchSource)) {
        // 验证补丁文件格式
        try {
            const patch = JSON.parse(fs.readFileSync(patchSource, 'utf8'));
            if (!patch.id || !patch.operations) {
                console.log('⚠ 补丁文件格式不正确，跳过');
                return;
            }
            
            fs.copyFileSync(patchSource, patchDest);
            console.log(`✓ 更新补丁已复制: ${patch.id}`);
            console.log(`  - 操作数量: ${patch.operations.length}`);
            if (patch.description) {
                console.log(`  - 说明: ${patch.description}`);
            }
        } catch (error) {
            console.log('⚠ 补丁文件解析失败，跳过:', error.message);
        }
    } else {
        console.log('- 未发现更新补丁文件，跳过');
    }
    
    console.log();
}

// 7. 构建 Electron 应用
function buildElectron() {
    console.log('⚡ 打包 Electron 应用...');
    console.log('这可能需要较长时间，请耐心等待...\n');
    
    try {
        execSync('electron-builder --win --x64 --ia32', { 
            stdio: 'inherit',
            env: {
                ...process.env,
                npm_config_target_arch: 'x64'
            }
        });
        console.log('\n✓ Electron 打包完成\n');
    } catch (error) {
        console.error('❌ Electron 打包失败');
        process.exit(1);
    }
}

// 8. 显示构建结果
function showResults() {
    console.log('🎉 构建完成！\n');
    console.log('📁 输出文件位置: dist/\n');
    
    const distDir = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distDir)) {
        const files = fs.readdirSync(distDir).filter(f => f.endsWith('.exe') || f.endsWith('.zip'));
        console.log('生成的安装程序:');
        files.forEach(file => {
            const stats = fs.statSync(path.join(distDir, file));
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`  • ${file} (${sizeMB} MB)`);
        });
    }
    
    console.log('\n💡 特性:');
    console.log('  ✓ 包含预设配置和库数据');
    console.log('  ✓ 美化的安装界面');
    console.log('  ✓ 支持自定义安装路径');
    console.log('  ✓ 自动创建桌面快捷方式');
    console.log('  ✓ 支持 Windows 7/8/10/11');
    console.log('  ✓ 提供 x64 和 ia32 版本\n');
}

// 主流程
async function main() {
    try {
        const configFile = checkConfigFile();
        generateImages();
        cleanBuild();
        copyConfigToOut(configFile);
        copyConfigToConfigDir(configFile);
        buildNext();
        ensureConfigInOut(configFile);
        copyUpdatePatch();
        buildElectron();
        showResults();
    } catch (error) {
        console.error('\n❌ 构建过程中出现错误:', error.message);
        process.exit(1);
    }
}

main();
