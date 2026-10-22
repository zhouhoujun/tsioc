import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { ApprovalDecision, ApprovalReviewer, DefaultApprovalStrategy, ToolApprovalManager } from '../src/tools/ToolApprovalManager';
import { AgentApprovalCompletedEvent, AgentApprovalRequestedEvent } from '../src/runtime/AgentEvents';
import { AgentAuditRecord, AuditSink } from '../src/harness/AuditSink';

class RecordingApp {
    events: any[] = [];

    async publishEvent(event: any): Promise<void> {
        this.events.push(event);
    }

    requested(): AgentApprovalRequestedEvent[] {
        return this.events.filter(event => event instanceof AgentApprovalRequestedEvent);
    }

    completed(): AgentApprovalCompletedEvent[] {
        return this.events.filter(event => event instanceof AgentApprovalCompletedEvent);
    }
}

class RecordingAuditSink extends AuditSink {
    records: AgentAuditRecord[] = [];

    async append(record: AgentAuditRecord): Promise<void> {
        this.records.push(record);
    }

    async list(): Promise<AgentAuditRecord[]> {
        return this.records.slice();
    }
}

@Suite('approval event surfacing')
export class ApprovalEventSurfacingTest {

    @Test('an auto-approved call never surfaces a request that a human must answer')
    async autoApproveDoesNotRequest() {
        const app = new RecordingApp();
        const audit = new RecordingAuditSink();
        const approvals = new ToolApprovalManager(
            app as any,
            new RandomUuidGenerator(),
            new DefaultApprovalStrategy(['shell.exec']),
            { autoApprove: true },
            audit
        );

        const result = await approvals.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        expect(result.decision).toEqual(ApprovalDecision.APPROVED);
        // The session-wide allow rule resolves the call without a human: hosts
        // must not render an approval prompt/status entry for it.
        expect(app.requested().length).toEqual(0);
        expect(app.completed().length).toEqual(1);
        expect(app.completed()[0].approved).toBe(true);
        expect(audit.records.length).toEqual(1);
        expect(audit.records[0].metadata?.decision).toEqual(ApprovalDecision.APPROVED);
        expect(audit.records[0].metadata?.reviewReason).toContain('auto-approved by session flag');
    }

    @Test('an auto-denied call reports only the denial, not a pending prompt')
    async autoDenyDoesNotRequest() {
        const app = new RecordingApp();
        const audit = new RecordingAuditSink();
        const approvals = new ToolApprovalManager(
            app as any,
            new RandomUuidGenerator(),
            new DefaultApprovalStrategy(['shell.exec']),
            { autoDeny: true },
            audit
        );

        const result = await approvals.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        expect(result.decision).toEqual(ApprovalDecision.DENIED);
        expect(app.requested().length).toEqual(0);
        expect(app.completed().length).toEqual(1);
        expect(app.completed()[0].approved).toBe(false);
        expect(audit.records[0].status).toEqual('skipped');
    }

    @Test('an auto-reviewed call resolved by the reviewer does not request human input')
    async autoReviewDoesNotRequest() {
        const app = new RecordingApp();
        const audit = new RecordingAuditSink();
        const reviewer: ApprovalReviewer = {
            review: () => 'approve'
        };
        const approvals = new ToolApprovalManager(
            app as any,
            new RandomUuidGenerator(),
            new DefaultApprovalStrategy(['shell.exec'], true),
            { autoReview: true },
            audit,
            reviewer
        );

        const result = await approvals.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        expect(result.decision).toEqual(ApprovalDecision.APPROVED);
        expect(app.requested().length).toEqual(0);
        expect(app.completed().length).toEqual(1);
        expect(app.completed()[0].approved).toBe(true);
        expect(audit.records[0].metadata?.reviewed).toEqual('auto');
    }

    @Test('a gated call that needs a human still requests and completes')
    async humanApprovalStillRequests() {
        const app = new RecordingApp();
        const audit = new RecordingAuditSink();
        const approvals = new ToolApprovalManager(
            app as any,
            new RandomUuidGenerator(),
            new DefaultApprovalStrategy(['shell.exec']),
            { defaultTimeoutMs: 1000 },
            audit
        );

        const pending = approvals.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        await new Promise<void>(resolve => setTimeout(resolve, 20));
        expect(app.requested().length).toEqual(1);
        const request = approvals.getPending()[0];
        expect(approvals.approve(request.id)).toBe(true);
        const result = await pending;
        expect(result.decision).toEqual(ApprovalDecision.APPROVED);
        expect(app.requested().length).toEqual(1);
        expect(app.completed().length).toEqual(1);
        expect(app.completed()[0].approved).toBe(true);
    }

    @Test('a call the strategy does not gate publishes nothing')
    async ungatedCallPublishesNothing() {
        const app = new RecordingApp();
        const approvals = new ToolApprovalManager(
            app as any,
            new RandomUuidGenerator(),
            new DefaultApprovalStrategy(['shell.exec']),
            { autoApprove: true }
        );
        const result = await approvals.checkApproval('read_file', { path: 'a' }, 's1');
        expect(result.decision).toEqual(ApprovalDecision.NOT_REQUIRED);
        expect(app.events.length).toEqual(0);
    }
}
