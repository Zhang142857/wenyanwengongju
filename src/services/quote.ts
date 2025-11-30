import type { Quote } from '@/types';

/**
 * 名言服务类
 * 负责管理和获取每日名言
 */
export class QuoteService {
  private quotes: Quote[];

  constructor(quotes: Quote[] = []) {
    this.quotes = quotes;
  }

  /**
   * 设置名言列表
   */
  setQuotes(quotes: Quote[]): void {
    this.quotes = quotes;
  }

  /**
   * 获取所有名言
   */
  getAllQuotes(): Quote[] {
    return this.quotes;
  }

  /**
   * 随机获取一条名言
   */
  getRandomQuote(): Quote | null {
    if (this.quotes.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    return this.quotes[randomIndex];
  }

  /**
   * 按日期获取名言
   * 使用日期作为种子，确保同一天返回相同的名言
   */
  getQuoteByDate(date: Date = new Date()): Quote | null {
    if (this.quotes.length === 0) {
      return null;
    }

    // 使用年月日作为种子
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 简单的哈希算法
    const seed = year * 10000 + month * 100 + day;
    const index = seed % this.quotes.length;

    return this.quotes[index];
  }

  /**
   * 添加名言
   */
  addQuote(quote: Quote): void {
    this.quotes.push(quote);
  }

  /**
   * 根据ID获取名言
   */
  getQuoteById(id: string): Quote | null {
    return this.quotes.find(q => q.id === id) || null;
  }
}
