// 将 icon.png 转换为各种所需格式
const { Jimp } = require('jimp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

console.log('🎨 开始转换图标...\n');

const iconPath = path.join(__dirname, '..', 'icon.png');
const buildDir = path.join(__dirname, '..', 'build');

if (!fs.existsSync(iconPath)) {
    console.error('❌ 找不到 icon.png 文件');
    console.log('请确保 icon.png 在项目根目录');
    process.exit(1);
}

if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

async function convertIcon() {
    try {
        console.log('📖 读取 icon.png...');
        const originalImage = await Jimp.read(iconPath);
        console.log('✓ 图标读取成功\n');
        
        console.log('📦 生成 icon.ico (多尺寸)...');
        const sizes = [16, 32, 48, 64, 128, 256];
        const pngBuffers = [];
        
        for (const size of sizes) {
            const resized = originalImage.clone();
            await resized.contain({ w: size, h: size });
            const buffer = await resized.getBuffer('image/png');
            pngBuffers.push(buffer);
            console.log(`  ✓ 生成 ${size}x${size} PNG`);
        }
        
        const icoBuffer = await toIco(pngBuffers);
        fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
        console.log('✓ icon.ico 生成完成\n');
        
        console.log('📦 生成 installerHeader.bmp...');
        const header = new Jimp({ width: 150, height: 57, color: 0x8B4513FF });
        
        const headerIcon = originalImage.clone();
        await headerIcon.contain({ w: 50, h: 50 });
        header.composite(headerIcon, 50, 3);
        await header.write(path.join(buildDir, 'installerHeader.bmp'));
        console.log('✓ installerHeader.bmp 生成完成\n');
        
        console.log('📦 生成 installerSidebar.bmp...');
        const sidebar = new Jimp({ width: 164, height: 314 });
        
        for (let y = 0; y < 314; y++) {
            const ratio = y / 314;
            const r = Math.floor(139 + ratio * 66);
            const g = Math.floor(69 + ratio * 64);
            const b = Math.floor(19 + ratio * 44);
            const color = ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
            
            for (let x = 0; x < 164; x++) {
                sidebar.setPixelColor(color, x, y);
            }
        }
        
        const sidebarIcon = originalImage.clone();
        await sidebarIcon.contain({ w: 100, h: 100 });
        sidebar.composite(sidebarIcon, 32, 30);
        await sidebar.write(path.join(buildDir, 'installerSidebar.bmp'));
        console.log('✓ installerSidebar.bmp 生成完成\n');
        
        console.log('📦 复制图标到 public 目录...');
        const publicDir = path.join(__dirname, '..', 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        
        const icon512 = originalImage.clone();
        await icon512.contain({ w: 512, h: 512 });
        await icon512.write(path.join(publicDir, 'icon-512.png'));
        fs.copyFileSync(iconPath, path.join(publicDir, 'icon.png'));
        console.log('✓ 图标已复制到 public 目录\n');
        
        console.log('✅ 所有图标转换完成！\n');
        console.log('生成的文件:');
        console.log('  • build/icon.ico (多尺寸 ICO)');
        console.log('  • build/installerHeader.bmp (150x57)');
        console.log('  • build/installerSidebar.bmp (164x314)');
        console.log('  • public/icon.png (原始)');
        console.log('  • public/icon-512.png (512x512)\n');
        
    } catch (error) {
        console.error('❌ 转换失败:', error.message);
        process.exit(1);
    }
}

convertIcon();