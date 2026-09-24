import { TranslationBundle } from '@tsdi/i18n';

const AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS = 'more|continue|go on|keep going|carry on|next|proceed';
const AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS = '继续|继续吧|继续下去|接着|接着说|接着来|然后呢|再来|下一步|下一部分|后面呢|展开|详细点|详细一点|再详细点|补充一下|继续输出|继续生成';

export const agentUiDefaultFollowUpOnlyTermLists = [
    AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS,
    AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS
] as const;

const AGENT_UI_SESSION_CLOSING_MESSAGES = {
    en: 'Closing session. Resume with: tsdi-agent chat --session {sessionId}',
    'zh-CN': '正在关闭会话。继续使用此会话：tsdi-agent chat --session {sessionId}'
} as const;

export function formatAgentUiSessionClosingMessage(locale: string | undefined, sessionId: string): string {
    const template = String(locale || '').toLowerCase().startsWith('zh')
        ? AGENT_UI_SESSION_CLOSING_MESSAGES['zh-CN']
        : AGENT_UI_SESSION_CLOSING_MESSAGES.en;
    return template.replace('{sessionId}', sessionId);
}

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
                backgroundCommand: 'Running a background command',
                interruptHint: 'esc to interrupt',
                backgroundRunning: '{count} background terminal(s) running',
                backgroundView: '/ps to view',
                backgroundStop: '/ps stop to close'
            },
            dashboard: {
                approvals: 'approvals {count}',
                jobs: 'jobs {running}/{total}',
                tasks: 'tasks {active}/{total}',
                tools: 'tools {count}',
                tokens: '{count} tokens'
            },
            notice: {
                cancelling: 'Cancelling current turn…',
                nothingToCancel: 'No running turn to cancel.',
                queuedPrompt: 'Queued prompt ({count}).',
                queuedCommand: 'Queued command ({count}).',
                busy: 'Wait for the current turn to finish.',
                nothingToRetry: 'Nothing to retry.',
                noPendingApprovals: 'No pending approvals.',
                noQueuedPrompts: 'No queued prompts. Press Tab while a turn is running to queue a follow-up prompt.',
                noQueuedPromptsClear: 'No queued prompts to clear.',
                queueUsage: 'Usage: /queue [list|clear]',
                noStashedDrafts: 'No stashed drafts. Use /stash push <name> to save the current draft.',
                emptyStash: 'Nothing to stash: the draft is empty.',
                stashUsage: 'Usage: /stash [list|push <name>|pop <name>|rm <name>]',
                personalityCleared: 'Personality cleared.',
                personalityUsage: 'Usage: /personality [list|set <name>|unset]',
                yoloUsage: 'Usage: /yolo [on|off]',
                noMcpServers: 'No MCP servers configured. Add them via the agent settings (tsdi-agent mcp add).'
            },
            message: {
                expand: '… {count} more lines. Click to expand',
                collapse: 'Click to collapse',
                expandEnter: '… {count} more lines. Press Enter to expand',
                collapseEnter: 'Press Enter to collapse',
                followUpOnlyTerms: AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS
            },
            session: {
                closing: AGENT_UI_SESSION_CLOSING_MESSAGES.en
            },
            tool: {
                list_dir: 'Inspect directory', glob_search: 'Search files', content_search: 'Search code',
                read_file: 'Read file', write_file: 'Create file', edit_file: 'Edit file', apply_patch: 'Apply changes',
                mkdir: 'Create directory', todo: 'Update plan', ask_user: 'Waiting for your input',
                coding_task: 'Run implementation task', git_operations: 'Check version control',
                stat: 'Inspect file', watch_files: 'Watch files', move_file: 'Move file', copy_file: 'Copy file',
                delete_file: 'Delete file', web_search: 'Web search', web_extract: 'Fetch web page',
                weather: 'Check weather', location: 'Resolve location', terminal: 'Run command',
                background_task: 'Run background task', schedule: 'Schedule prompt',
                invoked: 'Running {label}', completed: '{label} completed', failed: '{label} failed', failedWithError: '{label} failed: {error}', gitMissing: 'Git repository not detected. If you want version control, ask the agent to initialize one (git init).', searchUnavailable: 'Web search is not configured; add a search adapter in settings.'
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
                backgroundCommand: '后台命令执行中',
                interruptHint: '按 esc 中断',
                backgroundRunning: '{count} 个后台终端运行中',
                backgroundView: '/ps 查看',
                backgroundStop: '/ps stop 关闭'
            },
            dashboard: {
                approvals: '审批 {count}',
                jobs: '任务 {running}/{total}',
                tasks: '任务 {active}/{total}',
                tools: '工具 {count}',
                tokens: '{count} tokens'
            },
            notice: {
                cancelling: '正在取消当前轮次…',
                nothingToCancel: '没有正在运行的轮次可取消。',
                queuedPrompt: '已排队提示（{count}）。',
                queuedCommand: '已排队命令（{count}）。',
                busy: '请等待当前轮次结束。',
                nothingToRetry: '没有可重试的内容。',
                noPendingApprovals: '没有待处理的审批。',
                noQueuedPrompts: '没有排队提示。turn 运行中按 Tab 可排队后续提示。',
                noQueuedPromptsClear: '没有可清空的排队提示。',
                queueUsage: '用法：/queue [list|clear]',
                noStashedDrafts: '没有暂存草稿。用 /stash push <name> 保存当前草稿。',
                emptyStash: '无内容可暂存：草稿为空。',
                stashUsage: '用法：/stash [list|push <name>|pop <name>|rm <name>]',
                personalityCleared: '人格已清除。',
                personalityUsage: '用法：/personality [list|set <name>|unset]',
                yoloUsage: '用法：/yolo [on|off]',
                noMcpServers: '未配置 MCP 服务器。可通过 agent 设置（tsdi-agent mcp add）添加。'
            },
            message: {
                expand: '… 还有 {count} 行，点击展开',
                collapse: '点击收起',
                expandEnter: '… 还有 {count} 行，按 Enter 展开',
                collapseEnter: '按 Enter 收起',
                followUpOnlyTerms: AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS
            },
            session: {
                closing: AGENT_UI_SESSION_CLOSING_MESSAGES['zh-CN']
            },
            tool: {
                list_dir: '检查目录', glob_search: '搜索文件', content_search: '搜索代码',
                read_file: '读取文件', write_file: '创建文件', edit_file: '修改文件', apply_patch: '应用修改',
                mkdir: '创建目录', todo: '更新计划', ask_user: '等待你的输入',
                coding_task: '执行实现任务', git_operations: '检查版本状态',
                stat: '查看文件信息', watch_files: '监听文件', move_file: '移动文件', copy_file: '复制文件',
                delete_file: '删除文件', web_search: '联网搜索', web_extract: '抓取网页',
                weather: '查询天气', location: '解析位置', terminal: '执行命令',
                background_task: '运行后台任务', schedule: '定时提示',
                invoked: '正在执行 {label}', completed: '{label}已完成', failed: '{label}未完成', failedWithError: '{label}未完成：{error}', gitMissing: '未检测到 Git 仓库。如需版本控制，可让 agent 初始化仓库（git init）。', searchUnavailable: '未配置联网搜索适配器；请在设置中配置搜索适配器。'
            }
        }
    }
};
