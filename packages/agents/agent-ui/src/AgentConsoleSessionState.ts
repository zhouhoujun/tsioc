import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { COMMAND_EXECUTION_CONTROL, CommandExecutionControlPort } from '@tsdi/agent';
import { defaultAgentConsoleOptions } from './AgentConsoleStateTypes';
import { AgentConsoleSessionRuntimeHost } from './AgentConsoleSessionRuntimeHost';

export * from './AgentConsoleStateTypes';

/**
 * Reactive console session state.
 *
 * Domain behavior lives in the session host chain (`...Host` modules); this
 * concrete class only owns construction, the self reference and host wiring.
 */
@Injectable()
export class AgentConsoleSessionState extends AgentConsoleSessionRuntimeHost {
    constructor(
        @Inject(COMMAND_EXECUTION_CONTROL) protected commandExecutionControl?: CommandExecutionControlPort,
        @Optional() @Inject(TranslatorService) public translator?: TranslatorService
    ) {
        super();
        // Own copy of the defaults: applyLocaleDefaults() writes into
        // consoleOptions, and the field initializer shares the module-level
        // default object (mutating it would leak one host's locale into others).
        this.consoleOptions = { ...defaultAgentConsoleOptions };
        // The injected translator may not carry its final locale yet (the i18n
        // module can configure it after this state is constructed), so the
        // locale is re-applied when the session boots.
        this.applyLocaleDefaults(this.translator?.currentLocale);
    }

    protected self(): AgentConsoleSessionState { return this; }
}
