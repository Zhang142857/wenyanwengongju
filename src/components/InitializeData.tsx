'use client';

import { useEffect, useState } from 'react';
import { convertImportData } from '@/utils/import';
import type { ImportLibrary } from '@/utils/import';
import { configService } from '@/services/configService';

export default function InitializeData() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeDefaultData = async () => {
      try {
        // 第一步: 初始化配置服务（会自动迁移旧数据）
        console.log('🔧 初始化配置服务...');
        await configService.initialize();
        console.log('✅ 配置服务初始化完成');

        // 检查是否已经初始化
        const hasInitialized = localStorage.getItem('app_initialized');
        if (hasInitialized) {
          setInitialized(true);
          return;
        }

        // 检查是否在 Electron 环境中
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          const initData = await (window as any).electronAPI.getInitData();

          if (initData && initData.libraries && initData.focusWords) {
            console.log('从 Electron 获取初始化数据');

            // 导入默认库
            const storageData = convertImportData(initData.libraries as ImportLibrary[]);

            // 获取现有数据
            const existingDataStr = localStorage.getItem('classical_chinese_data');
            const existingData = existingDataStr ? JSON.parse(existingDataStr) : {
              libraries: [],
              quotes: [],
              definitions: [],
              translations: [],
              characterDefinitionLinks: [],
              sentenceTranslationLinks: [],
              shortSentences: [],
              keyCharacters: [],
            };

            // 合并库数据（避免重复）
            const mergedLibraries = [...existingData.libraries];
            for (const newLib of storageData.libraries) {
              const exists = mergedLibraries.some(lib => lib.name === newLib.name);
              if (!exists) {
                mergedLibraries.push(newLib);
              }
            }

            // 保存合并后的数据
            const finalData = {
              ...existingData,
              libraries: mergedLibraries,
            };
            localStorage.setItem('classical_chinese_data', JSON.stringify(finalData));

            // 同时更新到配置文件
            await configService.updateConfig({
              libraries: {
                ...configService.getConfig().libraries,
                defaultLibraries: mergedLibraries,
                focusWords: initData.focusWords,
              }
            });

            // 设置重点字列表（兼容旧代码）
            localStorage.setItem('keyCharacters', initData.focusWords);

            // 标记已初始化
            localStorage.setItem('app_initialized', 'true');
            localStorage.setItem('app_initialized_time', new Date().toISOString());

            console.log('✓ 默认数据初始化完成');
            console.log(`  - 导入了 ${storageData.libraries.length} 个文言文库`);
            console.log(`  - 设置了 ${initData.focusWords.length} 个重点字`);
          }
        }

        setInitialized(true);
      } catch (error) {
        console.error('初始化默认数据失败:', error);
        setInitialized(true);
      }
    };

    initializeDefaultData();
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
