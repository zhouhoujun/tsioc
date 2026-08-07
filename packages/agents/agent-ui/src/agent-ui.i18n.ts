import { TranslationBundle } from '@tsdi/i18n';

export const agentUiEnglish: TranslationBundle = {
    locale: 'en',
    messages: {
        agent: {
            turn: {
                understanding: 'Understanding the request',
                preparing: 'Preparing the response',
                working: 'Working',
                running: 'Running'
            }
        }
    }
};

export const agentUiChinese: TranslationBundle = {
    locale: 'zh-CN',
    messages: {
        agent: {
            turn: {
                understanding: '正在理解需求',
                preparing: '正在整理结果',
                working: '处理中',
                running: '执行中'
            }
        }
    }
};
