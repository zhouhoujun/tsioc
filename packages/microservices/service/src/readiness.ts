import { Injectable } from '@tsdi/ioc';

/**
 * Service lifecycle phase exposed through the readiness probe.
 *
 * - `STARTING`: listening/registration in progress
 * - `UP`: ready to receive traffic
 * - `DRAINING`: shutting down, no new traffic should be routed here
 * - `DOWN`: stopped (or startup failed)
 */
export type ReadinessPhase = 'STARTING' | 'UP' | 'DRAINING' | 'DOWN';

/**
 * Per-service readiness state.
 *
 * Provided by `provideService`; `MicroService` updates it across
 * start/shutdown so `/health/readiness` can answer 503 while the instance is
 * starting or draining instead of only reflecting dependency indicators.
 */
@Injectable({ singleton: true })
export class ReadinessStateService {
    private phase: ReadinessPhase = 'STARTING';

    get current(): ReadinessPhase {
        return this.phase;
    }

    get ready(): boolean {
        return this.phase === 'UP';
    }

    markStarting(): void {
        this.phase = 'STARTING';
    }

    markUp(): void {
        this.phase = 'UP';
    }

    markDraining(): void {
        this.phase = 'DRAINING';
    }

    markDown(): void {
        this.phase = 'DOWN';
    }
}
