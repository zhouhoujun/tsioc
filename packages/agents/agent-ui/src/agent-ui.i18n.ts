import { TranslationBundle } from '@tsdi/i18n';

export const agentUiEnglish: TranslationBundle = {
    locale: 'en',
    messages: {
        agent: {
            turn: {
                understanding: 'Understanding the request',
                preparing: 'Preparing the response',
                working: 'Working',
                running: 'Running',
                toolsRunning: 'Running {count} operations',
                backgroundCommand: 'Running a background command'
            },
            tool: {
                list_dir: 'Inspect directory', glob_search: 'Search files', content_search: 'Search code',
                read_file: 'Read file', write_file: 'Create file', edit_file: 'Edit file', apply_patch: 'Apply changes',
                mkdir: 'Create directory', todo: 'Update plan', ask_user: 'Waiting for your input',
                coding_task: 'Run implementation task', git_operations: 'Check version control'
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
                running: '执行中',
                toolsRunning: '正在执行 {count} 项操作',
                backgroundCommand: '后台命令执行中'
            },
            tool: {
                list_dir: '检查目录', glob_search: '搜索文件', content_search: '搜索代码',
                read_file: '读取文件', write_file: '创建文件', edit_file: '修改文件', apply_patch: '应用修改',
                mkdir: '创建目录', todo: '更新计划', ask_user: '等待你的输入',
                coding_task: '执行实现任务', git_operations: '检查版本状态'
            }
        }
    }
};
