import { Component, Attribute } from '@tsdi/components';
import type { AgentConsoleRenderedMessageItem, AgentConsoleRenderedLine } from './AgentConsoleMessageRenderers';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';

const ITEM_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="message-item-block" v-style="blockStyle">
        <agent-console-routed-line v-for="line in lines" :line="line"></agent-console-routed-line>
    </div>
`;

const MARKDOWN_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="message-markdown" v-style="blockStyle">
        <agent-console-routed-line class="markdown-line" v-for="line in lines" :line="line"></agent-console-routed-line>
    </div>
`;

@Component({
    selector: 'agent-console-routed-tokens',
    template: `
        <span class="message-content">
            <span class="message-token" v-style="token.style" v-for="token in tokens">{{token.text}}</span>
        </span>
    `
})
export class AgentConsoleRoutedTokensComponent {
    @Attribute() tokens: AgentConsoleRenderedLine['tokens'] = [];
}

@Component({
    selector: 'agent-console-routed-line',
    imports: [AgentConsoleRoutedTokensComponent],
    template: `
        <label class="message-line" v-style="lineStyle" aria-label="{{ariaLabel}}">
            <span v-style="statusStyle">{{status}}</span>
            <span v-style="roleStyle" v-show="role">{{role}}</span>
            <span v-style="metaStyle" v-show="meta">{{meta}}</span>
            <span v-style="prefixStyle" v-show="prefix">{{prefix}}</span>
            <span class="message-detail-toggle" v-style="contentStyle" v-if="toggleContent" @click="toggleMessageDetail()">{{toggleContent}}</span>
            <span v-style="contentStyle" v-if="!toggleContent">
                <agent-console-routed-tokens :tokens="tokens"></agent-console-routed-tokens>
            </span>
        </label>
    `
})
export class AgentConsoleRoutedLineComponent {
    @Attribute() line?: AgentConsoleRenderedLine;

    constructor(private state: AgentConsoleSessionState) {}

    get lineStyle() { return this.line?.itemStyle || {}; }
    get ariaLabel() { return this.line?.ariaLabel || ''; }
    get status() { return this.line?.status || ''; }
    get statusStyle() { return this.line?.statusStyle || {}; }
    get role() { return this.line?.role || ''; }
    get roleStyle() { return this.line?.roleStyle || {}; }
    get meta() { return this.line?.meta || ''; }
    get metaStyle() { return this.line?.metaStyle || {}; }
    get prefix() { return this.line?.prefix || ''; }
    get prefixStyle() { return this.line?.prefixStyle || {}; }
    get contentStyle() { return this.line?.lineStyle || {}; }
    get toggleContent() { return this.line?.toggleContent || ''; }
    get tokens() { return this.toggleContent ? [] : this.line?.tokens || []; }

    toggleMessageDetail(): void {
        const messageId = String(this.line?.messageId || '').trim();
        if (!messageId) return;
        if (this.state.messageDetailOpen && this.state.selectedMessageId === messageId) {
            this.state.closeMessageDetail();
            return;
        }
        this.state.setSelectedMessageId(messageId);
        this.state.openMessageDetail(false);
    }
}

export abstract class AgentConsoleMessageTemplateBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;

    constructor(protected state: AgentConsoleSessionState) {}

    get lines(): AgentConsoleRenderedLine[] { return this.item?.lines || []; }
    get spacerBefore(): boolean { return !!this.item?.spacerBefore; }
    get blockStyle(): Record<string, string> {
        if (!this.item?.blockPadding) return {};
        return { ...(this.item.itemStyle || {}), padding: '1em 0', margin: '0' };
    }

    toggleMessageDetail(line: AgentConsoleRenderedLine): void {
        const messageId = String(line?.messageId || '').trim();
        if (!messageId) return;
        if (this.state.messageDetailOpen && this.state.selectedMessageId === messageId) {
            this.state.closeMessageDetail();
            return;
        }
        this.state.setSelectedMessageId(messageId);
        this.state.openMessageDetail(false);
    }
}

@Component({ selector: 'agent-console-user-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleUserTemplate extends AgentConsoleMessageTemplateBase {}

/** Cross-platform Markdown document. Parsed tokens are shared by DOM and TUI renderers. */
@Component({ selector: 'agent-console-markdown', imports: [AgentConsoleRoutedLineComponent], template: MARKDOWN_TEMPLATE })
export class AgentConsoleMarkdownComponent extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-thought-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleThoughtTemplate extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-tool-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleToolTemplate extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-command-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleCommandTemplate extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-plan-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsolePlanTemplate extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-files-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleFilesTemplate extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-question-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleQuestionTemplate extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-approval-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleApprovalTemplate extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-error-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleErrorTemplate extends AgentConsoleMessageTemplateBase {}

@Component({ selector: 'agent-console-system-template', imports: [AgentConsoleRoutedLineComponent], template: ITEM_TEMPLATE })
export class AgentConsoleSystemTemplate extends AgentConsoleMessageTemplateBase {}
