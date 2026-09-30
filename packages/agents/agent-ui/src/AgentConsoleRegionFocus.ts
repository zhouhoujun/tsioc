import { FocusRegionManager } from '@tsdi/components';
import { Injectable } from '@tsdi/ioc';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';

export type AgentConsoleRegion = 'composer' | 'transcript';

@Injectable()
export class AgentConsoleRegionFocusController {
    private readonly regions = new FocusRegionManager();
    private transcriptNavigation?: AgentConsoleTranscriptNavigationController;

    constructor(private readonly state: AgentConsoleSessionState) {
        this.regions.register({
            id: 'composer',
            focus: () => this.state.setInputFocused(true),
            blur: () => this.state.setInputFocused(false)
        });
        this.regions.register({
            id: 'transcript',
            focus: () => this.transcriptNavigation?.setFocused(true),
            blur: () => this.transcriptNavigation?.setFocused(false)
        });
        this.regions.focus('composer');
    }

    get activeRegion(): AgentConsoleRegion {
        return this.regions.activeRegion === 'transcript' ? 'transcript' : 'composer';
    }

    attachTranscriptNavigation(controller: AgentConsoleTranscriptNavigationController): void {
        this.transcriptNavigation = controller;
    }

    focusComposer(): void { this.regions.focus('composer'); }
    blurComposer(): void { this.regions.blur('composer'); }

    focusTranscript(): boolean {
        if (this.state.messageLayout !== 'viewport') return false;
        return this.regions.focus('transcript');
    }
}
