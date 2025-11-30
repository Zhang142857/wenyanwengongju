'use client'

import type { Definition } from '@/types'
import styles from './DefinitionTooltip.module.css'

interface DefinitionTooltipProps {
  definitions: Definition[]
  x: number
  y: number
}

export default function DefinitionTooltip({ definitions, x, y }: DefinitionTooltipProps) {
  if (definitions.length === 0) return null

  // 调整位置确保不超出屏幕
  const adjustedX = Math.min(x, window.innerWidth - 220)
  const adjustedY = Math.max(y - 10, 10)

  return (
    <div className={styles.tooltip} style={{ left: adjustedX, top: adjustedY }}>
      <div className={styles.arrow} />
      <div className={styles.content}>
        {definitions.map((def, index) => (
          <div key={def.id} className={styles.item}>
            <span className={styles.index}>{index + 1}.</span>
            <span className={styles.text}>{def.content}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
