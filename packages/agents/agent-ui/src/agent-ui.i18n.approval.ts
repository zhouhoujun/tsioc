import { NestedMessages } from '@tsdi/i18n';

/**
 * Permission prompt copy (request list, decision options, reason/expiry
 * details and accessibility labels) in English and Simplified Chinese.
 *
 * Kept apart from `agent-ui.i18n.panel.ts` so both catalogs stay inside the
 * source-size budget. Values mirror the English fallbacks used by
 * `AgentConsoleApprovalPanel`, so a host without a translator still renders
 * the same copy.
 */
export const AGENT_UI_APPROVAL_EN: NestedMessages = {
    required: 'Approval required',
    allowPrompt: 'Approval required · Allow {tool}?',
    allowOnce: 'Allow once',
    allowAlways: 'Always allow (session)',
    deny: 'Deny',
    actions: '↑↓ Move   y Copy   Esc Deny',
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
};

export const AGENT_UI_APPROVAL_ZH: NestedMessages = {
    required: '需要审批',
    allowPrompt: '需要审批 · 允许 {tool}？',
    allowOnce: '允许一次',
    allowAlways: '本会话始终允许',
    deny: '拒绝',
    actions: '↑↓ 移动   y 复制   Esc 拒绝',
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
};
