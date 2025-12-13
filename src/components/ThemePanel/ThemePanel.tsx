'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { builtinThemes } from '../../services/themeService';
import type { Theme } from '../../types/theme';
import styles from './ThemePanel.module.css';

type PanelView = 'main' | 'add';

interface ThemePanelProps {
  className?: string;
}

export function ThemePanel({ className }: ThemePanelProps) {
  const {
    currentThemeId,
    customThemes,
    allThemes,
    setTheme,
    importThemeFromJson,
    addCustomTheme,
    removeCustomTheme,
    exportThemeToJson,
  } = useThemeStore();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PanelView>('main');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const themes = allThemes();
  const currentTheme = themes.find(t => t.id === currentThemeId);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setView('main');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeSelect = (id: string) => {
    setTheme(id);
  };

  const handleLocalImport = () => {
    setImportError('');
    const result = importThemeFromJson(importJson);
    if (result.success) {
      setImportJson('');
      setView('main');
    } else {
      setImportError(result.error || '导入失败');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportJson(content);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const json = exportThemeToJson(id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个主题吗？')) {
      removeCustomTheme(id);
    }
  };

  const isBuiltin = (id: string) => builtinThemes.some(t => t.id === id);

  return (
    <div className={`${styles.container} ${className || ''}`} ref={panelRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        title="主题设置"
      >
        <span className={styles.icon}>🎨</span>
      </button>

      {isOpen && (
        <div className={styles.panel}>
          {/* 头部 */}
          <div className={styles.header}>
            {view === 'main' && <span>主题</span>}
            {view === 'add' && <span>添加主题</span>}
            {view !== 'main' && (
              <button className={styles.backBtn} onClick={() => setView('main')}>
                ← 返回
              </button>
            )}
          </div>

          {/* 主视图 - 主题列表 */}
          {view === 'main' && (
            <>
              <div className={styles.themeList}>
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    className={`${styles.themeItem} ${theme.id === currentThemeId ? styles.active : ''}`}
                    onClick={() => handleThemeSelect(theme.id)}
                  >
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div className={styles.themeInfo}>
                      <span className={styles.themeName}>{theme.name}</span>
                      {theme.description && (
                        <span className={styles.themeDesc}>{theme.description}</span>
                      )}
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => handleExport(theme.id, e)}
                        title="导出"
                      >
                        📤
                      </button>
                      {!isBuiltin(theme.id) && (
                        <button
                          className={styles.actionBtn}
                          onClick={(e) => handleDelete(theme.id, e)}
                          title="删除"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className={styles.addBtn} onClick={() => setView('add')}>
                <span>＋</span> 添加主题
              </button>
            </>
          )}

          {/* 添加主题视图 */}
          {view === 'add' && (
            <div className={styles.addView}>
              <button
                className={styles.optionBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                📁 从本地文件导入
              </button>
              
              <div className={styles.divider}>或粘贴 JSON</div>
              
              <textarea
                className={styles.textarea}
                placeholder="粘贴主题 JSON..."
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
              />
              {importError && <p className={styles.error}>{importError}</p>}
              <button
                className={styles.confirmBtn}
                onClick={handleLocalImport}
                disabled={!importJson.trim()}
              >
                确认导入
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileImport}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ThemePanel;
