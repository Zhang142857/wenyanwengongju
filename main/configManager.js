/**
 * 配置文件管理器
 * 
 * 实现 config/temp 双目录配置管理机制：
 * - config 目录：长期存储，用户可直接操作
 * - temp 目录：运行时使用，程序启动时从 config 复制
 * 
 * 特性：
 * 1. 程序启动时从 config 复制到 temp
 * 2. 监听 config 目录变化，自动同步到 temp
 * 3. 程序内修改配置时，同步保存到 config
 * 4. 配置目录位于程序目录中，便于用户管理
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// 配置文件名常量
const CONFIG_FILES = {
  APP_CONFIG: 'app-config.json',
  LIBRARIES: 'libraries.json',
  WEIGHTS: 'weights.json',
};

// 默认配置
const DEFAULT_APP_CONFIG = {
  schemaVersion: 2,
  version: '1.0.0',
  edition: 'custom',
  ai: {
    configGroups: [
      {
        id: 'default-fast',
        name: '快速模式',
        description: '使用Ling-flash模型，速度快，适合大批量处理',
        provider: 'siliconflow',
        baseUrl: 'https://api.siliconflow.cn/v1',
        apiKeys: [
          'sk-vkasvvxaewwtnrfnyjkdqizcubmwlvywlbzuvgsfjotoxtrg',
          'sk-vzuzylxxtolfxmlcmmhykqgctgiuivbfgtlwebcjcxpdlqyv',
          'sk-cplztrsifchetezkbabzxrzsnmlyvuwlspevkgpmztfksthz',
          'sk-izfpkafaxakjrexfsecdkoqxtearoidybzootmwzjpbofqnx',
          'sk-mkdvcwoseuxtfmltgmnxxiaaornbkrookxbqctiuvjgweecw',
          'sk-limxenepsomcnviqzvoevkzmngcihkmvezrlamjqkmtblrfs',
          'sk-qtfeqncvnoftrgngdzxhhpfvovgcigftdfyohrpxxoycdrdf',
        ],
        model: 'inclusionAI/Ling-flash-2.0',
        isThinkingModel: false,
        concurrency: {
          aiDefinitionConcurrency: 30,
          shortSentenceConcurrency: 34,
          batchDelayMs: 100,
          retryDelayMs: 500,
        },
      },
    ],
    activeGroupId: 'default-fast',
    concurrency: {
      aiDefinitionConcurrency: 30,
      shortSentenceConcurrency: 34,
      batchDelayMs: 100,
      retryDelayMs: 500,
    },
  },
  libraries: {
    defaultLibraries: [],
    focusWords: '安卑备被鄙毕薄策长称诚惩驰出辞次箪当道得等敌吊度端恶发凡方分奉否夫扶拂福富更苟固故顾观冠光归过好号还患惠或极寂加间见将角借尽就居举具决绝开可苦乐类利隶良临鳞令妙名谋奇骑前强且清情请穷屈去阙容乳善尚少舍射甚胜施食使始市恃是适书数遂所所以通图徒推屯望为谓文闻下鲜贤相效屑谢信行许学寻焉艳夷遗已义异易诣益意因引盈用友余与欲援缘杂然再曾争指至志质致诸主属著缀资子自足卒作坐乎者以而其于焉虽然则因且乃矣之',
    keyCharacters: [],
  },
  system: {
    appTitle: '文言文小工具',
    enableTour: true,
    hasPlayedTour: false,
    theme: 'gradient',
    backgroundSettings: {
      type: 'gradient',
      effect: 'none',
      effects: {
        blur: false,
        darken: false,
        grayscale: false,
        blurAmount: 8,
        brightness: 50,
        saturation: 100,
      },
    },
    autoFilter: {
      enabled: true,
      defaultLibraryId: '',
    },
  },
  features: {
    enableAIOrganize: true,
    enableExam: true,
    enableRegexGenerator: true,
    enableImport: true,
    enableManage: true,
  },
  tourPlayedRecord: {
    home: false,
    import: false,
    organize: false,
    aiOrganize: false,
    exam: false,
    manage: false,
    regexGenerator: false,
    query: false,
    settings: false,
    imageTour: false,
    examAnnouncement: false,
  },
};

const DEFAULT_LIBRARIES = {
  libraries: [],
  quotes: [],
  definitions: [],
  translations: [],
  characterDefinitionLinks: [],
  sentenceTranslationLinks: [],
  shortSentences: [],
  keyCharacters: [],
};

class ConfigManager {
  constructor() {
    this.configDir = null;
    this.tempDir = null;
    this.cacheDir = null;
    this.watchers = new Map();
    this.listeners = new Map();
    this.initialized = false;
  }

  /**
   * 获取程序根目录
   * 打包后：程序安装目录
   * 开发时：项目根目录
   */
  getAppRootDir() {
    if (app.isPackaged) {
      // 打包后，使用程序所在目录
      return path.dirname(app.getPath('exe'));
    } else {
      // 开发模式，使用项目根目录
      return path.join(__dirname, '..');
    }
  }

  /**
   * 初始化配置管理器
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    const rootDir = this.getAppRootDir();
    
    // 设置目录路径
    this.configDir = path.join(rootDir, 'config');
    this.tempDir = path.join(rootDir, 'temp');
    this.cacheDir = path.join(rootDir, 'cache');

    console.log('📁 配置管理器初始化...');
    console.log(`   程序目录: ${rootDir}`);
    console.log(`   配置目录: ${this.configDir}`);
    console.log(`   临时目录: ${this.tempDir}`);
    console.log(`   缓存目录: ${this.cacheDir}`);

    // 确保目录存在
    this.ensureDirectories();

    // 初始化配置文件
    await this.initializeConfigFiles();

    // 从 config 同步到 temp
    await this.syncConfigToTemp();

    // 启动文件监听
    this.startWatching();

    this.initialized = true;
    console.log('✅ 配置管理器初始化完成');
  }

  /**
   * 确保必要的目录存在
   */
  ensureDirectories() {
    const dirs = [
      this.configDir,
      this.tempDir,
      this.cacheDir,
      path.join(this.cacheDir, 'backgrounds'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   创建目录: ${dir}`);
      }
    }
  }

  /**
   * 初始化配置文件（如果不存在则创建默认配置）
   */
  async initializeConfigFiles() {
    // 检查是否需要从旧位置迁移数据
    await this.migrateFromOldLocation();

    // 确保 app-config.json 存在
    const appConfigPath = path.join(this.configDir, CONFIG_FILES.APP_CONFIG);
    if (!fs.existsSync(appConfigPath)) {
      console.log('   创建默认应用配置...');
      this.writeJsonFile(appConfigPath, DEFAULT_APP_CONFIG);
    }

    // 确保 libraries.json 存在
    const librariesPath = path.join(this.configDir, CONFIG_FILES.LIBRARIES);
    if (!fs.existsSync(librariesPath)) {
      console.log('   创建默认库数据...');
      this.writeJsonFile(librariesPath, DEFAULT_LIBRARIES);
    }
  }

  /**
   * 从旧位置迁移数据（%APPDATA%）
   */
  async migrateFromOldLocation() {
    const userDataPath = app.getPath('userData');
    const migrationFlagPath = path.join(this.configDir, '.migrated');

    // 如果已经迁移过，跳过
    if (fs.existsSync(migrationFlagPath)) {
      return;
    }

    console.log('🔄 检查是否需要迁移旧数据...');

    let migrated = false;

    // 迁移应用配置
    const oldConfigPath = path.join(userDataPath, 'app-config.json');
    const newConfigPath = path.join(this.configDir, CONFIG_FILES.APP_CONFIG);
    if (fs.existsSync(oldConfigPath) && !fs.existsSync(newConfigPath)) {
      try {
        const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
        this.writeJsonFile(newConfigPath, oldConfig);
        console.log('   ✓ 迁移应用配置');
        migrated = true;
      } catch (error) {
        console.error('   ✗ 迁移应用配置失败:', error.message);
      }
    }

    // 迁移库数据
    const oldLibrariesPath = path.join(userDataPath, 'classical-chinese-data.json');
    const newLibrariesPath = path.join(this.configDir, CONFIG_FILES.LIBRARIES);
    if (fs.existsSync(oldLibrariesPath) && !fs.existsSync(newLibrariesPath)) {
      try {
        const oldLibraries = JSON.parse(fs.readFileSync(oldLibrariesPath, 'utf8'));
        this.writeJsonFile(newLibrariesPath, oldLibraries);
        console.log('   ✓ 迁移库数据');
        migrated = true;
      } catch (error) {
        console.error('   ✗ 迁移库数据失败:', error.message);
      }
    }

    // 迁移背景媒体
    const oldBackgroundsDir = path.join(userDataPath, 'backgrounds');
    const newBackgroundsDir = path.join(this.cacheDir, 'backgrounds');
    if (fs.existsSync(oldBackgroundsDir)) {
      try {
        const files = fs.readdirSync(oldBackgroundsDir);
        for (const file of files) {
          const oldPath = path.join(oldBackgroundsDir, file);
          const newPath = path.join(newBackgroundsDir, file);
          if (!fs.existsSync(newPath)) {
            fs.copyFileSync(oldPath, newPath);
          }
        }
        if (files.length > 0) {
          console.log(`   ✓ 迁移 ${files.length} 个背景媒体文件`);
          migrated = true;
        }
      } catch (error) {
        console.error('   ✗ 迁移背景媒体失败:', error.message);
      }
    }

    // 创建迁移标记
    if (migrated) {
      fs.writeFileSync(migrationFlagPath, JSON.stringify({
        migratedAt: new Date().toISOString(),
        from: userDataPath,
      }, null, 2));
      console.log('✅ 数据迁移完成');
    } else {
      // 即使没有迁移，也创建标记避免重复检查
      fs.writeFileSync(migrationFlagPath, JSON.stringify({
        migratedAt: new Date().toISOString(),
        note: 'No data to migrate',
      }, null, 2));
    }
  }

  /**
   * 从 config 目录同步到 temp 目录
   */
  async syncConfigToTemp() {
    console.log('📋 同步配置到临时目录...');

    const files = [CONFIG_FILES.APP_CONFIG, CONFIG_FILES.LIBRARIES, CONFIG_FILES.WEIGHTS];

    for (const file of files) {
      const configPath = path.join(this.configDir, file);
      const tempPath = path.join(this.tempDir, file);

      if (fs.existsSync(configPath)) {
        try {
          fs.copyFileSync(configPath, tempPath);
          console.log(`   ✓ 同步 ${file}`);
        } catch (error) {
          console.error(`   ✗ 同步 ${file} 失败:`, error.message);
        }
      }
    }
  }

  /**
   * 启动文件监听
   */
  startWatching() {
    console.log('👁️ 启动配置文件监听...');

    // 监听 config 目录
    try {
      const watcher = fs.watch(this.configDir, { persistent: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.json')) {
          console.log(`📝 检测到配置变化: ${filename} (${eventType})`);
          this.handleConfigChange(filename);
        }
      });

      this.watchers.set('config', watcher);
      console.log('   ✓ 配置目录监听已启动');
    } catch (error) {
      console.error('   ✗ 启动配置目录监听失败:', error.message);
    }
  }

  /**
   * 处理配置文件变化
   */
  handleConfigChange(filename) {
    const configPath = path.join(this.configDir, filename);
    const tempPath = path.join(this.tempDir, filename);

    // 延迟处理，避免文件写入未完成
    setTimeout(() => {
      try {
        if (fs.existsSync(configPath)) {
          // 验证 JSON 格式
          const content = fs.readFileSync(configPath, 'utf8');
          JSON.parse(content); // 验证是否为有效 JSON

          // 复制到 temp
          fs.copyFileSync(configPath, tempPath);
          console.log(`   ✓ 已同步 ${filename} 到临时目录`);

          // 通知监听器
          this.notifyListeners(filename);
        }
      } catch (error) {
        console.error(`   ✗ 处理配置变化失败 (${filename}):`, error.message);
      }
    }, 100);
  }

  /**
   * 停止文件监听
   */
  stopWatching() {
    for (const [name, watcher] of this.watchers) {
      watcher.close();
      console.log(`   关闭监听: ${name}`);
    }
    this.watchers.clear();
  }

  // ==================== 配置读写方法 ====================

  /**
   * 读取应用配置
   */
  getAppConfig() {
    return this.readConfig(CONFIG_FILES.APP_CONFIG, DEFAULT_APP_CONFIG);
  }

  /**
   * 保存应用配置
   */
  saveAppConfig(config) {
    return this.saveConfig(CONFIG_FILES.APP_CONFIG, config);
  }

  /**
   * 读取库数据
   */
  getLibraries() {
    return this.readConfig(CONFIG_FILES.LIBRARIES, DEFAULT_LIBRARIES);
  }

  /**
   * 保存库数据
   */
  saveLibraries(libraries) {
    return this.saveConfig(CONFIG_FILES.LIBRARIES, libraries);
  }

  /**
   * 读取配置文件（从 temp 目录）
   */
  readConfig(filename, defaultValue = null) {
    const tempPath = path.join(this.tempDir, filename);
    const configPath = path.join(this.configDir, filename);

    // 优先从 temp 读取
    if (fs.existsSync(tempPath)) {
      try {
        return JSON.parse(fs.readFileSync(tempPath, 'utf8'));
      } catch (error) {
        console.error(`读取临时配置失败 (${filename}):`, error.message);
      }
    }

    // 回退到 config 目录
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (error) {
        console.error(`读取配置失败 (${filename}):`, error.message);
      }
    }

    return defaultValue;
  }

  /**
   * 保存配置文件（同时保存到 config 和 temp）
   */
  saveConfig(filename, data) {
    const configPath = path.join(this.configDir, filename);
    const tempPath = path.join(this.tempDir, filename);

    try {
      const content = JSON.stringify(data, null, 2);

      // 保存到 config（长期存储）
      fs.writeFileSync(configPath, content, 'utf8');

      // 保存到 temp（运行时使用）
      fs.writeFileSync(tempPath, content, 'utf8');

      console.log(`✓ 配置已保存: ${filename}`);
      return true;
    } catch (error) {
      console.error(`✗ 保存配置失败 (${filename}):`, error.message);
      return false;
    }
  }

  /**
   * 写入 JSON 文件
   */
  writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  // ==================== 监听器管理 ====================

  /**
   * 添加配置变化监听器
   */
  addListener(filename, callback) {
    if (!this.listeners.has(filename)) {
      this.listeners.set(filename, new Set());
    }
    this.listeners.get(filename).add(callback);

    // 返回取消监听的函数
    return () => {
      this.listeners.get(filename)?.delete(callback);
    };
  }

  /**
   * 通知监听器
   */
  notifyListeners(filename) {
    const callbacks = this.listeners.get(filename);
    if (callbacks) {
      const data = this.readConfig(filename);
      for (const callback of callbacks) {
        try {
          callback(data, filename);
        } catch (error) {
          console.error('监听器回调错误:', error);
        }
      }
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 获取缓存目录路径
   */
  getCacheDir() {
    return this.cacheDir;
  }

  /**
   * 获取背景媒体目录
   */
  getBackgroundsDir() {
    return path.join(this.cacheDir, 'backgrounds');
  }

  /**
   * 清理缓存
   */
  clearCache() {
    try {
      const backgroundsDir = this.getBackgroundsDir();
      if (fs.existsSync(backgroundsDir)) {
        const files = fs.readdirSync(backgroundsDir);
        for (const file of files) {
          fs.unlinkSync(path.join(backgroundsDir, file));
        }
        console.log(`✓ 已清理 ${files.length} 个缓存文件`);
      }
      return true;
    } catch (error) {
      console.error('清理缓存失败:', error);
      return false;
    }
  }

  // ==================== 目录信息 ====================

  /**
   * 获取配置目录路径
   */
  getConfigDir() {
    return this.configDir;
  }

  /**
   * 获取临时目录路径
   */
  getTempDir() {
    return this.tempDir;
  }

  /**
   * 获取所有目录信息
   */
  getDirectoryInfo() {
    return {
      root: this.getAppRootDir(),
      config: this.configDir,
      temp: this.tempDir,
      cache: this.cacheDir,
      backgrounds: this.getBackgroundsDir(),
    };
  }

  /**
   * 销毁配置管理器
   */
  destroy() {
    this.stopWatching();
    this.listeners.clear();
    this.initialized = false;
  }
}

// 创建单例
const configManager = new ConfigManager();

module.exports = {
  configManager,
  ConfigManager,
  CONFIG_FILES,
  DEFAULT_APP_CONFIG,
  DEFAULT_LIBRARIES,
};
