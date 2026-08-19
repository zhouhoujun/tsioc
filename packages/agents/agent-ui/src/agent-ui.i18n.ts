import { TranslationBundle } from '@tsdi/i18n';

const AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS = 'more|continue|go on|keep going|carry on|next|proceed';
const AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS = '继续|继续吧|继续下去|接着|接着说|接着来|然后呢|再来|下一步|下一部分|后面呢|展开|详细点|详细一点|再详细点|补充一下|继续输出|继续生成';

export const agentUiDefaultFollowUpOnlyTermLists = [
    AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS,
    AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS
] as const;

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
            dashboard: {
                approvals: 'approvals {count}',
                jobs: 'jobs {running}/{total}',
                tasks: 'tasks {active}/{total}',
                tools: 'tools {count}',
                tokens: '{count} tokens'
            },
            message: {
                expand: '… {count} more lines. Click to expand',
                collapse: 'Click to collapse',
                expandEnter: '… {count} more lines. Press Enter to expand',
                collapseEnter: 'Press Enter to collapse',
                followUpOnlyTerms: AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS
            },
            tool: {
                list_dir: 'Inspect directory', glob_search: 'Search files', content_search: 'Search code',
                read_file: 'Read file', write_file: 'Create file', edit_file: 'Edit file', apply_patch: 'Apply changes',
                mkdir: 'Create directory', todo: 'Update plan', ask_user: 'Waiting for your input',
                coding_task: 'Run implementation task', git_operations: 'Check version control',
                invoked: 'Running {label}', completed: '{label} completed', failed: '{label} failed', failedWithError: '{label} failed: {error}', gitMissing: 'Git repository not detected; continuing with files'
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
            dashboard: {
                approvals: '审批 {count}',
                jobs: '任务 {running}/{total}',
                tasks: '任务 {active}/{total}',
                tools: '工具 {count}',
                tokens: '{count} tokens'
            },
            message: {
                expand: '… 还有 {count} 行，点击展开',
                collapse: '点击收起',
                expandEnter: '… 还有 {count} 行，按 Enter 展开',
                collapseEnter: '按 Enter 收起',
                followUpOnlyTerms: AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS
            },
            tool: {
                list_dir: '检查目录', glob_search: '搜索文件', content_search: '搜索代码',
                read_file: '读取文件', write_file: '创建文件', edit_file: '修改文件', apply_patch: '应用修改',
                mkdir: '创建目录', todo: '更新计划', ask_user: '等待你的输入',
                coding_task: '执行实现任务', git_operations: '检查版本状态',
                invoked: '正在执行 {label}', completed: '{label}已完成', failed: '{label}未完成', failedWithError: '{label}未完成：{error}', gitMissing: '未检测到 Git 仓库，继续处理文件'
            }
        }
    }
};
