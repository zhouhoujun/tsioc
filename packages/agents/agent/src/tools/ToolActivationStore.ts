import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class ToolActivationStore {
    abstract activate(sessionId: string, name: string): void;
    abstract isActive(sessionId: string, name: string): boolean;
    abstract getActive(sessionId: string): string[];
}
