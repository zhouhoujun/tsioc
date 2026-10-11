import { NestedMessages } from '@tsdi/i18n';

/**
 * Error copy for agent-ui thrown by hosts that cannot reach the i18n
 * translator (event bridge, RPC client, session state). These templates are
 * the English source of truth; call sites without a translator fall back to
 * them so behaviour is unchanged when no translator is wired.
 */
export const AGENT_UI_ERROR_EN: NestedMessages = {
    sessionIdRequired: 'sessionId is required',
    base64EncodingUnavailable: 'Base64 encoding is unavailable in this environment.',
    base64DecodingUnavailable: 'Base64 decoding is unavailable in this environment.',
    audioUploadFailed: 'audio upload failed',
    attachUsage: 'Usage: /attach <path>',
    unsupportedAttachmentFormat: "Unsupported attachment format for '{targetPath}'.",
    sessionStateRequiresCommandExecution: 'AgentConsoleSessionState requires COMMAND_EXECUTION_CONTROL from its host injector.',
    terminalToolUnavailable: 'Terminal tool is not available in this environment.',
    terminalToolNotActivated: 'Terminal tool is not activated for this session. Approve activation or use /tools.',
    fetchUnavailableRemoteEventBridge: 'fetch is not available; provide fetchImpl in AgentConsoleRemoteEventBridgeOptions',
    sseConnectionFailed: 'SSE connection failed: HTTP {status}',
    sseResponseNoBody: 'SSE response has no body',
    fetchUnavailableHttpAppRpc: 'fetch is not available; provide fetchImpl in HttpAgentConsoleAppRpcOptions',
    noGoalLinked: 'No goal linked to this session.'
};

export const AGENT_UI_ERROR_ZH: NestedMessages = {
    sessionIdRequired: '需要提供 sessionId。',
    base64EncodingUnavailable: '当前环境不支持 Base64 编码。',
    base64DecodingUnavailable: '当前环境不支持 Base64 解码。',
    audioUploadFailed: '音频上传失败。',
    attachUsage: '用法：/attach <path>',
    unsupportedAttachmentFormat: '不支持的附件格式：\'{targetPath}\'。',
    sessionStateRequiresCommandExecution: 'AgentConsoleSessionState 需要宿主注入器提供 COMMAND_EXECUTION_CONTROL。',
    terminalToolUnavailable: '当前环境不支持终端工具。',
    terminalToolNotActivated: '当前会话未激活终端工具。请批准激活或使用 /tools。',
    fetchUnavailableRemoteEventBridge: 'fetch 不可用；请在 AgentConsoleRemoteEventBridgeOptions 中提供 fetchImpl。',
    sseConnectionFailed: 'SSE 连接失败：HTTP {status}',
    sseResponseNoBody: 'SSE 响应没有正文。',
    fetchUnavailableHttpAppRpc: 'fetch 不可用；请在 HttpAgentConsoleAppRpcOptions 中提供 fetchImpl。',
    noGoalLinked: '当前会话没有关联目标。'
};
