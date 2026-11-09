import { Abstract, Injectable } from '@tsdi/ioc';
import { randomUUID } from 'node:crypto';

/**
 * Internal, persistence-agnostic user representation.
 */
export interface AuthUserRecord {
    id: string;
    username: string;
    email?: string | null;
    passwordHash?: string | null;
    displayName?: string | null;
    roles?: string[] | null;
    provider: string;
    externalId?: string | null;
    emailVerified?: boolean;
    picture?: string | null;
    lastLoginAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateAuthUser {
    username: string;
    email?: string | null;
    passwordHash?: string | null;
    displayName?: string | null;
    roles?: string[] | null;
    provider?: string;
    externalId?: string | null;
    emailVerified?: boolean;
    picture?: string | null;
}

export type UpdateAuthUser = Partial<Omit<AuthUserRecord, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * User store abstraction used by the auth service.
 *
 * The default module provides an in-memory implementation so that the OIDC
 * flow keeps working without a database. `OIDCModule.withPersistence()` wires
 * the TypeORM implementation instead.
 */
@Abstract()
export abstract class UserStore {
    abstract findById(id: string): Promise<AuthUserRecord | null>;
    abstract findByUsername(username: string): Promise<AuthUserRecord | null>;
    abstract findByEmail(email: string): Promise<AuthUserRecord | null>;
    abstract findByExternal(provider: string, externalId: string): Promise<AuthUserRecord | null>;
    abstract create(input: CreateAuthUser): Promise<AuthUserRecord>;
    abstract update(id: string, patch: UpdateAuthUser): Promise<AuthUserRecord>;
    abstract touchLastLogin(id: string, at?: Date): Promise<void>;
}

export function normalizeUsername(username: string): string {
    return (username ?? '').trim().toLowerCase();
}

export function normalizeEmail(email?: string | null): string | undefined {
    const value = (email ?? '').trim().toLowerCase();
    return value || undefined;
}

@Injectable()
export class InMemoryUserStore extends UserStore {
    private readonly users = new Map<string, AuthUserRecord>();

    async findById(id: string): Promise<AuthUserRecord | null> {
        const user = this.users.get(id);
        return user ? { ...user } : null;
    }

    async findByUsername(username: string): Promise<AuthUserRecord | null> {
        const normalized = normalizeUsername(username);
        const found = Array.from(this.users.values()).find(user => user.username === normalized);
        return found ? { ...found } : null;
    }

    async findByEmail(email: string): Promise<AuthUserRecord | null> {
        const normalized = normalizeEmail(email);
        if (!normalized) {
            return null;
        }
        const found = Array.from(this.users.values()).find(user => normalizeEmail(user.email) === normalized);
        return found ? { ...found } : null;
    }

    async findByExternal(provider: string, externalId: string): Promise<AuthUserRecord | null> {
        const found = Array.from(this.users.values()).find(user => user.provider === provider && user.externalId === externalId);
        return found ? { ...found } : null;
    }

    async create(input: CreateAuthUser): Promise<AuthUserRecord> {
        const now = new Date();
        const user: AuthUserRecord = {
            id: randomUUID(),
            username: normalizeUsername(input.username),
            email: normalizeEmail(input.email),
            passwordHash: input.passwordHash ?? null,
            displayName: input.displayName ?? null,
            roles: input.roles ?? [],
            provider: input.provider ?? 'local',
            externalId: input.externalId ?? null,
            emailVerified: input.emailVerified ?? false,
            picture: input.picture ?? null,
            lastLoginAt: null,
            createdAt: now,
            updatedAt: now
        };
        this.users.set(user.id, user);
        return { ...user };
    }

    async update(id: string, patch: UpdateAuthUser): Promise<AuthUserRecord> {
        const current = this.users.get(id);
        if (!current) {
            throw new Error(`User ${id} not found`);
        }
        const next: AuthUserRecord = {
            ...current,
            ...patch,
            id: current.id,
            username: normalizeUsername(patch.username ?? current.username),
            email: patch.email === undefined ? current.email : normalizeEmail(patch.email),
            updatedAt: new Date()
        };
        this.users.set(id, next);
        return { ...next };
    }

    async touchLastLogin(id: string, at: Date = new Date()): Promise<void> {
        const current = this.users.get(id);
        if (current) {
            current.lastLoginAt = at;
            current.updatedAt = at;
        }
    }
}
