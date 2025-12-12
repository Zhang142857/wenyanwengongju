/**
 * 发布到 GitHub Releases
 * 
 * 使用方法:
 * node scripts/github-release.js
 * 
 * 需要设置环境变量:
 * GITHUB_TOKEN - GitHub Personal Access Token
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置
const GITHUB_OWNER = 'Zhang142857';
const GITHUB_REPO = 'wenyanwengongju';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 读取版本信息
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const VERSION = packageJson.version;

// 读取更新日志
function getChangelog() {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  const content = fs.readFileSync(changelogPath, 'utf8');
  const regex = new RegExp(`## \\[${VERSION}\\][\\s\\S]*?(?=## \\[|$)`);
  const match = content.match(regex);
  return match ? match[0].trim() : `v${VERSION}`;
}

// 代理配置
const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 7897;

// GitHub API 请求（通过代理）
function githubRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    // 先连接代理
    const proxyReq = require('http').request({
      host: PROXY_HOST,
      port: PROXY_PORT,
      method: 'CONNECT',
      path: 'api.github.com:443'
    });

    proxyReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`代理连接失败: ${res.statusCode}`));
        return;
      }

      const tlsSocket = require('tls').connect({
        socket: socket,
        servername: 'api.github.com'
      }, () => {
        const reqData = data ? JSON.stringify(data) : '';
        const headers = [
          `${method} ${endpoint} HTTP/1.1`,
          'Host: api.github.com',
          'User-Agent: Release-Script',
          `Authorization: token ${GITHUB_TOKEN}`,
          'Accept: application/vnd.github.v3+json',
          'Content-Type: application/json',
          `Content-Length: ${Buffer.byteLength(reqData)}`,
          'Connection: close',
          '',
          reqData
        ].join('\r\n');

        tlsSocket.write(headers);

        let response = '';
        tlsSocket.on('data', chunk => response += chunk);
        tlsSocket.on('end', () => {
          const parts = response.split('\r\n\r\n');
          const statusLine = parts[0].split('\r\n')[0];
          const statusCode = parseInt(statusLine.split(' ')[1]);
          const body = parts.slice(1).join('\r\n\r\n');

          if (statusCode >= 200 && statusCode < 300) {
            resolve(body ? JSON.parse(body) : {});
          } else {
            reject(new Error(`GitHub API 错误: ${statusCode} - ${body}`));
          }
        });
      });

      tlsSocket.on('error', reject);
    });

    proxyReq.on('error', reject);
    proxyReq.end();
  });
}

// 上传文件到 Release（通过代理）
function uploadAsset(uploadUrl, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(filePath);
    const url = new URL(uploadUrl.replace('{?name,label}', ''));
    url.searchParams.set('name', fileName);

    console.log(`  上传中: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

    // 通过代理连接
    const proxyReq = require('http').request({
      host: PROXY_HOST,
      port: PROXY_PORT,
      method: 'CONNECT',
      path: `${url.hostname}:443`
    });

    proxyReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`代理连接失败: ${res.statusCode}`));
        return;
      }

      const tlsSocket = require('tls').connect({
        socket: socket,
        servername: url.hostname
      }, () => {
        // 构建 HTTP 请求
        const headers = [
          `POST ${url.pathname}${url.search} HTTP/1.1`,
          `Host: ${url.hostname}`,
          'User-Agent: Release-Script',
          `Authorization: token ${GITHUB_TOKEN}`,
          'Content-Type: application/octet-stream',
          `Content-Length: ${fileBuffer.length}`,
          'Connection: close',
          '',
          ''
        ].join('\r\n');

        tlsSocket.write(headers);
        tlsSocket.write(fileBuffer);

        let response = '';
        tlsSocket.on('data', chunk => response += chunk);
        tlsSocket.on('end', () => {
          const parts = response.split('\r\n\r\n');
          const statusLine = parts[0].split('\r\n')[0];
          const statusCode = parseInt(statusLine.split(' ')[1]);
          const body = parts.slice(1).join('\r\n\r\n');

          if (statusCode >= 200 && statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              resolve({ success: true });
            }
          } else {
            reject(new Error(`上传失败: ${statusCode} - ${body.substring(0, 200)}`));
          }
        });
      });

      tlsSocket.on('error', reject);
    });

    proxyReq.on('error', reject);
    proxyReq.end();
  });
}

async function main() {
  console.log(`\n🚀 发布 v${VERSION} 到 GitHub Releases\n`);

  if (!GITHUB_TOKEN) {
    console.error('❌ 请设置 GITHUB_TOKEN 环境变量');
    console.log('\n获取 Token: https://github.com/settings/tokens');
    console.log('需要 repo 权限\n');
    process.exit(1);
  }

  // 查找安装程序（只找当前版本的）
  const distDir = path.join(__dirname, '..', 'dist');
  const files = fs.readdirSync(distDir).filter(f => 
    f.endsWith('.exe') && f.includes('Setup') && f.includes(VERSION)
  );
  
  if (files.length === 0) {
    console.error('❌ 未找到安装程序，请先运行 npm run electron:build:win');
    process.exit(1);
  }

  console.log('📦 找到以下文件:');
  files.forEach(f => {
    const size = fs.statSync(path.join(distDir, f)).size;
    console.log(`  - ${f} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  });

  // 获取更新日志
  const changelog = getChangelog();
  console.log(`\n📝 更新日志:\n${changelog.substring(0, 200)}...\n`);

  try {
    // 检查是否已存在该版本
    console.log('🔍 检查是否已存在该版本...');
    let release;
    try {
      release = await githubRequest('GET', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/v${VERSION}`);
      console.log(`ℹ️  版本 v${VERSION} 已存在，检查是否需要上传文件...`);
      
      // 检查是否已有文件
      if (release.assets && release.assets.length > 0) {
        console.log(`✅ 已有 ${release.assets.length} 个文件，跳过上传`);
        console.log(`🔗 ${release.html_url}`);
        return;
      }
      console.log('📤 Release 存在但无文件，继续上传...');
    } catch (e) {
      // 版本不存在，创建新的
      release = null;
    }

    // 创建 Release（如果不存在）
    if (!release) {
      console.log('📤 创建 Release...');
      release = await githubRequest('POST', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`, {
        tag_name: `v${VERSION}`,
        name: `v${VERSION}`,
        body: changelog,
        draft: false,
        prerelease: false
      });
      console.log(`✅ Release 创建成功: ${release.html_url}`);
    }

    // 上传文件
    console.log('\n📤 上传文件...');
    for (const file of files) {
      const filePath = path.join(distDir, file);
      // 重命名为包含平台信息的文件名
      const newName = file.includes('x64') 
        ? `wenyanwen-${VERSION}-windows-x64-setup.exe`
        : file.includes('ia32')
        ? `wenyanwen-${VERSION}-windows-ia32-setup.exe`
        : `wenyanwen-${VERSION}-windows-setup.exe`;
      
      await uploadAsset(release.upload_url, filePath, newName);
      console.log(`  ✅ ${newName}`);
    }

    console.log(`\n✅ 发布完成！`);
    console.log(`🔗 ${release.html_url}`);
    console.log(`\n📱 用户现在可以通过检查更新获取 v${VERSION}`);

  } catch (error) {
    console.error('\n❌ 发布失败:', error.message);
    process.exit(1);
  }
}

main();
