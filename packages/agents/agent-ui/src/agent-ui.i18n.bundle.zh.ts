import type { TranslationBundle } from '@tsdi/i18n';
import { AGENT_UI_NOTICE_ZH } from './agent-ui.i18n.notice.zh';
import { AGENT_UI_ERROR_ZH } from './agent-ui.i18n.error';
import { AGENT_UI_TOOL_LABELS_ZH } from './agent-ui.i18n.tools';
import { AGENT_UI_HINT_ZH, AGENT_UI_MENU_ZH } from './agent-ui.i18n.menu';
import { AGENT_UI_PANEL_ZH } from './agent-ui.i18n.panel';
import { AGENT_UI_APPROVAL_ZH } from './agent-ui.i18n.approval';
import { AGENT_UI_DIAG_ZH } from './agent-ui.i18n.diagnostics';
import { AGENT_UI_TRANSCRIPT_ZH } from './agent-ui.i18n.transcript';
import { AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS, AGENT_UI_SESSION_CLOSING_MESSAGES } from './agent-ui.i18n.constants';

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
                todosTitle: '# 待办',
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
                planSummary: '{total} 步（已完成 {completed} 步）',
                goalProgress: '目标：{met}/{total} 项达成'
            },
            mention: { folder: '文件夹', file: '文件', skill: '技能', plugin: '插件' },
            approval: AGENT_UI_APPROVAL_ZH,
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
                copyCode: '复制',
                copiedCode: '已复制',
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
