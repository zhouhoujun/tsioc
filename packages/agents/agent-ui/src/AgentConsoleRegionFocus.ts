import { FocusRegionManager } from '@tsdi/components';
import { Injectable } from '@tsdi/ioc';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleTranscriptNavigationController } from './AgentConsoleTranscriptNavigation';

export type AgentConsoleRegion = 'composer' | 'transcript';

@Injectable()
export class AgentConsoleRegionFocusController {
    private transcriptNavigation?: AgentConsoleTranscriptNavigationController;

    constructor(private readonly state: AgentConsoleSessionState, private readonly regions: FocusRegionManager) {
        this.regions.subscribe(current => this.syncProjection(current));
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

    private syncProjection(current?: string): void {
        const transcript = current === 'transcript';
        this.state.setInputFocused(!transcript);
        this.transcriptNavigation?.setFocused(transcript);
    }
}
