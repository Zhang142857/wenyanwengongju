// 验证配置文件脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 验证配置文件...\n');

// 查找配置文件
const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
    console.error('❌ dist 目录不存在');
    console.log('请先导出配置文件到 dist 目录\n');
    process.exit(1);
}

const files = fs.readdirSync(distDir);
const configFiles = files.filter(f => f.startsWith('config-custom-') && f.endsWith('.json'));

if (configFiles.length === 0) {
    console.error('❌ 未找到配置文件');
    console.log('请在设置页面点击"💾 导出全部"按钮\n');
    process.exit(1);
}

const configFile = path.join(distDir, configFiles[0]);
console.log(`✓ 找到配置文件: ${configFiles[0]}\n`);

// 读取并验证配置
try {
    const content = fs.readFileSync(configFile, 'utf8');
    const config = JSON.parse(content);
    
    console.log('📊 配置文件内容分析:\n');
    
    // 检查配置部分
    if (config.config) {
        console.log('✓ 包含应用配置');
        console.log(`  版本: ${config.config.version}`);
        console.log(`  版本类型: ${config.config.edition}`);
        
        if (config.config.ai && config.config.ai.configGroups) {
            const groups = config.config.ai.configGroups;
            console.log(`  配置组数: ${groups.length}`);
            
            groups.forEach((group, index) => {
                console.log(`\n  配置组 ${index + 1}: ${group.name}`);
                console.log(`    Provider: ${group.provider}`);
                console.log(`    Model: ${group.model}`);
                console.log(`    API Keys: ${group.apiKeys.length} 个`);
                console.log(`    并发设置:`);
                console.log(`      - AI义项: ${group.concurrency.aiDefinitionConcurrency}`);
                console.log(`      - 短句: ${group.concurrency.shortSentenceConcurrency}`);
            });
        }
    } else {
        console.log('⚠ 未包含应用配置');
    }
    
    console.log('\n');
    
    // 检查库数据部分
    if (config.libraries) {
        console.log('✓ 包含库数据');
        
        const libs = config.libraries.libraries || [];
        const defs = config.libraries.definitions || [];
        const links = config.libraries.characterDefinitionLinks || [];
        const shorts = config.libraries.shortSentences || [];
        
        console.log(`  库数量: ${libs.length}`);
        console.log(`  义项数量: ${defs.length}`);
        console.log(`  例句关联: ${links.length}`);
        console.log(`  短句数量: ${shorts.length}`);
        
        // 统计每个库的文章数
        if (libs.length > 0) {
            console.log('\n  库详情:');
            libs.forEach(lib => {
                const articleCount = lib.collections.reduce((sum, col) => sum + col.articles.length, 0);
                console.log(`    - ${lib.name}: ${lib.collections.length} 个集, ${articleCount} 篇文章`);
            });
        }
        
        // 统计义项分布
        if (defs.length > 0) {
            const charCount = new Set(defs.map(d => d.character)).size;
            console.log(`\n  义项覆盖: ${charCount} 个不同的字`);
        }
    } else {
        console.log('⚠ 未包含库数据');
    }
    
    console.log('\n');
    
    // 文件大小
    const stats = fs.statSync(configFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`📦 文件大小: ${sizeMB} MB\n`);
    
    // 估算安装包大小
    const estimatedSize = 100 + parseFloat(sizeMB);
    console.log(`📊 预计安装包大小: 约 ${estimatedSize.toFixed(0)} MB`);
    console.log('   (包含 Electron 运行时 + 应用代码 + 配置数据)\n');
    
    // 检查是否完整
    const isComplete = config.config && config.libraries;
    
    if (isComplete) {
        console.log('✅ 配置文件完整，可以开始打包！\n');
        console.log('运行以下命令开始打包:');
        console.log('  npm run build:with-config\n');
    } else {
        console.log('⚠️  配置文件不完整');
        if (!config.config) {
            console.log('  缺少: 应用配置');
        }
        if (!config.libraries) {
            console.log('  缺少: 库数据');
        }
        console.log('\n请重新导出完整配置文件\n');
    }
    
} catch (error) {
    console.error('❌ 配置文件格式错误:', error.message);
    console.log('\n请确保配置文件是有效的 JSON 格式\n');
    process.exit(1);
}
