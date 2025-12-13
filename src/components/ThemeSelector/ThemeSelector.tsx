'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { builtinThemes } from '../../services/themeService';
import type { Theme } from '../../types/theme';
import styles from './ThemeSelector.module.css';

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const {
    currentThemeId,
    customThemes,
    allThemes,
    setTheme,
    importThemeFromJson,
    removeCustomTheme,
    exportThemeToJson,
  } = useThemeStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes = allThemes();
  const currentTheme = themes.find(t => t.id === currentThemeId);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeSelect = (id: string) => {
    setTheme(id);
    setIsOpen(false);
  };

  const handleImport = () => {
    setImportError('');
    const result = importThemeFromJson(importJson);
    if (result.success) {
      setImportJson('');
      setShowImport(false);
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
    <div className={`${styles.container} ${className || ''}`} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        title="切换主题"
      >
        <span
          className={styles.colorPreview}
          style={{ backgroundColor: currentTheme?.colors.primary }}
        />
        <span className={styles.themeName}>{currentTheme?.name || '选择主题'}</span>
        <span className={styles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.themeList}>
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`${styles.themeItem} ${theme.id === currentThemeId ? styles.active : ''}`}
                onClick={() => handleThemeSelect(theme.id)}
              >
                <span
                  className={styles.colorPreview}
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div className={styles.themeInfo}>
                  <span className={styles.themeItemName}>{theme.name}</span>
                  {theme.description && (
                    <span className={styles.themeDesc}>{theme.description}</span>
                  )}
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.actionBtn}
                    onClick={(e) => handleExport(theme.id, e)}
                    title="导出主题"
                  >
                    📤
                  </button>
                  {!isBuiltin(theme.id) && (
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => handleDelete(theme.id, e)}
                      title="删除主题"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.divider} />

          <button
            className={styles.importBtn}
            onClick={() => setShowImport(!showImport)}
          >
            📥 导入主题
          </button>

          {showImport && (
            <div className={styles.importPanel}>
              <textarea
                className={styles.importTextarea}
                placeholder="粘贴主题 JSON 或点击下方按钮选择文件..."
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
              />
              {importError && <p className={styles.error}>{importError}</p>}
              <div className={styles.importActions}>
                <button
                  className={styles.fileBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  选择文件
                </button>
                <button
                  className={styles.confirmBtn}
                  onClick={handleImport}
                  disabled={!importJson.trim()}
                >
                  确认导入
                </button>
              </div>
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

export default ThemeSelector;
