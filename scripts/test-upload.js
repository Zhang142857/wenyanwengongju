/**
 * 测试上传功能
 * 用于验证更新服务器配置是否正确
 */

const https = require('https');
const http = require('http');

const UPDATE_SERVER = {
  url: 'https://update.156658.xyz',
  apiKey: 'your-secret-api-key-here'
};

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

async function testHealth() {
  return new Promise((resolve, reject) => {
    const url = new URL('/health', UPDATE_SERVER.url);
    const protocol = url.protocol === 'https:' ? https : http;

    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`健康检查失败: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function testCheckUpdate() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/update/check?current_version=1.0.0&platform=windows', UPDATE_SERVER.url);
    const protocol = url.protocol === 'https:' ? https : http;

    protocol.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`检查更新失败: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function testAuth() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/update/upload', UPDATE_SERVER.url);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPDATE_SERVER.apiKey}`
      }
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // 400 表示认证通过但缺少参数，这是预期的
        if (res.statusCode === 400 || res.statusCode === 401) {
          resolve({ statusCode: res.statusCode, data });
        } else {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  log('\n🧪 测试更新服务器配置\n', 'cyan');
  log(`服务器: ${UPDATE_SERVER.url}`, 'cyan');
  log(`API 密钥: ${UPDATE_SERVER.apiKey.substring(0, 10)}...\n`, 'cyan');

  // 1. 测试健康检查
  log('1️⃣  测试健康检查...', 'yellow');
  try {
    const health = await testHealth();
    log(`   ✅ 服务器正常运行`, 'green');
    log(`   响应: ${JSON.stringify(health)}`, 'green');
  } catch (error) {
    log(`   ❌ 健康检查失败: ${error.message}`, 'red');
    log(`   请检查服务器地址是否正确`, 'red');
    process.exit(1);
  }

  // 2. 测试检查更新
  log('\n2️⃣  测试检查更新接口...', 'yellow');
  try {
    const update = await testCheckUpdate();
    log(`   ✅ 检查更新接口正常`, 'green');
    if (update.has_update) {
      log(`   发现新版本: ${update.version}`, 'green');
    } else {
      log(`   当前版本: ${update.version}`, 'green');
    }
  } catch (error) {
    log(`   ❌ 检查更新失败: ${error.message}`, 'red');
  }

  // 3. 测试认证
  log('\n3️⃣  测试 API 认证...', 'yellow');
  try {
    const auth = await testAuth();
    if (auth.statusCode === 400) {
      log(`   ✅ API 密钥正确（返回 400 表示认证通过但缺少参数）`, 'green');
    } else if (auth.statusCode === 401) {
      log(`   ❌ API 密钥错误`, 'red');
      log(`   请检查 release-patch.js 中的 UPDATE_SERVER.apiKey`, 'red');
      log(`   应该与 update/wrangler.toml 中的 API_KEY 一致`, 'red');
    } else {
      log(`   ⚠️  未知响应: ${auth.statusCode}`, 'yellow');
      log(`   响应: ${auth.data}`, 'yellow');
    }
  } catch (error) {
    log(`   ❌ 认证测试失败: ${error.message}`, 'red');
  }

  log('\n✅ 测试完成！\n', 'green');
  log('如果所有测试都通过，可以运行:', 'cyan');
  log('  npm run release:patch\n', 'yellow');
}

main().catch(error => {
  log('\n❌ 测试失败', 'red');
  console.error(error);
  process.exit(1);
});
