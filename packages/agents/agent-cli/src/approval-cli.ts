import type { Command } from 'commander';
import { runAgentApprovalDecision, runAgentApprovalList } from './approval-command';

/** `tsdi-agent approval list|approve|reject` (out-of-band / third-party). */
export function registerApprovalCli(program: Command): void {
    const applyOptions = (command: any) => command
        .option('--gateway-url <url>', 'Gateway base URL (or TSDI_AGENT_GATEWAY_URL).')
        .option('--token <token>', 'Bearer token: session owner or a dedicated approver token.')
        .option('--json', 'Output JSON.');
    const approval = program
        .command('approval')
        .description('List or resolve pending tool approvals on a running gateway (out-of-band / third-party).');
    applyOptions(approval.command('list'))
        .description('List pending approvals.')
        .option('--session <id>', 'Only this session.')
        .action(async (options: any) => {
            await runAgentApprovalList(options);
        });
    applyOptions(approval.command('approve <id>'))
        .description('Approve a pending request.')
        .action(async (id: string, options: any) => {
            await runAgentApprovalDecision('approve', id, options);
        });
    applyOptions(approval.command('reject <id>'))
        .description('Reject a pending request.')
        .action(async (id: string, options: any) => {
            await runAgentApprovalDecision('reject', id, options);
        });
}
