/**
 * Granular approval categories.
 *
 * Rules in `DEFAULT_APPROVAL_REQUIRED_RULES` name a category member
 * (`shell.exec`, `fs.write`) rather than a tool, so matching needs the tool's
 * category. Kept in its own module for the source-size budget.
 */
export type ApprovalCategory = 'sandbox' | 'network' | 'mcp' | 'skill' | 'fs';

export const APPROVAL_CATEGORY_DEFINITIONS: Record<ApprovalCategory, { names: string[]; prefixes: string[] }> = {
    fs: {
        names: ['write_file', 'edit_file', 'apply_patch', 'delete_file', 'move_file', 'copy_file', 'mkdir', 'fs.write', 'fs.delete', 'fs.rename', 'fs.move', 'fs.copy', 'fs.mkdir'],
        prefixes: ['fs.'],
    },
    network: {
        names: ['web_search', 'web_extract', 'http_fetch', 'http_request', 'browser_open', 'text_browser', 'playwright_browser', 'web_fetch'],
        prefixes: ['web_', 'http_', 'browser_']
    },
    mcp: {
        names: [],
        prefixes: ['mcp.', 'mcp_']
    },
    skill: {
        names: ['skill_list', 'read_skill'],
        prefixes: ['skill.', 'skill_']
    },
    sandbox: {
        names: ['terminal', 'process.start', 'process.poll', 'process.kill', 'execute_code', 'shell.exec', 'sudo.exec', 'git_operations', 'deploy', 'bash', 'sh'],
        prefixes: []
    }
};

const APPROVAL_CATEGORY_ORDER: ApprovalCategory[] = ['fs', 'network', 'mcp', 'skill', 'sandbox'];

/** Structural tool metadata used to derive the approval category (A3). */
export interface ApprovalCategoryMetadata {
    origin?: 'builtin' | 'skill' | 'mcp';
    sandboxCapability?: string;
}

/**
 * Classify a tool into its granular approval category. When `metadata` is
 * provided it is the primary signal (skill/mcp origins and network/sandbox
 * execution capabilities map directly); otherwise the historical name /
 * prefix table is used. `echo`/`memory.*` and unknown tools stay undefined.
 */
export function classifyApprovalCategory(toolName: string, metadata?: ApprovalCategoryMetadata): ApprovalCategory | undefined {
    if (metadata) {
        if (metadata.origin === 'skill') {
            return 'skill';
        }
        if (metadata.origin === 'mcp') {
            return 'mcp';
        }
        if (metadata.sandboxCapability === 'network_fetch') {
            return 'network';
        }
        if (
            metadata.sandboxCapability === 'process_exec' ||
            metadata.sandboxCapability === 'code_exec' ||
            metadata.sandboxCapability === 'vcs_exec'
        ) {
            return 'sandbox';
        }
    }
    const name = String(toolName ?? '').trim();
    if (!name) {
        return undefined;
    }
    for (const category of APPROVAL_CATEGORY_ORDER) {
        const definition = APPROVAL_CATEGORY_DEFINITIONS[category];
        if (definition.names.includes(name)) {
            return category;
        }
        for (const prefix of definition.prefixes) {
            if (name.startsWith(prefix)) {
                return category;
            }
        }
    }
    return undefined;
}
