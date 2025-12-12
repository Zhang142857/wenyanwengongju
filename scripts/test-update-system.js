/**
 * 更新系统测试脚本
 * 测试自动检查更新、下载安装、紧急恢复
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPDATE_API = 'https://update.156658.xyz';

// 颜色输出
const log = {
  info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
  title: (msg) => console.log(`\n\x1b[35m${'='.repeat(50)}\n   ${msg}\n${'='.repeat(50)}\x1b[0m\n`)
};

// HTTP 请求
function request(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// 测试 1: 健康检查
async function testHealth() {
  log.info('测试健康检查接口...');
  try {
    const res = await request(`${UPDATE_API}/health`);
    if (res.data.status === 'ok') {
      log.success('健康检查通过');
      return true;
    }
    log.error('健康检查失败');
    return false;
  } catch (e) {
    log.error(`健康检查失败: ${e.message}`);
    return false;
  }
}

// 测试 2: 检查更新（有更新）
async function testCheckUpdateHasUpdate() {
  log.info('测试检查更新（旧版本 -> 应有更新）...');
  try {
    const res = await request(`${UPDATE_API}/api/update/check?current_version=1.0.0&platform=windows`);
    const data = res.data;
    
    if (data.has_update === true) {
      log.success(`检测到更新: v${data.version}`);
      log.info(`  下载链接: ${data.download_url}`);
      log.info(`  文件大小: ${(data.file_size / 1024 / 1024).toFixed(2)} MB`);
      return { success: true, data };
    }
    log.error('应该检测到更新但没有');
    return { success: false };
  } catch (e) {
    log.error(`检查更新失败: ${e.message}`);
    return { success: false };
  }
}

// 测试 3: 检查更新（无更新）
async function testCheckUpdateNoUpdate() {
  log.info('测试检查更新（最新版本 -> 应无更新）...');
  try {
    const res = await request(`${UPDATE_API}/api/update/check?current_version=99.0.0&platform=windows`);
    const data = res.data;
    
    if (data.has_update === false) {
      log.success('正确返回无更新');
      return true;
    }
    log.error('应该返回无更新但返回了有更新');
    return false;
  } catch (e) {
    log.error(`检查更新失败: ${e.message}`);
    return false;
  }
}

// 测试 4: 获取版本列表
async function testGetReleases() {
  log.info('测试获取版本列表...');
  try {
    const res = await request(`${UPDATE_API}/api/update/releases`);
    const data = res.data;
    
    if (data.success && Array.isArray(data.releases)) {
      log.success(`获取到 ${data.releases.length} 个版本`);
      data.releases.slice(0, 3).forEach(r => {
        log.info(`  v${r.version} - ${Object.keys(r.platforms || {}).join(', ')}`);
      });
      return true;
    }
    log.error('获取版本列表格式错误');
    return false;
  } catch (e) {
    log.error(`获取版本列表失败: ${e.message}`);
    return false;
  }
}

// 测试 5: 下载链接可用性（只测试 HEAD 请求）
async function testDownloadAvailable(downloadUrl) {
  log.info('测试下载链接可用性...');
  return new Promise((resolve) => {
    const url = new URL(downloadUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'HEAD'
    }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 302) {
        log.success(`下载链接可用 (HTTP ${res.statusCode})`);
        resolve(true);
      } else {
        log.error(`下载链接不可用 (HTTP ${res.statusCode})`);
        resolve(false);
      }
    });
    
    req.on('error', (e) => {
      log.error(`下载链接测试失败: ${e.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

// 测试 6: 参数验证
async function testParameterValidation() {
  log.info('测试参数验证...');
  
  try {
    // 缺少参数
    await request(`${UPDATE_API}/api/update/check`);
    log.error('应该返回错误但没有');
    return false;
  } catch (e) {
    if (e.message.includes('400')) {
      log.success('正确拒绝缺少参数的请求');
      return true;
    }
    log.error(`参数验证测试失败: ${e.message}`);
    return false;
  }
}

// 测试 7: 不存在的版本
async function testNotFoundVersion() {
  log.info('测试下载不存在的版本...');
  try {
    await request(`${UPDATE_API}/api/update/download/99.99.99/windows`);
    log.error('应该返回 404 但没有');
    return false;
  } catch (e) {
    if (e.message.includes('404')) {
      log.success('正确返回 404');
      return true;
    }
    log.error(`测试失败: ${e.message}`);
    return false;
  }
}

// 紧急恢复测试说明
function printRecoveryGuide() {
  log.title('紧急恢复指南');
  
  console.log(`
📋 场景 1: 更新服务不可用
   症状: 检查更新失败、下载失败
   恢复步骤:
   1. 检查 Cloudflare Workers 状态
   2. 运行: cd update && npx wrangler deploy
   3. 检查 GitHub API 是否可用

📋 场景 2: 发布了有问题的版本
   症状: 用户更新后应用崩溃
   恢复步骤:
   1. 在 GitHub Releases 删除有问题的版本
   2. 或发布新的修复版本
   3. Workers 会自动获取最新的 Release 信息

📋 场景 3: GitHub 访问受限
   症状: 国内用户无法下载
   解决方案:
   - 下载链接已通过 Cloudflare Workers 代理
   - 用户访问 update.156658.xyz 而非直接访问 GitHub

📋 场景 4: 需要回滚版本
   步骤:
   1. 在 GitHub 将旧版本设为 Latest Release
   2. 或删除新版本的 Release
   3. Workers 会自动返回正确的版本信息

📋 手动测试命令:
   # 检查更新
   curl "https://update.156658.xyz/api/update/check?current_version=1.0.0&platform=windows"
   
   # 获取版本列表
   curl "https://update.156658.xyz/api/update/releases"
   
   # 健康检查
   curl "https://update.156658.xyz/health"
`);
}

// 主函数
async function main() {
  log.title('更新系统测试');
  
  const results = [];
  
  // 运行测试
  results.push({ name: '健康检查', pass: await testHealth() });
  
  const updateResult = await testCheckUpdateHasUpdate();
  results.push({ name: '检查更新（有更新）', pass: updateResult.success });
  
  results.push({ name: '检查更新（无更新）', pass: await testCheckUpdateNoUpdate() });
  results.push({ name: '获取版本列表', pass: await testGetReleases() });
  
  if (updateResult.success && updateResult.data.download_url) {
    results.push({ name: '下载链接可用', pass: await testDownloadAvailable(updateResult.data.download_url) });
  }
  
  results.push({ name: '参数验证', pass: await testParameterValidation() });
  results.push({ name: '404 处理', pass: await testNotFoundVersion() });
  
  // 输出结果
  log.title('测试结果');
  
  let passed = 0;
  let failed = 0;
  
  results.forEach(r => {
    if (r.pass) {
      log.success(`${r.name}`);
      passed++;
    } else {
      log.error(`${r.name}`);
      failed++;
    }
  });
  
  console.log(`\n总计: ${passed} 通过, ${failed} 失败\n`);
  
  // 打印恢复指南
  printRecoveryGuide();
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  log.error(`测试失败: ${e.message}`);
  process.exit(1);
});
