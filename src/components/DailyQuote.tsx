'use client'

import { useEffect, useState } from 'react'
import { QuoteService } from '@/services/quote'
import type { Quote } from '@/types'
import styles from './DailyQuote.module.css'

interface DailyQuoteProps {
  quoteService: QuoteService
}

export default function DailyQuote({ quoteService }: DailyQuoteProps) {
  const [quote, setQuote] = useState<Quote | null>(null)

  useEffect(() => {
    // 获取今日名言
    const todayQuote = quoteService.getQuoteByDate()
    setQuote(todayQuote)
  }, [quoteService])

  return (
    <div className={styles.quoteContainer}>
      <h3 className={styles.quoteHeader}>每日一言</h3>
      
      {quote ? (
        <>
          <p className={styles.quoteText}>
            {quote.text}
          </p>
          <p className={styles.quoteAuthor}>
            {quote.author}
          </p>
        </>
      ) : (
        <p className={styles.noQuote}>暂无名言</p>
      )}
    </div>
  )
}
