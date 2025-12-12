/**
 * 更新配置注入模块
 * 
 * 允许在更新包中携带配置补丁，更新时自动应用到用户配置
 * 
 * 工作原理：
 * 1. 更新包中包含 update-patch.json 文件
 * 2. 应用启动时检测并应用补丁
 * 3. 补丁支持：添加、修改、删除、追加数组等操作
 * 4. 应用后删除补丁文件，避免重复执行
 */

const fs = require('fs');
const path = require('path');

/**
 * 补丁操作类型
 */
const PatchOperation = {
  SET: 'set',           // 设置值（覆盖）
  ADD: 'add',           // 添加（仅当不存在时）
  DELETE: 'delete',     // 删除
  APPEND: 'append',     // 追加到数组
  PREPEND: 'prepend',   // 插入到数组开头
  MERGE: 'merge',       // 深度合并对象
};

/**
 * 根据路径获取嵌套对象的值
 */
function getByPath(obj, pathStr) {
  const keys = pathStr.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * 根据路径设置嵌套对象的值
 */
function setByPath(obj, pathStr, value) {
  const keys = pathStr.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (current[key] === undefined || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

/**
 * 根据路径删除嵌套对象的属性
 */
function deleteByPath(obj, pathStr) {
  const keys = pathStr.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (current[key] === undefined) return;
    current = current[key];
  }
  
  delete current[lastKey];
}

/**
 * 深度合并对象
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * 应用单个补丁操作
 */
function applyPatchOperation(config, operation) {
  const { op, path: pathStr, value } = operation;
  
  switch (op) {
    case PatchOperation.SET:
      // 直接设置值
      setByPath(config, pathStr, value);
      console.log(`  ✓ SET ${pathStr}`);
      break;
      
    case PatchOperation.ADD:
      // 仅当不存在时添加
      if (getByPath(config, pathStr) === undefined) {
        setByPath(config, pathStr, value);
        console.log(`  ✓ ADD ${pathStr}`);
      } else {
        console.log(`  - SKIP ${pathStr} (已存在)`);
      }
      break;
      
    case PatchOperation.DELETE:
      // 删除属性
      deleteByPath(config, pathStr);
      console.log(`  ✓ DELETE ${pathStr}`);
      break;
      
    case PatchOperation.APPEND:
      // 追加到数组
      const arr = getByPath(config, pathStr);
      if (Array.isArray(arr)) {
        if (Array.isArray(value)) {
          arr.push(...value);
        } else {
          arr.push(value);
        }
        console.log(`  ✓ APPEND ${pathStr}`);
      } else {
        // 如果不是数组，创建新数组
        setByPath(config, pathStr, Array.isArray(value) ? value : [value]);
        console.log(`  ✓ APPEND ${pathStr} (创建新数组)`);
      }
      break;
      
    case PatchOperation.PREPEND:
      // 插入到数组开头
      const arr2 = getByPath(config, pathStr);
      if (Array.isArray(arr2)) {
        if (Array.isArray(value)) {
          arr2.unshift(...value);
        } else {
          arr2.unshift(value);
        }
        console.log(`  ✓ PREPEND ${pathStr}`);
      } else {
        setByPath(config, pathStr, Array.isArray(value) ? value : [value]);
        console.log(`  ✓ PREPEND ${pathStr} (创建新数组)`);
      }
      break;
      
    case PatchOperation.MERGE:
      // 深度合并对象
      const existing = getByPath(config, pathStr);
      if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        setByPath(config, pathStr, deepMerge(existing, value));
        console.log(`  ✓ MERGE ${pathStr}`);
      } else {
        setByPath(config, pathStr, value);
        console.log(`  ✓ MERGE ${pathStr} (创建新对象)`);
      }
      break;
      
    default:
      console.log(`  ⚠ 未知操作: ${op}`);
  }
  
  return config;
}

/**
 * 应用配置补丁
 * @param {object} config - 用户当前配置
 * @param {object} patch - 补丁对象
 * @returns {object} 应用补丁后的配置
 */
function applyConfigPatch(config, patch) {
  console.log(`📦 应用配置补丁 v${patch.version || 'unknown'}...`);
  
  if (patch.description) {
    console.log(`   ${patch.description}`);
  }
  
  let result = { ...config };
  
  // 应用所有操作
  if (Array.isArray(patch.operations)) {
    for (const operation of patch.operations) {
      result = applyPatchOperation(result, operation);
    }
  }
  
  // 更新版本信息
  if (patch.newVersion) {
    result.version = patch.newVersion;
  }
  
  return result;
}

/**
 * 检查并应用更新补丁
 * @param {string} userDataPath - 用户数据目录
 * @param {string} appPath - 应用目录
 * @returns {boolean} 是否应用了补丁
 */
function checkAndApplyUpdatePatch(userDataPath, appPath) {
  // 补丁文件位置（在 out 目录中）
  const patchPath = path.join(appPath, 'out', 'update-patch.json');
  const userConfigPath = path.join(userDataPath, 'app-config.json');
  
  // 检查补丁文件是否存在
  if (!fs.existsSync(patchPath)) {
    return false;
  }
  
  // 检查用户配置是否存在
  if (!fs.existsSync(userConfigPath)) {
    console.log('⚠ 用户配置不存在，跳过补丁');
    return false;
  }
  
  try {
    console.log('🔍 发现更新补丁文件...');
    
    const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
    const userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
    
    // 检查补丁是否已应用（通过版本号或补丁ID）
    const appliedPatches = userConfig._appliedPatches || [];
    if (patch.id && appliedPatches.includes(patch.id)) {
      console.log('✓ 补丁已应用过，跳过');
      return false;
    }
    
    // 备份用户配置
    const backupPath = path.join(userDataPath, `app-config.pre-patch.${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(userConfig, null, 2), 'utf8');
    console.log(`📦 已备份配置到: ${path.basename(backupPath)}`);
    
    // 应用补丁
    let newConfig = applyConfigPatch(userConfig, patch);
    
    // 记录已应用的补丁
    if (patch.id) {
      newConfig._appliedPatches = [...appliedPatches, patch.id];
    }
    
    // 保存新配置
    fs.writeFileSync(userConfigPath, JSON.stringify(newConfig, null, 2), 'utf8');
    console.log('✓ 配置补丁应用完成');
    
    // 删除补丁文件（避免重复应用）
    // 注意：在 asar 包中可能无法删除，所以用 _appliedPatches 来跟踪
    try {
      fs.unlinkSync(patchPath);
      console.log('✓ 补丁文件已清理');
    } catch (e) {
      // 在 asar 中无法删除，忽略
    }
    
    return true;
  } catch (error) {
    console.error('❌ 应用配置补丁失败:', error);
    return false;
  }
}

/**
 * 生成补丁文件模板
 */
function generatePatchTemplate() {
  return {
    id: `patch-${Date.now()}`,
    version: '1.0.1',
    newVersion: '1.0.1',
    description: '更新说明',
    operations: [
      {
        op: 'add',
        path: 'ai.newConfig',
        value: { enabled: true }
      },
      {
        op: 'append',
        path: 'ai.apiConfigs',
        value: {
          provider: 'new-provider',
          baseUrl: 'https://api.example.com',
          apiKey: '',
          model: 'model-name'
        }
      },
      {
        op: 'set',
        path: 'features.newFeature',
        value: true
      },
      {
        op: 'merge',
        path: 'system',
        value: {
          newSetting: 'value'
        }
      }
    ]
  };
}

module.exports = {
  PatchOperation,
  applyConfigPatch,
  checkAndApplyUpdatePatch,
  generatePatchTemplate,
  getByPath,
  setByPath,
  deleteByPath,
  deepMerge,
};
