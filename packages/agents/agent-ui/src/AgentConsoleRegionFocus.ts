import { Injectable } from '@tsdi/ioc';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';

export type AgentConsoleRegion = 'composer' | 'transcript';

@Injectable()
export class AgentConsoleRegionFocusController {
    private transcriptNavigation?: AgentConsoleTranscriptNavigationController;
    private current: AgentConsoleRegion = 'composer';

    constructor(private readonly state: AgentConsoleSessionState) {}

    get activeRegion(): AgentConsoleRegion {
        return this.current;
    }

    attachTranscriptNavigation(controller: AgentConsoleTranscriptNavigationController): void {
        this.transcriptNavigation = controller;
    }

    focusComposer(): void { this.setRegion('composer'); }
    blurComposer(): void {
        if (this.current === 'composer') this.state.setInputFocused(false);
    }

    focusTranscript(): boolean {
        if (this.state.messageLayout !== 'viewport') return false;
        this.setRegion('transcript');
        return true;
    }

    private setRegion(current: AgentConsoleRegion): void {
        this.current = current;
        const transcript = current === 'transcript';
        this.state.setInputFocused(!transcript);
        this.transcriptNavigation?.setFocused(transcript);
    }
}
