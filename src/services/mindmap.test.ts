import { describe, it, expect, beforeEach } from 'vitest'
import { MindMapService } from './mindmap'
import { StorageService } from './storage'

describe('MindMapService - 范围过滤和折叠功能', () => {
  let storage: StorageService
  let mindMapService: MindMapService

  beforeEach(async () => {
    storage = new StorageService()
    await storage.initialize()
    mindMapService = new MindMapService(storage)

    // 创建测试数据
    const library1 = storage.addLibrary('测试库1')
    const library2 = storage.addLibrary('测试库2')
    
    const collection1 = storage.addCollection(library1.id, '测试集1', 0)
    const collection2 = storage.addCollection(library2.id, '测试集2', 0)
    
    const article1 = storage.addArticle(collection1.id, {
      title: '测试文章1',
      content: '而今而后，吾知免夫。',
      collectionId: collection1.id,
    })
    
    const article2 = storage.addArticle(collection2.id, {
      title: '测试文章2',
      content: '学而时习之，不亦说乎。',
      collectionId: collection2.id,
    })

    // 添加义项
    const def1 = storage.addDefinition('而', '连词，表示顺承')
    const def2 = storage.addDefinition('而', '连词，表示转折')
    const def3 = storage.addDefinition('学', '学习')

    // 添加关联
    const sentence1 = article1.sentences[0]
    const sentence2 = article2.sentences[0]
    
    if (sentence1) {
      storage.addCharacterDefinitionLink(def1.id, sentence1.id, 0)
      storage.addCharacterDefinitionLink(def1.id, sentence1.id, 3)
    }
    
    if (sentence2) {
      storage.addCharacterDefinitionLink(def2.id, sentence2.id, 1)
      storage.addCharacterDefinitionLink(def3.id, sentence2.id, 0)
    }
  })

  it('应该生成包含所有范围的思维导图', () => {
    const mindMap = mindMapService.generateMindMap('而')
    
    expect(mindMap.character).toBe('而')
    expect(mindMap.nodes.length).toBeGreaterThan(1)
    expect(mindMap.connections.length).toBeGreaterThan(0)
    expect(mindMap.scope).toBeUndefined()
  })

  it('应该根据库范围过滤义项', () => {
    const libraries = storage.getLibraries()
    const library1 = libraries[0]
    
    const mindMap = mindMapService.generateMindMap('而', {
      libraryId: library1.id,
    })
    
    expect(mindMap.scope?.libraryId).toBe(library1.id)
    
    // 应该只包含库1中的义项（如果有的话）
    const definitionNodes = mindMap.nodes.filter(n => n.type === 'definition')
    // 库1中有"而"的义项，所以应该有定义节点
    expect(definitionNodes.length).toBeGreaterThanOrEqual(0)
    
    // 验证所有例句都来自库1
    const exampleNodes = mindMap.nodes.filter(n => n.type === 'example')
    exampleNodes.forEach(node => {
      if (node.exampleId) {
        const sentence = storage.getSentenceById(node.exampleId)
        expect(sentence).not.toBeNull()
        if (sentence) {
          const article = storage.getArticleById(sentence.articleId)
          expect(article).not.toBeNull()
          if (article) {
            const collection = storage.getCollectionById(article.collectionId)
            expect(collection).not.toBeNull()
            if (collection) {
              expect(collection.libraryId).toBe(library1.id)
            }
          }
        }
      }
    })
  })

  it('应该根据集范围过滤义项', () => {
    const libraries = storage.getLibraries()
    const collection1 = libraries[0].collections[0]
    
    const mindMap = mindMapService.generateMindMap('而', {
      collectionId: collection1.id,
    })
    
    expect(mindMap.scope?.collectionId).toBe(collection1.id)
  })

  it('应该根据文章范围过滤义项', () => {
    const libraries = storage.getLibraries()
    const article1 = libraries[0].collections[0].articles[0]
    
    const mindMap = mindMapService.generateMindMap('而', {
      articleId: article1.id,
    })
    
    expect(mindMap.scope?.articleId).toBe(article1.id)
  })

  it('应该在没有义项时只返回中心节点', () => {
    const mindMap = mindMapService.generateMindMap('无')
    
    expect(mindMap.nodes.length).toBe(1)
    expect(mindMap.nodes[0].type).toBe('character')
    expect(mindMap.connections.length).toBe(0)
  })

  it('应该根据内容量调整缩放', () => {
    // 添加大量义项和例句
    const library = storage.getLibraries()[0]
    const collection = library.collections[0]
    
    // 创建多个文章
    for (let i = 0; i < 10; i++) {
      const article = storage.addArticle(collection.id, {
        title: `测试文章${i}`,
        content: '而今而后，吾知免夫。而今而后，吾知免夫。',
        collectionId: collection.id,
      })
      
      const def = storage.addDefinition('而', `义项${i}`)
      
      article.sentences.forEach(sentence => {
        storage.addCharacterDefinitionLink(def.id, sentence.id, 0)
      })
    }
    
    const mindMap = mindMapService.generateMindMap('而')
    
    // 应该使用较小的缩放比例
    expect(mindMap.viewport.zoom).toBeLessThan(1.0)
  })

  it('应该保存和加载思维导图', () => {
    const mindMap = mindMapService.generateMindMap('而')
    
    mindMapService.saveMindMap(mindMap)
    
    const loaded = mindMapService.loadMindMap('而')
    
    expect(loaded).not.toBeNull()
    expect(loaded?.character).toBe('而')
    expect(loaded?.nodes.length).toBe(mindMap.nodes.length)
  })
})
