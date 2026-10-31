/**
 * Runtime chrome copy for the panel catalog: state words, usage windows, the
 * diagnostics dashboard, `/debug-config`, app categories, the pager HUD and the
 * event inspector overlay.
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
    inspector: {
        title: '── Event Inspector ──────────────────────────',
        contentEmpty: '(no content)',
        statusLine: 'Status:     {value}',
        durationLine: 'Duration:   {value}',
        diagnosticTitle: '── Diagnostic ──────────────────────────────',
        typeLine: 'Type:       {value}',
        sequenceLine: 'Sequence:   {value}',
        sourceLine: 'Source:     {value}',
        toolCallIdLine: 'ToolCallID: {value}',
        receiptIdLine: 'ReceiptID:  {value}',
        attemptLine: 'Attempt:    {value}',
        keyBindingsTitle: '── Key Bindings ─────────────────────────────',
        keyRetry: '  r       retry tool call (if failed)',
        keyCopy: '  copy    copy event detail',
        keyScroll: '  ↑/↓     scroll detail',
        keyPage: '  PgUp/PgDn  scroll page',
        keyColumns: '  ←/→     scroll columns',
        keyJump: '  Home/End   jump to start/end',
        keyClose: '  Enter/Esc  close inspector'
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
    inspector: {
        title: '── 事件检查器 ──────────────────────────',
        contentEmpty: '（无内容）',
        statusLine: '状态：{value}',
        durationLine: '耗时：{value}',
        diagnosticTitle: '── 诊断 ──────────────────────────────',
        typeLine: '类型：{value}',
        sequenceLine: '序号：{value}',
        sourceLine: '来源：{value}',
        toolCallIdLine: '工具调用 ID：{value}',
        receiptIdLine: '回执 ID：{value}',
        attemptLine: '尝试：{value}',
        keyBindingsTitle: '── 按键 ─────────────────────────────',
        keyRetry: '  r       重试工具调用（若失败）',
        keyCopy: '  copy    复制事件详情',
        keyScroll: '  ↑/↓     滚动详情',
        keyPage: '  PgUp/PgDn  翻页',
        keyColumns: '  ←/→     左右平移',
        keyJump: '  Home/End   跳到首/尾',
        keyClose: '  Enter/Esc  关闭检查器'
    },
    pager: {
        plain: '翻页 · Esc 关闭 · ↑↓ 滚动',
        withMatches: '翻页 {index}/{total} · Esc 关闭 · ↑↓ 滚动'
    },
};
