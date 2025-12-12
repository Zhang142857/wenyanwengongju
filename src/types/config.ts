/**
 * 统一配置文件类型定义
 */

// API配置组（支持多Key池）
export interface ApiConfigGroup {
    id: string
    name: string  // 配置组名称，如 "高质量"、"快速"
    description?: string  // 描述
    provider: 'siliconflow' | 'minimax' | 'deepseek' | 'custom'
    baseUrl: string
    apiKeys: string[]  // 多个API Key组成的池
    model: string
    isThinkingModel: boolean  // 是否是思考模型（会解析<think>标签）
    // 并发设置（每个配置组独立）
    concurrency: {
        aiDefinitionConcurrency: number
        shortSentenceConcurrency: number
        batchDelayMs: number
        retryDelayMs: number
    }
}

// 旧的单个API配置（向后兼容）
export interface ApiConfig {
    provider: 'siliconflow' | 'minimax' | 'deepseek' | 'custom'
    baseUrl: string
    apiKey: string
    model: string
}

// 并发配置
export interface ConcurrencyConfig {
    aiDefinitionConcurrency: number
    shortSentenceConcurrency: number
    batchDelayMs: number
    retryDelayMs: number
}

// AI配置
export interface AIConfig {
    configGroups: ApiConfigGroup[]  // 多个配置组
    activeGroupId: string  // 当前激活的配置组ID
    // 向后兼容：保留旧的apiConfigs字段
    apiConfigs?: ApiConfig[]
    concurrency: ConcurrencyConfig
}

// 词库配置
export interface LibrariesConfig {
    defaultLibraries: any[] // 默认词库数据
    focusWords: string // 重点字列表
    keyCharacters: string[] // 用户添加的重点字
}

// 背景效果设置
export interface BackgroundEffects {
    blur: boolean           // 模糊
    darken: boolean         // 变暗
    grayscale: boolean      // 灰度
    blurAmount: number      // 模糊程度 (0-20)
    brightness: number      // 亮度 (0-100, 50为正常)
    saturation: number      // 饱和度 (0-200, 100为正常)
}

// 背景设置
export interface BackgroundSettings {
    type: 'gradient' | 'image' | 'video' | 'color'
    url?: string                    // 图片/视频URL（base64或文件路径）
    mediaPath?: string              // 媒体文件在用户数据目录的路径
    color?: string                  // 纯色背景色值
    effect: 'none' | 'blur' | 'brightness' | 'grayscale'  // 旧版单选效果（向后兼容）
    effects: BackgroundEffects      // 新版多选效果
}

// 自动筛选设置
export interface AutoFilterConfig {
    enabled: boolean // 是否启用自动筛选
    defaultLibraryId: string // 默认筛选的库ID（空字符串表示不自动筛选）
}

// 系统设置
export interface SystemConfig {
    appTitle: string
    enableTour: boolean // 是否启用新手教程
    hasPlayedTour: boolean // 是否已播放过教程
    theme: 'gradient' | 'image' | 'video'
    backgroundSettings: BackgroundSettings
    autoFilter: AutoFilterConfig // 自动筛选设置
}

// 功能开关
export interface FeaturesConfig {
    enableAIOrganize: boolean
    enableExam: boolean
    enableRegexGenerator: boolean
    enableImport: boolean
    enableManage: boolean
}

// 教程播放记录
export interface TourPlayedRecord {
    home: boolean
    import: boolean
    organize: boolean
    aiOrganize: boolean
    exam: boolean
    manage: boolean
    regexGenerator: boolean
    query: boolean
    settings: boolean
    imageTour: boolean  // 图片教程
    examAnnouncement: boolean  // 自动出题公告
}

// 完整配置
export interface AppConfig {
    version: string
    edition: 'community' | 'custom' | 'enterprise'
    ai: AIConfig
    libraries: LibrariesConfig
    system: SystemConfig
    features: FeaturesConfig
    tourPlayedRecord: TourPlayedRecord
}

// 默认配置
export const DEFAULT_CONFIG: AppConfig = {
    version: '1.0.0',
    edition: 'custom',
    ai: {
        configGroups: [
            {
                id: 'default-fast',
                name: '快速模式',
                description: '使用Ling-flash模型，速度快，适合大批量处理',
                provider: 'siliconflow',
                baseUrl: 'https://api.siliconflow.cn/v1',
                apiKeys: [],
                model: 'inclusionAI/Ling-flash-2.0',
                isThinkingModel: false,
                concurrency: {
                    aiDefinitionConcurrency: 30,
                    shortSentenceConcurrency: 34,
                    batchDelayMs: 100,
                    retryDelayMs: 500,
                },
            },
        ],
        activeGroupId: 'default-fast',
        concurrency: {
            aiDefinitionConcurrency: 30,
            shortSentenceConcurrency: 34,
            batchDelayMs: 100,
            retryDelayMs: 500,
        },
    },
    libraries: {
        defaultLibraries: [],
        focusWords: '',
        keyCharacters: [],
    },
    system: {
        appTitle: '文言文小工具',
        enableTour: true,
        hasPlayedTour: false,
        theme: 'gradient',
        backgroundSettings: {
            type: 'gradient',
            effect: 'none',
            effects: {
                blur: false,
                darken: false,
                grayscale: false,
                blurAmount: 8,
                brightness: 50,
                saturation: 100,
            },
        },
        autoFilter: {
            enabled: true,
            defaultLibraryId: '',
        },
    },
    features: {
        enableAIOrganize: true,
        enableExam: true,
        enableRegexGenerator: true,
        enableImport: true,
        enableManage: true,
    },
    tourPlayedRecord: {
        home: false,
        import: false,
        organize: false,
        aiOrganize: false,
        exam: false,
        manage: false,
        regexGenerator: false,
        query: false,
        settings: false,
        imageTour: false,
        examAnnouncement: false,
    },
}
