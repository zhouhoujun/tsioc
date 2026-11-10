import { Injectable } from '@tsdi/ioc';

/**
 * Named service container shared by plugin node executors and workflow tasks.
 * Workflows can reach installed services through `context.services`.
 */
@Injectable()
export class WorkflowServiceRegistry {
    private readonly services = new Map<string, any>();

    set(name: string, service: any): this {
        if (!name) {
            throw new Error('Workflow service requires a name');
        }
        this.services.set(name, service);
        return this;
    }

    get<T = any>(name: string): T | undefined {
        return this.services.get(name);
    }

    has(name: string): boolean {
        return this.services.has(name);
    }

    remove(name: string): boolean {
        return this.services.delete(name);
    }

    names(): string[] {
        return Array.from(this.services.keys());
    }

    toObject(): Record<string, any> {
        return Object.fromEntries(this.services.entries());
    }

    clear(): void {
        this.services.clear();
    }
}
