/**
 * 自动更新服务端版本配置
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    log('用法: node update-server-config.js <version> <hash> <changelog>', 'yellow');
    log('示例: node update-server-config.js 1.0.3 abc123... "修复bug"', 'yellow');
    process.exit(1);
  }

  const [version, hash, changelog] = args;

  log('\n🔧 更新服务端配置...', 'cyan');
  log(`  版本: ${version}`, 'cyan');
  log(`  哈希: ${hash.substring(0, 16)}...`, 'cyan');
  log(`  说明: ${changelog}`, 'cyan');

  // 查找 updateCheck.js 文件
  const updateCheckPath = path.join(__dirname, '..', '..', 'update', 'src', 'handlers', 'updateCheck.js');
  
  if (!fs.existsSync(updateCheckPath)) {
    log('\n❌ 找不到 updateCheck.js 文件', 'red');
    log(`  路径: ${updateCheckPath}`, 'red');
    process.exit(1);
  }

  // 读取文件
  let content = fs.readFileSync(updateCheckPath, 'utf8');

  // 更新 VERSION_CONFIG
  const versionConfigRegex = /const VERSION_CONFIG = \{[\s\S]*?windows: \{[\s\S]*?\}/;
  
  const newConfig = `const VERSION_CONFIG = {
  windows: {
    version: '${version}',
    hash: '${hash}',
    changelog: '${changelog.replace(/'/g, "\\'")}',
    force_update: false,
    rollout_percentage: 100
  }`;

  content = content.replace(versionConfigRegex, newConfig);

  // 写回文件
  fs.writeFileSync(updateCheckPath, content, 'utf8');

  log('\n✅ 配置已更新！', 'green');
  log('\n📝 下一步:', 'cyan');
  log('  cd update', 'yellow');
  log('  npm run deploy', 'yellow');
}

main().catch(error => {
  log('\n❌ 更新失败', 'red');
  console.error(error);
  process.exit(1);
});
