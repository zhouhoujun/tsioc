export interface SpringOptions {
    value?: number;
    target?: number;
    velocity?: number;
    stiffness?: number;
    damping?: number;
    mass?: number;
}

/**
 * Deterministic damped-harmonic spring. The host supplies frame deltas (DOM
 * rAF or the shared AnimationClock); the math stays renderer-neutral and does
 * not allocate per step.
 */
export class Spring {
    value: number;
    target: number;
    velocity: number;
    stiffness: number;
    damping: number;
    mass: number;

    constructor(options: SpringOptions = {}) {
        this.value = Number(options.value ?? 0);
        this.target = Number(options.target ?? this.value);
        this.velocity = Number(options.velocity ?? 0);
        this.stiffness = Math.max(1, Number(options.stiffness ?? 170));
        this.damping = Math.max(0, Number(options.damping ?? 26));
        this.mass = Math.max(0.0001, Number(options.mass ?? 1));
    }

    setTarget(target: number): void {
        this.target = Number(target ?? this.target);
    }

    snap(target = this.target): void {
        this.value = this.target = Number(target ?? this.target);
        this.velocity = 0;
    }

    atRest(epsilon = 0.01): boolean {
        return Math.abs(this.target - this.value) < epsilon && Math.abs(this.velocity) < epsilon;
    }

    get resting(): boolean {
        return this.atRest(0.005);
    }

    /** SwiftUI-style duration/bounce mapping; mass is 1 and omega = 2π/duration. */
    static fromDuration(value: number, options: { duration: number; bounce?: number; target?: number }): Spring {
        const duration = Number(options?.duration);
        const bounce = Number(options?.bounce ?? 0);
        if (!Number.isFinite(duration) || duration <= 0) {
            throw new RangeError('spring duration must be > 0 seconds');
        }
        if (!Number.isFinite(bounce) || bounce < 0 || bounce >= 1) {
            throw new RangeError('spring bounce must be in [0, 1)');
        }
        const omega = (2 * Math.PI) / duration;
        return new Spring({
            value: Number(value) || 0,
            target: Number(options?.target ?? value) || 0,
            stiffness: omega * omega,
            damping: 2 * (1 - bounce) * omega
        });
    }

    /** Advance by `dtMs`; large deltas are clamped so tab restores stay stable. */
    step(dtMs: number): number {
        const dt = Math.min(64, Math.max(0, Number(dtMs) || 0)) / 1000;
        if (!dt) {
            return this.value;
        }
        const displacement = this.value - this.target;
        const velocity = this.velocity;
        const omega0 = Math.sqrt(this.stiffness / this.mass);
        const zeta = this.damping / (2 * Math.sqrt(this.stiffness * this.mass));
        let nextValue: number;
        let nextVelocity: number;
        if (Math.abs(zeta - 1) < 1e-6) {
            const decay = Math.exp(-omega0 * dt);
            const c = velocity + omega0 * displacement;
            nextValue = (displacement + c * dt) * decay;
            nextVelocity = (c - omega0 * (displacement + c * dt)) * decay;
        } else if (zeta < 1) {
            const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
            const decay = Math.exp(-zeta * omega0 * dt);
            const cos = Math.cos(omegaD * dt);
            const sin = Math.sin(omegaD * dt);
            const c = (velocity + zeta * omega0 * displacement) / omegaD;
            nextValue = decay * (displacement * cos + c * sin);
            nextVelocity = decay * (
                c * omegaD * cos
                - displacement * omegaD * sin
                - zeta * omega0 * (displacement * cos + c * sin)
            );
        } else {
            const root = Math.sqrt(zeta * zeta - 1);
            const r1 = omega0 * (-zeta + root);
            const r2 = omega0 * (-zeta - root);
            const b = (velocity - r1 * displacement) / (r2 - r1);
            const a = displacement - b;
            const e1 = Math.exp(r1 * dt);
            const e2 = Math.exp(r2 * dt);
            nextValue = a * e1 + b * e2;
            nextVelocity = a * r1 * e1 + b * r2 * e2;
        }
        this.value = this.target + nextValue;
        this.velocity = nextVelocity;
        if (this.atRest()) {
            this.value = this.target;
            this.velocity = 0;
        }
        return this.value;
    }
}
