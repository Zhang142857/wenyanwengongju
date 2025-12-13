'use client';

import { useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * 主题提供者组件
 * 在应用启动时初始化主题系统
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { initialize, isLoaded } = useThemeStore();

  useEffect(() => {
    if (!isLoaded) {
      initialize();
    }
  }, [initialize, isLoaded]);

  return <>{children}</>;
}

export default ThemeProvider;
