// 权重事件总线
// 实现订阅/发布机制，确保100ms内同步到所有订阅组件

import { UnifiedWeightConfig } from '../types/weight';

/**
 * 权重变更事件类型
 */
export type WeightEventType = 
  | 'config:loaded'
  | 'config:saved'
  | 'config:reset'
  | 'article:weight-changed'
  | 'article:included-changed'
  | 'article:range-selected'
  | 'article:added'
  | 'article:removed'
  | 'character:added'
  | 'character:removed'
  | 'character:weight-changed'
  | 'other-weight:changed';

/**
 * 权重变更事件数据
 */
export interface WeightEvent {
  type: WeightEventType;
  payload: {
    config: UnifiedWeightConfig;
    changedField?: string;
    previousValue?: unknown;
    newValue?: unknown;
  };
  timestamp: number;
}

/**
 * 事件监听器类型
 */
export type WeightEventListener = (event: WeightEvent) => void;

/**
 * 权重事件总线类
 * 实现发布/订阅模式，支持多组件间的数据同步
 */
export class WeightEventBus {
  private listeners: Map<WeightEventType | '*', Set<WeightEventListener>> = new Map();
  private eventQueue: WeightEvent[] = [];
  private isProcessing = false;
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 16; // 约60fps的批处理延迟
  private readonly MAX_SYNC_TIME = 100; // 最大同步时间100ms

  /**
   * 订阅特定类型的事件
   * @param eventType 事件类型，'*' 表示订阅所有事件
   * @param listener 事件监听器
   * @returns 取消订阅的函数
   */
  subscribe(eventType: WeightEventType | '*', listener: WeightEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * 发布事件
   * @param type 事件类型
   * @param payload 事件数据
   */
  publish(type: WeightEventType, payload: WeightEvent['payload']): void {
    const event: WeightEvent = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.eventQueue.push(event);
    this.scheduleProcessing();
  }

  /**
   * 调度事件处理
   * 使用批处理优化性能，同时确保100ms内完成同步
   */
  private scheduleProcessing(): void {
    if (this.batchTimeout) {
      return; // 已有调度，等待批处理
    }

    this.batchTimeout = setTimeout(() => {
      this.processEvents();
      this.batchTimeout = null;
    }, this.BATCH_DELAY);
  }


  /**
   * 处理事件队列
   */
  private processEvents(): void {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToProcess) {
      // 检查是否超时
      if (Date.now() - startTime > this.MAX_SYNC_TIME) {
        console.warn('WeightEventBus: Event processing exceeded 100ms limit');
        // 将未处理的事件放回队列
        this.eventQueue.unshift(...eventsToProcess.slice(eventsToProcess.indexOf(event)));
        break;
      }

      this.notifyListeners(event);
    }

    this.isProcessing = false;

    // 如果还有未处理的事件，继续调度
    if (this.eventQueue.length > 0) {
      this.scheduleProcessing();
    }
  }

  /**
   * 通知所有相关监听器
   */
  private notifyListeners(event: WeightEvent): void {
    // 通知特定类型的监听器
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`WeightEventBus: Error in listener for ${event.type}:`, error);
        }
      });
    }

    // 通知通配符监听器
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('WeightEventBus: Error in wildcard listener:', error);
        }
      });
    }
  }

  /**
   * 立即处理所有待处理事件（用于测试或紧急同步）
   */
  flush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.processEvents();
  }

  /**
   * 获取当前订阅者数量
   */
  getSubscriberCount(eventType?: WeightEventType | '*'): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size ?? 0;
    }
    let total = 0;
    this.listeners.forEach(set => {
      total += set.size;
    });
    return total;
  }

  /**
   * 清除所有订阅
   */
  clear(): void {
    this.listeners.clear();
    this.eventQueue = [];
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// 导出默认实例
export const weightEventBus = new WeightEventBus();
