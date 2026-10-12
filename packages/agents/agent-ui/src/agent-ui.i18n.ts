import { MessageFormatter, TranslationBundle } from '@tsdi/i18n';
import { AGENT_UI_NOTICE_EN } from './agent-ui.i18n.notice.en';
import { AGENT_UI_NOTICE_ZH } from './agent-ui.i18n.notice.zh';
import { AGENT_UI_ERROR_EN, AGENT_UI_ERROR_ZH } from './agent-ui.i18n.error';

export interface AgentUiTranslator {
    translate(key: string, params?: any): string | undefined;
}

const AGENT_UI_EN_TEMPLATES: Record<string, string> = {
    ...(AGENT_UI_NOTICE_EN as Record<string, string>),
    ...(AGENT_UI_ERROR_EN as Record<string, string>)
};

const AGENT_UI_ERROR_KEYS = new Set(Object.keys(AGENT_UI_ERROR_EN));

const agentUiFormatter = new MessageFormatter();

/**
 * Format an agent-ui notice/error without ever rendering a raw key: resolve
 * through the wired translator (`agent.notice.*` / `agent.error.*`), else fall
 * back to the English catalog template, else return ''.
 */
export function formatAgentUiNotice(
    translator: AgentUiTranslator | null | undefined,
    key: string,
    params?: Record<string, any>
): string {
    const namespace = AGENT_UI_ERROR_KEYS.has(key) ? 'error' : 'notice';
    const fullKey = `agent.${namespace}.${key}`;
    const translated = typeof translator?.translate === 'function' ? translator.translate(fullKey, params) : undefined;
    if (translated && translated !== fullKey) {
        return translated;
    }
    const template = AGENT_UI_EN_TEMPLATES[key];
    if (template === undefined) {
        return '';
    }
    return agentUiFormatter.format(template, params || {}, 'en');
}

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
                reasoning: 'Reasoning',
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
                ...AGENT_UI_NOTICE_EN
            },
            error: {
                ...AGENT_UI_ERROR_EN
            },
            modelError: {
                quota: 'Model request refused: the {provider} account has insufficient balance (model {model}, status {status}). Top up the account or switch model with /model, then retry.',
                auth: 'Model request refused: the API key for {provider} is missing or invalid (model {model}, status {status}). Update the key in settings, then retry.',
                config: 'The model provider "{provider}" is not configured for model {model}. Fix provider/model/baseUrl in settings, then retry.',
                rateLimit: '{provider} is rate limiting this model (status {status}). Retrying shortly; use /model to switch if it keeps happening.',
                capacity: '{provider} reports this model as overloaded (status {status}). Retrying shortly; use /model to switch if it keeps happening.',
                server: '{provider} returned a server error for {model} (status {status}). Usually temporary — retry, or switch model with /model.',
                network: 'Cannot reach {provider} for model {model}. Check the network and baseUrl, then retry.',
                timeout: 'The request to {provider} for model {model} timed out. Retry, or raise timeoutMs in settings.',
                unknown: 'The request to {provider} for model {model} failed (status {status}). Retry, or switch model with /model.'
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
                reasoning: '正在推理',
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
                ...AGENT_UI_NOTICE_ZH
            },
            error: {
                ...AGENT_UI_ERROR_ZH
            },
            modelError: {
                quota: '模型请求被拒绝：{provider} 账户余额不足（模型 {model}，状态 {status}）。请充值，或用 /model 切换模型后重试。',
                auth: '模型请求被拒绝：{provider} 的 API key 缺失或无效（模型 {model}，状态 {status}）。请在设置中更新 key 后重试。',
                config: '模型 provider “{provider}” 未正确配置（模型 {model}）。请在设置中修正 provider/model/baseUrl 后重试。',
                rateLimit: '{provider} 对该模型触发限流（状态 {status}）。即将自动重试；若持续出现请用 /model 切换模型。',
                capacity: '{provider} 报告该模型过载（状态 {status}）。即将自动重试；若持续出现请用 /model 切换模型。',
                server: '{provider} 为 {model} 返回服务端错误（状态 {status}）。通常是临时故障，可重试或用 /model 切换模型。',
                network: '无法连接 {provider} 的 {model}。请检查网络与 baseUrl 后重试。',
                timeout: '请求 {provider} 的 {model} 超时。可重试，或在设置中调大 timeoutMs。',
                unknown: '请求 {provider} 的 {model} 失败（状态 {status}）。可重试，或用 /model 切换模型。'
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
