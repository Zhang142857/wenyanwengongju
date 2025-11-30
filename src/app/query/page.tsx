'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import SearchPage from '@/components/SearchPage'
import { StorageService } from '@/services/storage'

export default function QueryPage() {
  const [storage] = useState(() => new StorageService())
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // 初始化数据
    initializeData()
  }, [])

  const initializeData = async () => {
    // 初始化存储
    await storage.initialize()

    // 检查是否已有数据
    const libraries = storage.getLibraries()
    
    if (libraries.length === 0) {
      // 添加示例数据
      addSampleData()
    }

    setIsInitialized(true)
  }

  const addSampleData = () => {
    // 创建文言文库
    const library = storage.addLibrary('文言文库')

    // 创建集
    const collection1 = storage.addCollection(library.id, '七年级上册', 1)
    const collection2 = storage.addCollection(library.id, '八年级上册', 2)

    // 添加文章 - 论语十则
    storage.addArticle(collection1.id, {
      title: '论语十则',
      content: '子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎！人不知而不愠，不亦君子乎？',
      collectionId: collection1.id,
    })

    // 添加文章 - 陋室铭
    storage.addArticle(collection1.id, {
      title: '陋室铭',
      content: '山不在高，有仙则名。水不在深，有龙则灵。斯是陋室，惟吾德馨。苔痕上阶绿，草色入帘青。谈笑有鸿儒，往来无白丁。可以调素琴，阅金经。无丝竹之乱耳，无案牍之劳形。南阳诸葛庐，西蜀子云亭。孔子云：何陋之有？',
      collectionId: collection1.id,
    })

    // 添加文章 - 桃花源记
    storage.addArticle(collection2.id, {
      title: '桃花源记',
      content: '晋太元中，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。渔人甚异之，复前行，欲穷其林。',
      collectionId: collection2.id,
    })

    // 添加文章 - 爱莲说
    storage.addArticle(collection2.id, {
      title: '爱莲说',
      content: '水陆草木之花，可爱者甚蕃。晋陶渊明独爱菊。自李唐来，世人甚爱牡丹。予独爱莲之出淤泥而不染，濯清涟而不妖，中通外直，不蔓不枝，香远益清，亭亭净植，可远观而不可亵玩焉。',
      collectionId: collection2.id,
    })

    // 保存到本地
    storage.saveToLocal()
  }

  if (!isInitialized) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
          <p>加载中...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <SearchPage storage={storage} />
    </Layout>
  )
}
