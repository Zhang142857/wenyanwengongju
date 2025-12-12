'use client';

import React, { useState, useCallback, memo } from 'react';
import { CharacterWeight } from '../types/weight';
import styles from './CharacterWeightEditor.module.css';

interface CharacterItemProps {
  char: string;
  weight: number;
  onWeightChange: (char: string, value: number) => void;
  onRemove: (char: string) => void;
  readonly: boolean;
}

const CharacterItem = memo(function CharacterItem({
  char,
  weight,
  onWeightChange,
  onRemove,
  readonly
}: CharacterItemProps) {
  return (
    <div className={styles.characterItem}>
      <span className={styles.charLabel}>{char}</span>

      <div className={styles.weightControl}>
        <input
          type="range"
          min="0"
          max="100"
          value={weight}
          onChange={(e) => onWeightChange(char, parseInt(e.target.value, 10))}
          className={styles.slider}
          disabled={readonly}
        />
        <input
          type="number"
          min="0"
          max="100"
          value={weight}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0 && val <= 100) {
              onWeightChange(char, val);
            }
          }}
          className={styles.weightInput}
          disabled={readonly}
        />
        <span className={styles.percent}>%</span>
      </div>

      {!readonly && (
        <button
          onClick={() => onRemove(char)}
          className={styles.removeBtn}
          title="移除此重点字"
        >
          ×
        </button>
      )}
    </div>
  );
});

export interface CharacterWeightEditorProps {
  characterWeights: CharacterWeight[];
  otherCharactersWeight: number;
  onCharacterWeightChange: (char: string, weight: number) => void;
  onAddCharacter: (char: string, weight: number) => void;
  onRemoveCharacter: (char: string) => void;
  onOtherWeightChange?: (weight: number) => void;
  readonly?: boolean;
}

export function CharacterWeightEditor({
  characterWeights,
  otherCharactersWeight,
  onCharacterWeightChange,
  onAddCharacter,
  onRemoveCharacter,
  onOtherWeightChange, // Kept for interface compatibility, though unused in logic
  readonly = false,
}: CharacterWeightEditorProps) {
  const [newChar, setNewChar] = useState('');
  const [newWeight, setNewWeight] = useState(10);

  // 计算总权重
  const totalCharWeight = characterWeights.reduce((sum, cw) => sum + cw.weight, 0);
  const totalWeight = totalCharWeight + otherCharactersWeight;
  const isWeightValid = totalWeight === 100;

  // 处理添加新重点字
  const handleAddCharacter = useCallback(() => {
    if (!newChar.trim() || readonly) return;

    // 检查是否已存在
    if (characterWeights.some(cw => cw.char === newChar.trim())) {
      return;
    }

    onAddCharacter(newChar.trim(), newWeight);
    setNewChar('');
    setNewWeight(10);
  }, [newChar, newWeight, characterWeights, onAddCharacter, readonly]);

  // Memoized handlers for items
  const handleWeightChange = useCallback((char: string, value: number) => {
    onCharacterWeightChange(char, value);
  }, [onCharacterWeightChange]);

  const handleRemove = useCallback((char: string) => {
    onRemoveCharacter(char);
  }, [onRemoveCharacter]);


  return (
    <div className={styles.editorContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>重点字权重设置</h3>
        {!isWeightValid && (
          <div className={styles.warning}>
            ⚠️ 权重总和为 {totalWeight}%，应为 100%
          </div>
        )}
      </div>

      {/* 重点字列表 */}
      <div className={styles.characterList}>
        {characterWeights.map((cw) => (
          <CharacterItem
            key={cw.char}
            char={cw.char}
            weight={cw.weight}
            onWeightChange={handleWeightChange}
            onRemove={handleRemove}
            readonly={readonly}
          />
        ))}

        {/* 其他字权重项 */}
        <div className={`${styles.characterItem} ${styles.otherChars}`}>
          <span className={styles.charLabel}>其他字</span>

          <div className={styles.weightControl}>
            <div className={styles.otherWeightBar}>
              <div
                className={styles.otherWeightFill}
                style={{ width: `${otherCharactersWeight}%` }}
              />
            </div>
            <span className={styles.otherWeightValue}>{otherCharactersWeight}%</span>
          </div>

          <span className={styles.autoLabel}>自动计算</span>
        </div>
      </div>

      {/* 添加新重点字 */}
      {!readonly && (
        <div className={styles.addSection}>
          <input
            type="text"
            value={newChar}
            onChange={(e) => setNewChar(e.target.value.slice(0, 1))}
            placeholder="输入字"
            className={styles.charInput}
            maxLength={1}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={newWeight}
            onChange={(e) => setNewWeight(parseInt(e.target.value, 10) || 0)}
            className={styles.weightInput}
          />
          <span className={styles.percent}>%</span>
          <button
            onClick={handleAddCharacter}
            className={styles.addBtn}
            disabled={!newChar.trim()}
          >
            添加
          </button>
        </div>
      )}

      {/* 权重汇总 */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span>重点字权重:</span>
          <span className={styles.summaryValue}>{totalCharWeight}%</span>
        </div>
        <div className={styles.summaryItem}>
          <span>其他字权重:</span>
          <span className={styles.summaryValue}>{otherCharactersWeight}%</span>
        </div>
        <div className={`${styles.summaryItem} ${styles.total} ${!isWeightValid ? styles.invalid : ''}`}>
          <span>总计:</span>
          <span className={styles.summaryValue}>{totalWeight}%</span>
        </div>
      </div>
    </div>
  );
}

export default CharacterWeightEditor;
