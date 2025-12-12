'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import styles from './regex-generator.module.css'
import { configService } from '@/services/configService'
import ApiConfigSelector from '@/components/ApiConfigSelector'

export default function RegexGeneratorPage() {
  const [apiReady, setApiReady] = useState(false)
  const [requirement, setRequirement] = useState('')
  const [result, setResult] = useState<{ method: string; regex: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<string[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // 初始化配置服务
  useEffect(() => {
    const initConfig = async () => {
      try {
        await configService.initialize()
        setApiReady(true)
      } catch (err) {
        console.error('配置服务初始化失败:', err)
        setError('配置服务初始化失败，请刷新页面重试')
      }
    }
    initConfig()
  }, [])

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      setError('请输入需求描述')
      return
    }

    // 从配置服务获取API配置
    const apiConfig = configService.getNextApiConfig()
    if (!apiConfig) {
      setError('未配置API Key，请在设置中添加API配置')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setStreamingContent('')
    setIsStreaming(true)

    // 创建超时控制器
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时

    try {
      console.log('开始生成正则表达式...')
      console.log(`[正则生成] 使用模型: ${apiConfig.model}`)
      const startTime = Date.now()
      
      const prompt = `你是一个正则表达式专家。用户需要一个正则表达式来实现以下需求：

${requirement}

请严格按照以下格式回复（不要使用Markdown格式符号如**）：

方法说明：
[详细说明实现思路和方法，解释正则表达式的工作原理]

正则表达式：
[在这里单独一行写出正则表达式代码，不要用反引号或其他符号包裹]

要求：
1. 正则表达式必须单独成行，不要有任何其他文字
2. 正则表达式要准确可用，可以直接在JavaScript中使用
3. 如果有多种实现方式，选择最简洁高效的
4. 考虑边界情况和特殊字符的处理`

      console.log('发送API请求（流式）...')
      
      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          stream: true, // 启用流式输出
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      console.log('API响应状态:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API错误响应:', errorText)
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let reasoningText = '' // 思考过程
      let answerText = '' // 最终回答
      let buffer = ''
      let isDone = false

      if (!reader) {
        throw new Error('无法读取响应流')
      }

      // 辅助函数：尝试解析JSON
      const tryParseJSON = (str: string): unknown | null => {
        try {
          return JSON.parse(str)
        } catch {
          return null
        }
      }

      // 辅助函数：处理单行数据，返回是否收到[DONE]
      const processLine = (line: string): boolean => {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) return false
        
        const data = trimmed.slice(6)
        if (data === '[DONE]') return true
        
        const parsed = tryParseJSON(data)
        if (parsed && typeof parsed === 'object') {
          const obj = parsed as Record<string, unknown>
          
          if (obj.choices && Array.isArray(obj.choices)) {
            const choice = obj.choices[0] as Record<string, unknown> | undefined
            if (choice?.delta && typeof choice.delta === 'object') {
              const delta = choice.delta as Record<string, unknown>
              
              // 思考过程 (MiniMax特有)
              if (typeof delta.reasoning_content === 'string') {
                reasoningText += delta.reasoning_content
                setStreamingContent(reasoningText + (answerText ? '\n\n---\n\n' + answerText : ''))
              }
              
              // 最终回答
              if (typeof delta.content === 'string') {
                answerText += delta.content
                setStreamingContent(reasoningText + (answerText ? '\n\n---\n\n' + answerText : ''))
              }
            }
          }
        }
        return false
      }

      // 简单的流式读取循环
      while (!isDone) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('流式响应完成')
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // 处理所有完整的行
        let newlineIndex: number
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.substring(0, newlineIndex)
          buffer = buffer.substring(newlineIndex + 1)
          if (processLine(line)) {
            isDone = true
            break
          }
        }
      }

      // 处理缓冲区中剩余的数据
      if (buffer.trim()) {
        processLine(buffer)
      }

      // 合并内容用于解析
      const fullContent = answerText || reasoningText

      const endTime = Date.now()
      console.log('生成完成，耗时:', endTime - startTime, 'ms')
      console.log('最终回答:', answerText)
      console.log('思考过程:', reasoningText.substring(0, 200))

      if (!fullContent) {
        throw new Error('API返回内容为空')
      }

      // 解析响应 - 从最终回答中提取
      let method = ''
      let regex = ''
      const content = answerText || fullContent

      // 提取方法说明
      const methodMatch = content.match(/方法说明[：:]\s*([\s\S]*?)(?=正则表达式[：:]|$)/i)
      if (methodMatch) {
        method = methodMatch[1].trim()
      }

      // 提取正则表达式 - 查找"正则表达式："后面的一行
      const regexLineMatch = content.match(/正则表达式[：:]\s*\n?(.+?)(?:\n|$)/i)
      if (regexLineMatch) {
        let extracted = regexLineMatch[1].trim()
        // 移除可能的代码格式符号
        extracted = extracted.replace(/^[`'"]+|[`'"]+$/g, '')
        // 移除开头和结尾的斜杠（保留中间内容）
        if (extracted.startsWith('/') && extracted.includes('/')) {
          const lastSlash = extracted.lastIndexOf('/')
          if (lastSlash > 0) {
            extracted = extracted.substring(1, lastSlash)
          }
        }
        regex = extracted
        console.log('提取到正则:', regex)
      }

      // 如果没有找到方法说明，使用完整内容
      if (!method) {
        method = content
      }

      setResult({
        method: method || '未能解析方法说明',
        regex: regex || '未能提取正则表达式，请查看右侧思考过程'
      })
      
      console.log('生成完成')
    } catch (err) {
      console.error('生成错误:', err)
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('请求超时，请重试')
        } else {
          setError(err.message)
        }
      } else {
        setError('生成失败，请重试')
      }
    } finally {
      setIsStreaming(false)
      setLoading(false)
    }
  }

  const handleTest = () => {
    if (!result?.regex || !testText) {
      setTestResult([])
      return
    }

    try {
      const regex = new RegExp(result.regex, 'g')
      const matches = testText.match(regex)
      setTestResult(matches || [])
    } catch (err) {
      setError('正则表达式格式错误')
      setTestResult([])
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>正则生成器</h1>
              <p className={styles.subtitle}>AI辅助生成正则表达式，支持各种查询需求</p>
            </div>
            <ApiConfigSelector className={styles.configSelector} />
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.mainLayout}>
            {/* 左侧：需求输入和结果 */}
            <div className={styles.leftPanel}>
              {/* 需求输入 */}
              <div className={styles.section}>
            <label className={styles.label}>需求描述</label>
            <textarea
              className={styles.textarea}
              placeholder='例如：匹配所有以"不"开头，以"乎"结尾的句子'
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              rows={4}
            />
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={loading || !requirement.trim()}
            >
              {loading ? 'AI正在思考中，请稍候（约30秒）...' : '生成正则表达式'}
            </button>
            {loading && (
              <div className={styles.loadingHint}>
                <p>⏳ AI正在分析您的需求并生成正则表达式...</p>
                <p>这通常需要20-30秒，请耐心等待</p>
              </div>
            )}
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          {/* 生成结果 */}
          {result && (
            <>
              <div className={styles.section}>
                <label className={styles.label}>方法说明</label>
                <div className={styles.resultBox}>
                  <pre className={styles.methodText}>{result.method}</pre>
                </div>
              </div>

              {result.regex && (
                <div className={styles.section}>
                  <div className={styles.labelRow}>
                    <label className={styles.label}>正则表达式</label>
                    <button
                      className={styles.copyBtn}
                      onClick={() => handleCopy(result.regex)}
                    >
                      复制
                    </button>
                  </div>
                  <div className={styles.regexBox}>
                    <code className={styles.regexCode}>{result.regex}</code>
                  </div>
                </div>
              )}

              {/* 测试区域 */}
              {result.regex && (
                <div className={styles.section}>
                  <label className={styles.label}>测试文本</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="输入要测试的文本..."
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    rows={4}
                  />
                  <button
                    className={styles.testBtn}
                    onClick={handleTest}
                    disabled={!testText}
                  >
                    测试匹配
                  </button>

                  {testResult.length > 0 && (
                    <div className={styles.testResult}>
                      <div className={styles.testResultHeader}>
                        匹配结果 ({testResult.length} 个)
                      </div>
                      <div className={styles.testResultList}>
                        {testResult.map((match, index) => (
                          <div key={index} className={styles.testResultItem}>
                            {match}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {testText && testResult.length === 0 && (
                    <div className={styles.noMatch}>未找到匹配项</div>
                  )}
                </div>
              )}
            </>
          )}
            </div>

            {/* 右侧：实时思考过程 */}
            {(isStreaming || streamingContent) && (
              <div className={styles.rightPanel}>
                <div className={styles.streamingSection}>
                  <div className={styles.streamingHeader}>
                    <span className={styles.streamingTitle}>
                      {isStreaming ? '🤔 AI正在思考...' : '✅ 思考完成'}
                    </span>
                    {isStreaming && <span className={styles.streamingDot}></span>}
                  </div>
                  <div className={styles.streamingContent}>
                    <pre className={styles.streamingText}>{streamingContent}</pre>
                    {isStreaming && <span className={styles.cursor}>▋</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
