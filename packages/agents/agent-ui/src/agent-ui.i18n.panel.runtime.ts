/**
 * Runtime chrome copy for the panel catalog: state words, usage windows, the
 * diagnostics dashboard, `/debug-config`, app categories and the pager HUD.
 *
 * Split from `agent-ui.i18n.panel.ts` to keep every catalog file under the
 * 600-line budget; merged back into `agent.menu.panel.*`.
 */

export const AGENT_UI_PANEL_RUNTIME_EN: Record<string, any> = {
    state: {
        on: 'ON',
        off: 'OFF',
        none: 'none',
        default: '(default)'
    },
    usage: {
        day: 'day',
        week: 'week',
        all: 'all',
        window: '{label} {turns} turns · {input} in · {output} out · {total} total'
    },
    dashboard: {
        usage: 'usage',
        quality: 'quality',
        compaction: 'compaction',
        diagnostics: 'diagnostics'
    },
    debug: {
        title: 'Debug config:',
        available: ' (available: {names})',
        session: 'session: {sessionId} · workspace: {workspace}',
        on: 'on',
        off: 'off'
    },
    apps: {
        categoryCode: 'code',
        categoryMessaging: 'messaging'
    },
    pager: {
        plain: 'Pager · Esc close · ↑↓ scroll',
        withMatches: 'Pager {index}/{total} · Esc close · ↑↓ scroll'
    },
};

export const AGENT_UI_PANEL_RUNTIME_ZH: Record<string, any> = {
    state: {
        on: '开启',
        off: '关闭',
        none: '无',
        default: '（默认）'
    },
    usage: {
        day: '今天',
        week: '本周',
        all: '全部',
        window: '{label} {turns} 轮 · 输入 {input} · 输出 {output} · 合计 {total}'
    },
    dashboard: {
        usage: '用量',
        quality: '质量',
        compaction: '压缩',
        diagnostics: '诊断'
    },
    debug: {
        title: '调试配置：',
        available: '（可用：{names}）',
        session: '会话：{sessionId} · 工作区：{workspace}',
        on: '开启',
        off: '关闭'
    },
    apps: {
        categoryCode: '代码',
        categoryMessaging: '消息'
    },
    pager: {
        plain: '翻页 · Esc 关闭 · ↑↓ 滚动',
        withMatches: '翻页 {index}/{total} · Esc 关闭 · ↑↓ 滚动'
    },
};
