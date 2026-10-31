import { MessageFormatter, TranslationBundle, TranslatorService } from '@tsdi/i18n';
import { AGENT_UI_NOTICE_EN } from './agent-ui.i18n.notice.en';
import { AGENT_UI_NOTICE_ZH } from './agent-ui.i18n.notice.zh';
import { AGENT_UI_ERROR_EN, AGENT_UI_ERROR_ZH } from './agent-ui.i18n.error';
import { AGENT_UI_TOOL_LABELS_EN, AGENT_UI_TOOL_LABELS_ZH } from './agent-ui.i18n.tools';
import { AGENT_UI_HINT_EN, AGENT_UI_HINT_ZH, AGENT_UI_MENU_EN, AGENT_UI_MENU_ZH } from './agent-ui.i18n.menu';
import { AGENT_UI_PANEL_EN, AGENT_UI_PANEL_ZH } from './agent-ui.i18n.panel';
import { AGENT_UI_DIAG_EN, AGENT_UI_DIAG_ZH } from './agent-ui.i18n.diagnostics';
import { AGENT_UI_TRANSCRIPT_EN, AGENT_UI_TRANSCRIPT_ZH } from './agent-ui.i18n.transcript';

export interface AgentUiTranslator {
    translate(key: string, params?: any): string | undefined;
    /** BCP-47 tag of the active UI locale (e.g. `zh-CN`), used for date/time copy. */
    currentLocale?: string;
}

export * from './agent-ui.i18n.format';

const AGENT_UI_EN_TEMPLATES: Record<string, string> = {
    ...(AGENT_UI_NOTICE_EN as Record<string, string>),
    ...(AGENT_UI_ERROR_EN as Record<string, string>)
};

const AGENT_UI_ERROR_KEYS = new Set(Object.keys(AGENT_UI_ERROR_EN));

/**
 * Resolve a plain UI label through the translator, falling back to the English
 * template when the key is missing (the translator echoes missing keys).
 */
export function formatAgentUiLabel(translator: AgentUiTranslator | null | undefined, key: string, fallback: string, params?: Record<string, any>): string {
    // Hosts/tests may inject a partial translator (e.g. locale plumbing only);
    // never call a missing `translate`.
    const value = typeof translator?.translate === 'function' ? translator.translate(key, params) : undefined;
    if (value && value !== key) {
        return value;
    }
    // The English fallback can carry {placeholders} too (some hosts have no
    // translator at all), so interpolate it instead of leaking raw braces.
    return params ? agentUiFormatter.format(fallback, params, 'en') : fallback;
}

/**
 * Resolve panel chrome copy (`agent.menu.panel.<section>.<key>`) through the
 * host translator while keeping the English fallback.
 */
export function formatAgentPanelLabel(
    translator: AgentUiTranslator | null | undefined,
    section: string,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    return formatAgentUiLabel(translator, `agent.menu.panel.${section}.${key}`, fallback, params);
}

/**
 * Localize a panel status word that arrives as an identifier (`running`,
 * `completed`, …). Unknown statuses keep their raw identifier.
 */
export function formatAgentPanelStatusLabel(
    translator: AgentUiTranslator | null | undefined,
    section: string,
    status: string
): string {
    if (!status) {
        return status;
    }
    const key = status.charAt(0).toUpperCase() + status.slice(1);
    return formatAgentPanelLabel(translator, section, `status${key}`, status);
}


/** Localize a keymap action id (`new-session` → `新建会话`), keeping the raw id when unknown. */
export function formatAgentKeymapActionLabel(translator: AgentUiTranslator | null | undefined, action: string): string {
    const suffix = String(action || '').split('-').map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : '')).join('');
    return formatAgentPanelLabel(translator, 'keymap', `action${suffix}`, action);
}

/**
 * Resolve diagnostics report copy (`agent.menu.diag.<section>.<key>`) through
 * the host translator while keeping the English fallback.
 */
export function formatAgentDiagLabel(
    translator: AgentUiTranslator | null | undefined,
    section: string,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    return formatAgentUiLabel(translator, `agent.menu.diag.${section}.${key}`, fallback, params);
}

/**
 * Resolve the transcript pager HUD copy for the host surface. The surface keeps
 * the English defaults when a host does not supply copy.
 */
export function formatAgentPagerStatusCopy(
    translator: AgentUiTranslator | null | undefined
): { plain: string; withMatches: string } {
    return {
        plain: formatAgentPanelLabel(translator, 'pager', 'plain', 'Pager · Esc close · ↑↓ scroll'),
        // The surface (not the translator) fills the match position, so the
        // placeholders are passed through as literal params.
        withMatches: formatAgentPanelLabel(
            translator, 'pager', 'withMatches',
            'Pager {index}/{total} · Esc close · ↑↓ scroll',
            { index: '{index}', total: '{total}' }
        )
    };
}

/**
 * Localize a boolean-ish config state word (`ON`/`OFF`/`none`/`(default)`).
 * The identifiers stay untranslated; only the shared display words move.
 */
export function formatAgentPanelState(
    translator: AgentUiTranslator | null | undefined,
    state: 'on' | 'off' | 'none' | 'default'
): string {
    const fallbacks: Record<string, string> = { on: 'ON', off: 'OFF', none: 'none', default: '(default)' };
    return formatAgentPanelLabel(translator, 'state', state, fallbacks[state]);
}

/**
 * The English default for a timeline role label. A renderer whose label differs
 * (a host override) keeps its own label instead of the catalog translation.
 */
export function defaultTimelineLabel(kind: string): string | undefined {
    return (agentUiEnglish.messages as any)?.agent?.timeline?.[kind];
}

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

/**
 * Format a notice from a DI application context.
 *
 * Host adapters (CLI/TUI launcher, desktop, VS Code) hold the started context
 * rather than the console component's translator; this resolves the context's
 * `TranslatorService` so host-side notices stay localized instead of hardcoded
 * English. Falls back to the English catalog when no translator is registered.
 */
export function formatAgentUiNoticeFromContext(
    context: { get?: (token: any) => any } | null | undefined,
    key: string,
    params?: Record<string, any>
): string {
    let translator: AgentUiTranslator | undefined;
    if (context && typeof context.get === 'function') {
        try {
            translator = context.get(TranslatorService);
        } catch {
            translator = undefined;
        }
    }
    return formatAgentUiNotice(translator, key, params);
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
            status: {
                approvalRequired: 'Approval required: {tool} ({id}){extra}'
            },
            command: {
                group: { core: 'core', session: 'session', display: 'display', input: 'input', review: 'review', hooks: 'hooks', delegation: 'delegation', system: 'system' },
                workspace: 'context',
                unknown: 'Unknown command: {command}',
                ambiguous: 'Ambiguous command: {command}  ({matches})',
                label: 'Command',
                status: { running: 'running', completed: 'completed', cancelled: 'cancelled', failed: 'failed' }
            },
            hint: AGENT_UI_HINT_EN,
            menu: { ...AGENT_UI_MENU_EN, panel: AGENT_UI_PANEL_EN, diag: AGENT_UI_DIAG_EN, transcript: AGENT_UI_TRANSCRIPT_EN },
            context: {
                strategy: 'context {strategy}',
                level: 'level {level}',
                summary: 'summary',
                noSummary: 'no summary',
                messages: '{before}→{after} msgs',
                tokens: '{before}→{after} tok',
                saved: '{ratio}% saved',
                retained: '{rate}% retained',
                anchors: '{count} anchors',
                tools: '{count} tools',
                cumulative: 'cum {count} tok'
            },
            timeline: {
                thought: 'Thought · ',
                tool: 'Tool · ',
                command: '$ ',
                plan: 'Plan · ',
                'file-change': 'Files · ',
                question: 'Question · ',
                approval: 'Approval · ',
                error: 'Error · ',
                warning: 'Warning · ',
                cancelled: 'Cancelled · ',
                system: 'System · ',
                event: 'Event · ',
                rawOutput: 'Raw output',
                loadingOutput: 'Loading raw output…',
                truncated: '(truncated)',
                actionRetry: 'Retry',
                actionReview: 'Review',
                workedFor: 'Worked for {duration} · done {time}',
                planSummary: '{total} steps ({completed} done)'
            },
            mention: { folder: 'folder', file: 'file', skill: 'skill', plugin: 'plugin' },
            approval: {
                required: 'Approval required',
                allowPrompt: 'Approval required · Allow {tool}?',
                actions: 'a Allow   d Deny   A Always allow (session)   y Copy   ↑↓ Move   Esc Dismiss',
                reason: 'Reason: {reason}',
                noReason: 'No reason provided',
                expiresIn: 'Expires in {seconds}s',
                expired: 'Expired',
                accessibilityTitle: 'Approvals',
                accessibility: 'Approvals. {count} pending.',
                accessibilitySelected: 'Approvals. {count} pending. Selected: {tool}.',
                pendingTitle: 'Pending approvals',
                tool: 'Tool: {tool}',
                input: 'Input: {input}',
                inputNone: 'Input: -',
                timeout: 'Timeout: {ms}ms',
                expiresAt: 'Expires: {time}',
                reasonCode: { 'tool-requires-approval': 'Tool "{tool}" requires approval.' }
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
                expandAction: 'Click to expand',
                expandEnter: '… {count} more lines. Press Enter to expand',
                collapseEnter: 'Press Enter to collapse',
                followUpOnlyTerms: AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS
            },
            session: {
                closing: AGENT_UI_SESSION_CLOSING_MESSAGES.en
            },
            tool: {
                ...AGENT_UI_TOOL_LABELS_EN,
                list_dir: 'Inspect directory', glob_search: 'Search files', content_search: 'Search code',
                read_file: 'Read file', write_file: 'Create file', edit_file: 'Edit file', apply_patch: 'Apply changes',
                mkdir: 'Create directory', todo: 'Update plan', ask_user: 'Waiting for your input',
                coding_task: 'Run implementation task', git_operations: 'Check version control',
                stat: 'Inspect file', watch_files: 'Watch files', move_file: 'Move file', copy_file: 'Copy file',
                delete_file: 'Delete file', web_search: 'Web search', web_extract: 'Fetch web page',
                weather: 'Check weather', location: 'Resolve location', terminal: 'Run command',
                background_task: 'Run background task', schedule: 'Schedule prompt',
                spawn_agent: 'Spawn sub-agent', parallel_spawn: 'Run parallel tasks', orchestrate: 'Orchestrate tasks',
                fan_out: 'Fan out tasks', map_reduce: 'Map-reduce tasks', race: 'Race tasks',
                wait_all: 'Wait for all tasks', wait_any: 'Wait for any task', escalate: 'Escalate to the user',
                tool_search: 'Search tools', tool_inspect: 'Inspect tool', review_diff: 'Review diff',
                'process.start': 'Start process', 'process.poll': 'Poll process', 'process.kill': 'Stop process',
                invoked: 'Running {label}', completed: '{label} completed', failed: '{label} failed', failedWithError: '{label} failed: {error}', skipped: '{label} skipped', skippedWithReason: '{label} skipped: {reason}', gitMissing: 'Git repository not detected. If you want version control, ask the agent to initialize one (git init).', searchUnavailable: 'Web search is not configured; add a search adapter in settings.'
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
            status: {
                approvalRequired: '需要审批：{tool}（{id}）{extra}'
            },
            command: {
                group: { core: '核心', session: '会话', display: '显示', input: '输入', review: '审查', hooks: '钩子', delegation: '委托', system: '系统' },
                sub: {
                    keymap: {
                        list: '列出某个上下文的按键绑定',
                        set: '设置 <按键> <动作> [上下文]',
                        unset: '取消 <按键> [上下文]',
                        reset: '恢复默认按键',
                        record: '录制下一个按键到 <动作>'
                    },
                    approve: { retry: '重试最近一次被自动审查拒绝的操作（一次）' },
                    delegation: {
                        tree: '委托树 [sessionId] [status] [depth]',
                        lineage: '委托血缘 [sessionId]',
                        mode: '委托模式 [disabled|explicit|proactive|default]'
                    },
                    quality: { trend: '质量趋势 [provider] [bucketSize] [maxBuckets]' },
                    compactions: { trend: '压缩趋势 [sessionId] [bucketSize] [maxBuckets]' },
                    diagnostics: {
                        list: '轮次诊断记录 [sessionId]',
                        trend: '轮次诊断趋势 [sessionId] [bucketSize] [maxBuckets]'
                    },
                    harness: { audit: '失败模式审计 [sessionId]', profile: '治理 profile 列表/当前/差异' }
                },
                workspace: '上下文',
                desc: {
                    'help': '查看命令帮助（按分类分组）',
                    'status': '查看会话状态',
                    'model': '切换模型或为下一轮排队 profile',
                    'provider': '通过向导添加新的 AI 服务商',
                    'fast': '切换 fast/strong 模型 profile：/fast [profile]',
                    'tools': '查看当前启用的工具：/tools [<name>]',
                    'skills': '浏览技能：/skills [query | <id>]',
                    'mcp': '列出 MCP 服务与工具：/mcp [verbose]',
                    'plugins': '浏览已安装插件：/plugins [<id>]',
                    'apps': '浏览连接器或插入到提示中：/apps [<id>]',
                    'keymap': '按上下文（global/composer/list/approval/pager/vim）列出/设置/取消/重置按键绑定；record <action> 捕获下一个按键',
                    'vim': '切换 vim 风格 normal/insert 输入模式',
                    'permissions': '查看或修改只读/沙箱会话权限',
                    'settings': '统一设置对话框：常规、按键、服务商',
                    'yolo': '切换自动批准模式：/yolo [on|off]',
                    'feedback': '生成用于反馈的打包诊断信息',
                    'undo': '撤销上一次文件改动',
                    'redo': '重新应用上一次撤销的改动',
                    'copy': '复制回复',
                    'archetype': '切换会话原型：/archetype [build|plan|review|name]',
                    'plan': '切换只读计划模式（拒绝写工具）',
                    'sessions': '会话列表',
                    'session': '聚焦或切换会话：/session [<id>]',
                    'new': '新建会话：/new [<id>]',
                    'resume': '恢复已有或已归档会话',
                    'archive': '归档当前会话（保留转录）',
                    'fork': '复刻当前会话 [messageId]',
                    'side': '打开临时侧会话（fork）',
                    'share': '为当前会话创建分享链接（gateway）',
                    'unshare': '撤销会话分享：/unshare [token]',
                    'rename': '重命名当前会话：/rename <name>',
                    'title': '窗口标题字段 / 旧版会话重命名：/title [list|set|unset]',
                    'pin': '将当前会话置顶',
                    'unpin': '取消置顶',
                    'sections': '会话分段：/sections [<label> 以创建]',
                    'threads': '浏览会话线程：/threads [<id>]',
                    'threadplan': '线程计划待办',
                    'threadreview': '线程编码任务审查',
                    'projects': '按项目浏览会话：/projects [<id>]',
                    'search': '搜索会话：/search <query>',
                    'snapshot': '为当前会话创建快照：/snapshot [label]',
                    'snapshots': '列出/恢复/删除会话快照',
                    'git-snapshots': 'Git 步骤快照：list / diff <ref> / revert <messageId> / unrevert',
                    'messages': '消息列表',
                    'export': '导出会话：/export [path]',
                    'cd': '切换工作区目录：/cd <path>',
                    'pwd': '显示当前工作区',
                    'init': '初始化工作区配置与说明文档',
                    'ssh': '管理 SSH 目标：/ssh [list|add|remove|connect]'
                ,
                    'theme': '预览或应用已保存的 UI 主题',
                    'thinking': '切换推理/思考消息显示（Ctrl+X T）',
                    'timeline': '切换紧凑按时间线视图（Ctrl+X G）',
                    'display': '切换消息时间戳显示：/display [on|off|critical]',
                    'layout': '切换转录布局：/layout [stream|viewport]',
                    'outputs': '命令结果历史：/outputs 浏览；上下/j/k 移动，/ 过滤，回车复制',
                    'pager': '全量转录分页器：/pager [query] 搜索；Esc 关闭，↑↓/PgUp/PgDn 滚动',
                    'raw': '切换原始纯文本回滚（不做 markdown 重排）：/raw [on|off]',
                    'statusline': '状态栏字段：list / set field1,field2 / unset field',
                    'editor': '在外部编辑器中编辑草稿（Ctrl+G）',
                    'queue': '排队中的后续提示：/queue [list|clear]（turn 运行中按 Tab 排队）',
                    'stash': '命名草稿暂存：/stash [list|push <name>|pop <name>|rm <name>]',
                    'voice': '语音会话 状态/开始/停止/取消',
                    'ide': 'IDE 桥接：显示已连接的编辑器上下文',
                    'multiline': '多行输入',
                    'send': '发送多行草稿',
                    'cancel': '取消正在运行的 turn',
                    'clear': '开始新会话（清空当前对话）',
                    'attach': '为下一条提示附加图片',
                    'review': '编码任务审查',
                    'diff': '工作区差异：/diff [--staged|--unstaged|--untracked|paths]',
                    'approvals': '审批列表',
                    'deny': '拒绝待处理的审批请求：/deny [<id>]',
                    'jobs': '定时任务：/jobs [<taskId>]',
                    'tasks': '任务检查器：/tasks [<taskId>]',
                    'toolruns': '查看本会话的工具运行记录',
                    'hooks': '显示已注册的生命周期钩子（阶段 + shell 命令 + 函数）',
                    'memories': '记忆注入：status / on / off',
                    'personality': '人格预设：list / set <name> / unset',
                    'debug-config': '显示解析后的配置（模型、profile、ui 选项、会话）',
                    'delegation': '委托关系 [sessionId]',
                    'goal': '创建、查看、关联、完成或重开持续目标',
                    'usage': '用量 [daily|weekly|cumulative] [sessionId] [since]',
                    'compact': '立即强制压缩 [reason]',
                    'harness': 'harness 审计 / profile',
                    'retry': '重试失败的 worker：/retry [<taskId>]',
                    'rollback': '回滚编码任务：/rollback [<taskId>]',
                    'ps': '后台任务：list / stop <id>',
                    'approve': '批准待处理的审批请求：/approve [<id>]',
                    'quality': '质量统计：stats / list / trend（按服务商）',
                    'compactions': '压缩历史 [sessionId]',
                    'diagnostics': '轮次诊断 [sessionId]',
                    'exit': '退出'},
                unknown: '未知命令：{command}',
                ambiguous: '命令不唯一：{command}（{matches}）',
                label: '命令',
                status: { running: '进行中', completed: '已完成', cancelled: '已取消', failed: '失败' }
            },
            hint: AGENT_UI_HINT_ZH,
            menu: { ...AGENT_UI_MENU_ZH, panel: AGENT_UI_PANEL_ZH, diag: AGENT_UI_DIAG_ZH, transcript: AGENT_UI_TRANSCRIPT_ZH },
            context: {
                strategy: '上下文 {strategy}',
                level: '级别 {level}',
                summary: '已摘要',
                noSummary: '无摘要',
                messages: '{before}→{after} 条消息',
                tokens: '{before}→{after} tokens',
                saved: '节省 {ratio}%',
                retained: '保留 {rate}%',
                anchors: '{count} 个锚点',
                tools: '{count} 个工具',
                cumulative: '累计 {count} tokens'
            },
            timeline: {
                thought: '思考 · ',
                tool: '工具 · ',
                command: '$ ',
                plan: '计划 · ',
                'file-change': '文件 · ',
                question: '提问 · ',
                approval: '审批 · ',
                error: '错误 · ',
                warning: '警告 · ',
                cancelled: '已取消 · ',
                system: '系统 · ',
                event: '事件 · ',
                rawOutput: '原始输出',
                loadingOutput: '正在读取原始输出…',
                truncated: '（已截断）',
                actionRetry: '重试',
                actionReview: '审批',
                workedFor: '用时 {duration} · 完成于 {time}',
                planSummary: '{total} 步（已完成 {completed} 步）'
            },
            mention: { folder: '文件夹', file: '文件', skill: '技能', plugin: '插件' },
            approval: {
                required: '需要审批',
                allowPrompt: '需要审批 · 允许 {tool}？',
                actions: 'a 允许   d 拒绝   A 本会话始终允许   y 复制   ↑↓ 移动   Esc 关闭',
                reason: '原因：{reason}',
                noReason: '未提供原因',
                expiresIn: '{seconds} 秒后过期',
                expired: '已过期',
                accessibilityTitle: '审批',
                accessibility: '审批。{count} 项待处理。',
                accessibilitySelected: '审批。{count} 项待处理。已选：{tool}。',
                pendingTitle: '待处理审批',
                tool: '工具：{tool}',
                input: '输入：{input}',
                inputNone: '输入：-',
                timeout: '超时：{ms}ms',
                expiresAt: '过期：{time}',
                reasonCode: { 'tool-requires-approval': '工具「{tool}」需要审批。' }
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
                expandAction: '点击展开',
                expandEnter: '… 还有 {count} 行，按 Enter 展开',
                collapseEnter: '按 Enter 收起',
                followUpOnlyTerms: AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS
            },
            session: {
                closing: AGENT_UI_SESSION_CLOSING_MESSAGES['zh-CN']
            },
            tool: {
                ...AGENT_UI_TOOL_LABELS_ZH,
                list_dir: '检查目录', glob_search: '搜索文件', content_search: '搜索代码',
                read_file: '读取文件', write_file: '创建文件', edit_file: '修改文件', apply_patch: '应用修改',
                mkdir: '创建目录', todo: '更新计划', ask_user: '等待你的输入',
                coding_task: '执行实现任务', git_operations: '检查版本状态',
                stat: '查看文件信息', watch_files: '监听文件', move_file: '移动文件', copy_file: '复制文件',
                delete_file: '删除文件', web_search: '联网搜索', web_extract: '抓取网页',
                weather: '查询天气', location: '解析位置', terminal: '执行命令',
                background_task: '运行后台任务', schedule: '定时提示',
                spawn_agent: '派生子 agent', parallel_spawn: '并行执行任务', orchestrate: '编排任务',
                fan_out: '并发分发', map_reduce: '映射归约', race: '竞速任务',
                wait_all: '等待全部任务', wait_any: '等待任一任务', escalate: '升级处理',
                tool_search: '搜索工具', tool_inspect: '查看工具', review_diff: '审查差异',
                'process.start': '启动进程', 'process.poll': '查询进程', 'process.kill': '结束进程',
                invoked: '正在执行 {label}', completed: '{label}已完成', failed: '{label}未完成', failedWithError: '{label}未完成：{error}', skipped: '{label}已跳过', skippedWithReason: '{label}已跳过：{reason}', gitMissing: '未检测到 Git 仓库。如需版本控制，可让 agent 初始化仓库（git init）。', searchUnavailable: '未配置联网搜索适配器；请在设置中配置搜索适配器。'
            }
        }
    }
};
