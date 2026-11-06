/** Shared literal terms used by both language bundles. */
export const AGENT_UI_EN_FOLLOW_UP_ONLY_TERMS = 'more|continue|go on|keep going|carry on|next|proceed';
export const AGENT_UI_ZH_CN_FOLLOW_UP_ONLY_TERMS = '继续|继续吧|继续下去|接着|接着说|接着来|然后呢|再来|下一步|下一部分|后面呢|展开|详细点|详细一点|再详细点|补充一下|继续输出|继续生成';

export const AGENT_UI_SESSION_CLOSING_MESSAGES = {
    en: 'Closing session. Resume with: tsdi-agent chat --session {sessionId}',
    'zh-CN': '正在关闭会话。继续使用此会话：tsdi-agent chat --session {sessionId}'
} as const;
