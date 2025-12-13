'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { builtinThemes } from '../../services/themeService';
import {
  getThemeServers,
  fetchRemoteThemeList,
  fetchRemoteTheme,
  addThemeServer,
  removeThemeServer,
} from '../../services/remoteThemeService';
import type { Theme, ThemeMeta, ThemeServer } from '../../types/theme';
import styles from './ThemePanel.module.css';

type PanelView = 'main' | 'add' | 'servers' | 'remote-themes';

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
  const [servers, setServers] = useState<ThemeServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<ThemeServer | null>(null);
  const [remoteThemes, setRemoteThemes] = useState<ThemeMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newServerName, setNewServerName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const themes = allThemes();
  const currentTheme = themes.find(t => t.id === currentThemeId);

  // 加载服务器列表
  useEffect(() => {
    setServers(getThemeServers());
  }, []);

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

  const handleServerSelect = async (server: ThemeServer) => {
    setSelectedServer(server);
    setLoading(true);
    setRemoteThemes([]);
    
    const result = await fetchRemoteThemeList(server.url);
    setLoading(false);
    
    if (result.success && result.themes) {
      setRemoteThemes(result.themes);
      setView('remote-themes');
    } else {
      alert(`获取主题列表失败: ${result.error}`);
    }
  };

  const handleRemoteThemeSelect = async (themeMeta: ThemeMeta) => {
    if (!selectedServer) return;
    
    setLoading(true);
    const result = await fetchRemoteTheme(selectedServer.url, themeMeta.id);
    setLoading(false);

    if (result.success && result.theme) {
      // 检查是否已存在
      const existing = themes.find(t => t.id === result.theme!.id);
      if (existing) {
        // 直接应用
        setTheme(result.theme.id);
      } else {
        // 添加并应用
        addCustomTheme(result.theme);
        setTheme(result.theme.id);
      }
      setView('main');
    } else {
      alert(`下载主题失败: ${result.error}`);
    }
  };

  const handleAddServer = () => {
    if (!newServerUrl.trim()) return;
    const server: ThemeServer = {
      name: newServerName.trim() || newServerUrl,
      url: newServerUrl.trim(),
      enabled: true,
    };
    if (addThemeServer(server)) {
      setServers(getThemeServers());
      setNewServerUrl('');
      setNewServerName('');
    } else {
      alert('该服务器已存在');
    }
  };

  const handleRemoveServer = (url: string) => {
    if (confirm('确定要删除这个服务器吗？')) {
      removeThemeServer(url);
      setServers(getThemeServers());
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
            {view === 'servers' && <span>选择服务器</span>}
            {view === 'remote-themes' && <span>{selectedServer?.name}</span>}
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
              <button
                className={styles.optionBtn}
                onClick={() => setView('servers')}
              >
                🌐 从远程服务器导入
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

          {/* 服务器列表视图 */}
          {view === 'servers' && (
            <div className={styles.serversView}>
              <div className={styles.serverList}>
                {servers.filter(s => s.enabled).map((server) => (
                  <div
                    key={server.url}
                    className={styles.serverItem}
                    onClick={() => handleServerSelect(server)}
                  >
                    <span className={styles.serverIcon}>🖥️</span>
                    <div className={styles.serverInfo}>
                      <span className={styles.serverName}>{server.name}</span>
                      <span className={styles.serverUrl}>{server.url}</span>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveServer(server.url);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              
              <div className={styles.addServer}>
                <input
                  type="text"
                  placeholder="服务器名称（可选）"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="服务器地址 (https://...)"
                  value={newServerUrl}
                  onChange={(e) => setNewServerUrl(e.target.value)}
                  className={styles.input}
                />
                <button
                  className={styles.confirmBtn}
                  onClick={handleAddServer}
                  disabled={!newServerUrl.trim()}
                >
                  添加服务器
                </button>
              </div>
            </div>
          )}

          {/* 远程主题列表视图 */}
          {view === 'remote-themes' && (
            <div className={styles.remoteThemesView}>
              {loading ? (
                <div className={styles.loading}>加载中...</div>
              ) : (
                <div className={styles.themeList}>
                  {remoteThemes.map((theme) => (
                    <div
                      key={theme.id}
                      className={styles.themeItem}
                      onClick={() => handleRemoteThemeSelect(theme)}
                    >
                      <span
                        className={styles.colorDot}
                        style={{ backgroundColor: theme.previewColor }}
                      />
                      <div className={styles.themeInfo}>
                        <span className={styles.themeName}>{theme.name}</span>
                        {theme.description && (
                          <span className={styles.themeDesc}>{theme.description}</span>
                        )}
                      </div>
                      <span className={styles.downloadIcon}>⬇️</span>
                    </div>
                  ))}
                  {remoteThemes.length === 0 && (
                    <div className={styles.empty}>暂无主题</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ThemePanel;
