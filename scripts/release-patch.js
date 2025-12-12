/**
 * 发布 PATCH 版本脚本
 * 自动化版本发布流程 + 自动上传到更新服务器
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

// 更新服务器配置
const UPDATE_SERVER = {
  url: 'https://update.156658.xyz',
  apiKey: 'your-secret-api-key-here',
  platform: 'windows'
};

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

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'inherit', ...options });
  } catch (error) {
    log(`命令执行失败: ${command}`, 'red');
    throw error;
  }
}

/**
 * 上传文件到更新服务器
 */
async function uploadToServer(filePath, version, platform, changelog) {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();
    
    // 添加文件
    form.append('file', fs.createReadStream(filePath));
    form.append('version', version);
    form.append('platform', platform);
    if (changelog) {
      form.append('changelog', changelog);
    }

    const url = new URL('/api/update/upload', UPDATE_SERVER.url);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${UPDATE_SERVER.apiKey}`
      }
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            resolve({ success: true });
          }
        } else {
          reject(new Error(`上传失败: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    form.pipe(req);
  });
}

async function main() {
  log('\n🚀 开始发布 PATCH 版本\n', 'cyan');

  // 1. 读取当前版本
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;
  
  log(`📦 当前版本: ${currentVersion}`, 'yellow');

  // 2. 确认是否继续
  log('\n请确认以下操作:', 'yellow');
  log('  1. 清理构建文件');
  log('  2. 构建 Next.js 应用');
  log('  3. 打包 Electron 应用');
  log('  4. 生成安装程序\n');

  // 3. 清理旧文件
  log('🧹 清理构建文件...', 'cyan');
  try {
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
      log('  ✓ 已删除 dist', 'green');
    }
    if (fs.existsSync('.next')) {
      fs.rmSync('.next', { recursive: true, force: true });
      log('  ✓ 已删除 .next', 'green');
    }
    if (fs.existsSync('out')) {
      fs.rmSync('out', { recursive: true, force: true });
      log('  ✓ 已删除 out', 'green');
    }
  } catch (error) {
    log('清理文件失败，继续执行...', 'yellow');
  }

  // 4. 构建应用
  log('\n📦 构建 Next.js 应用...', 'cyan');
  exec('npm run build');
  log('  ✓ Next.js 构建完成', 'green');

  // 5. 打包 Electron
  log('\n📦 打包 Electron 应用...', 'cyan');
  exec('npx electron-builder --win --x64 --ia32');
  log('  ✓ Electron 打包完成', 'green');

  // 6. 检查生成的文件
  log('\n📋 检查生成的文件...', 'cyan');
  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    const exeFiles = files.filter(f => f.endsWith('.exe'));
    
    if (exeFiles.length > 0) {
      log('  ✓ 找到以下安装程序:', 'green');
      exeFiles.forEach(file => {
        const filePath = path.join(distPath, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        log(`    - ${file} (${sizeMB} MB)`, 'green');
      });
    } else {
      log('  ⚠ 未找到 .exe 文件', 'yellow');
    }
  } else {
    log('  ⚠ dist 目录不存在', 'yellow');
  }

  // 7. 读取更新日志
  log('\n📝 读取更新日志...', 'cyan');
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  let changelog = '';
  
  try {
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');
    // 提取当前版本的更新日志
    const versionRegex = new RegExp(`## \\[${currentVersion}\\][\\s\\S]*?(?=## \\[|$)`);
    const match = changelogContent.match(versionRegex);
    if (match) {
      changelog = match[0]
        .replace(`## [${currentVersion}]`, '')
        .split('\n')
        .filter(line => line.trim() && !line.includes('###'))
        .map(line => line.replace(/^- /, '').trim())
        .join('\n');
    }
    log(`  ✓ 更新日志: ${changelog.substring(0, 50)}...`, 'green');
  } catch (error) {
    log('  ⚠ 无法读取更新日志', 'yellow');
  }

  // 8. 上传到更新服务器
  log('\n🚀 上传到更新服务器...', 'cyan');
  
  // 查找 Setup.exe 文件
  const setupFiles = exeFiles.filter(f => f.includes('Setup.exe') && !f.includes('ia32'));
  
  if (setupFiles.length === 0) {
    log('  ⚠ 未找到 Setup.exe 文件，跳过上传', 'yellow');
  } else {
    const setupFile = setupFiles[0];
    const setupPath = path.join(distPath, setupFile);
    
    log(`  📦 上传文件: ${setupFile}`, 'cyan');
    log(`  🌐 服务器: ${UPDATE_SERVER.url}`, 'cyan');
    log(`  📋 版本: ${currentVersion}`, 'cyan');
    log(`  💻 平台: ${UPDATE_SERVER.platform}`, 'cyan');
    
    try {
      const result = await uploadToServer(
        setupPath,
        currentVersion,
        UPDATE_SERVER.platform,
        changelog
      );
      
      log('\n  ✅ 上传成功！', 'green');
      if (result.hash) {
        log(`  🔐 文件哈希: ${result.hash.substring(0, 16)}...`, 'green');
      }
      if (result.size) {
        const sizeMB = (result.size / 1024 / 1024).toFixed(2);
        log(`  📊 文件大小: ${sizeMB} MB`, 'green');
      }
      
      // 自动更新服务端配置
      if (result.hash) {
        log('\n🔧 更新服务端配置...', 'cyan');
        try {
          const changelogLine = changelog.split('\n')[0] || '更新说明';
          exec(`node scripts/update-server-config.js "${currentVersion}" "${result.hash}" "${changelogLine}"`);
          log('  ✅ 服务端配置已更新', 'green');
          
          // 自动部署更新服务
          log('\n🚀 部署更新服务...', 'cyan');
          const updatePath = path.join(__dirname, '..', '..', 'update');
          if (fs.existsSync(updatePath)) {
            process.chdir(updatePath);
            exec('npm run deploy');
            log('  ✅ 更新服务部署完成', 'green');
          } else {
            log('  ⚠ 找不到 update 目录，跳过自动部署', 'yellow');
          }
        } catch (error) {
          log('  ⚠ 自动更新配置失败，请手动操作', 'yellow');
          log(`  错误: ${error.message}`, 'yellow');
        }
      }
      
    } catch (error) {
      log('\n  ❌ 上传失败', 'red');
      log(`  错误: ${error.message}`, 'red');
      log('\n  💡 你可以手动上传:', 'yellow');
      log(`     访问: ${UPDATE_SERVER.url}/admin`, 'yellow');
      log(`     文件: ${setupPath}`, 'yellow');
    }
  }

  // 9. 显示完成信息
  log('\n✅ 打包完成！', 'green');
  log('\n📝 下一步操作:', 'cyan');
  log('  1. 测试安装程序是否正常工作');
  log(`  2. 更新服务端配置（update/src/handlers/updateCheck.js）`);
  log('  3. 部署更新服务: cd update && npm run deploy');
  log('  4. 在旧版本中测试"检查更新"功能\n');

  log('💡 提示: 可以使用以下命令快速测试:', 'yellow');
  log(`   .\\dist\\文言文查询-${currentVersion}-x64-Setup.exe\n`, 'yellow');
}

main().catch(error => {
  log('\n❌ 发布失败', 'red');
  console.error(error);
  process.exit(1);
});
