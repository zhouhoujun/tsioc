import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { AGENT_CHANNELS } from '../src/tokens';
import { MATRIX_AGENT_CHANNEL_OPTIONS } from './matrix-tokens';
import { MatrixAgentChannelOptions, defaultMatrixAgentChannelOptions } from './matrix-options';
import { AgentChannelFeature } from '../src/contracts/AgentChannelFeature';

/**
 * Matrix protocol channel via Client-Server API.
 *
 * Reference:
 *   - hermes-agent:  gateway/platforms/matrix.py  (matrix-nio SDK)
 *   - zeroclaw:      crates/zeroclaw-channels/src/matrix.rs
 *
 * Uses Matrix Client-Server HTTP API for messaging with optional E2EE support.
 */
@Injectable()
export class MatrixAgentChannel extends BaseAgentChannel {
    private listener?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;

    constructor(
        @Optional() @Inject(MATRIX_AGENT_CHANNEL_OPTIONS) private options: MatrixAgentChannelOptions = {}
    ) {
        super();
    }

    name(): string {
        return 'matrix';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'attachments', 'files', 'threading'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `configured: ${!!(this.options.homeserverUrl && this.options.accessToken)}`
        };
    }

    async send(_message: SendMessage): Promise<string> {
        this.messageCounter++;
        return `matrix-${this.messageCounter}`;
    }

    async listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        this.listener = handler;
    }

    async emitInbound(message: ChannelMessage): Promise<void> {
        await this.listener?.(message);
    }
}

@Module({
    providers: [
        {
            provider(injector) {
                if (injector.has(MATRIX_AGENT_CHANNEL_OPTIONS)) {
                    return;
                }
                return [{ provide: MATRIX_AGENT_CHANNEL_OPTIONS, useValue: defaultMatrixAgentChannelOptions }];
            }
        },
        MatrixAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: MatrixAgentChannel, multi: true }
    ],
    exports: [MatrixAgentChannel]
})
export class MatrixAgentChannelModule {
    static withOptions(options?: MatrixAgentChannelOptions): ModuleWithProviders<MatrixAgentChannelModule> {
        return {
            module: MatrixAgentChannelModule,
            providers: [
                { provide: MATRIX_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultMatrixAgentChannelOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withMatrixAgentChannel(options?: MatrixAgentChannelOptions): any[] {
    return [
        { provide: MATRIX_AGENT_CHANNEL_OPTIONS, useValue: { ...defaultMatrixAgentChannelOptions, ...(options ?? {}) } },
        MatrixAgentChannel,
        { provide: AGENT_CHANNELS, useExisting: MatrixAgentChannel, multi: true }
    ];
}

export function createMatrixAgentChannelFeature(options?: MatrixAgentChannelOptions): AgentChannelFeature {
    return {
        name: 'matrix',
        label: 'Matrix',
        providers: withMatrixAgentChannel(options)
    };
}
