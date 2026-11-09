import { Inject, Injectable } from '@tsdi/ioc';
import { Repository } from 'typeorm';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AuthUserEntity } from '../models/AuthUser';
import {
    AuthUserRecord,
    CreateAuthUser,
    normalizeEmail,
    normalizeUsername,
    UpdateAuthUser,
    UserStore
} from './UserStore';

function toRecord(entity: AuthUserEntity): AuthUserRecord {
    return {
        id: entity.id,
        username: entity.username,
        email: entity.email ?? null,
        passwordHash: entity.passwordHash ?? null,
        displayName: entity.displayName ?? null,
        roles: entity.roles ?? [],
        provider: entity.provider,
        externalId: entity.externalId ?? null,
        emailVerified: entity.emailVerified,
        picture: entity.picture ?? null,
        lastLoginAt: entity.lastLoginAt ?? null,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt
    };
}

/**
 * TypeORM backed user store.
 *
 * Requires `OIDCModule.withPersistence(...)` (which registers a TypeORM
 * connection containing `AuthUserEntity`).
 */
@Injectable()
export class TypeOrmUserStore extends UserStore {
    constructor(@Inject(TypeormAdapter) private readonly adapter: TypeormAdapter) {
        super();
    }

    private async repository(): Promise<Repository<AuthUserEntity>> {
        await this.adapter.ready();
        return this.adapter.getRepository(AuthUserEntity);
    }

    async findById(id: string): Promise<AuthUserRecord | null> {
        const repo = await this.repository();
        const entity = await repo.findOne({ where: { id } });
        return entity ? toRecord(entity) : null;
    }

    async findByUsername(username: string): Promise<AuthUserRecord | null> {
        const normalized = normalizeUsername(username);
        if (!normalized) {
            return null;
        }
        const repo = await this.repository();
        const entity = await repo.findOne({ where: { username: normalized } });
        return entity ? toRecord(entity) : null;
    }

    async findByEmail(email: string): Promise<AuthUserRecord | null> {
        const normalized = normalizeEmail(email);
        if (!normalized) {
            return null;
        }
        const repo = await this.repository();
        const entity = await repo.findOne({ where: { email: normalized } });
        return entity ? toRecord(entity) : null;
    }

    async findByExternal(provider: string, externalId: string): Promise<AuthUserRecord | null> {
        if (!provider || !externalId) {
            return null;
        }
        const repo = await this.repository();
        const entity = await repo.findOne({ where: { provider, externalId } });
        return entity ? toRecord(entity) : null;
    }

    async create(input: CreateAuthUser): Promise<AuthUserRecord> {
        const repo = await this.repository();
        const entity = repo.create({
            username: normalizeUsername(input.username),
            email: normalizeEmail(input.email) ?? null,
            passwordHash: input.passwordHash ?? null,
            displayName: input.displayName ?? null,
            roles: input.roles ?? [],
            provider: input.provider ?? 'local',
            externalId: input.externalId ?? null,
            emailVerified: input.emailVerified ?? false,
            picture: input.picture ?? null,
            lastLoginAt: null
        });
        return toRecord(await repo.save(entity));
    }

    async update(id: string, patch: UpdateAuthUser): Promise<AuthUserRecord> {
        const repo = await this.repository();
        const entity = await repo.findOne({ where: { id } });
        if (!entity) {
            throw new Error(`User ${id} not found`);
        }
        if (patch.username !== undefined) {
            entity.username = normalizeUsername(patch.username);
        }
        if (patch.email !== undefined) {
            entity.email = normalizeEmail(patch.email) ?? null;
        }
        if (patch.passwordHash !== undefined) {
            entity.passwordHash = patch.passwordHash;
        }
        if (patch.displayName !== undefined) {
            entity.displayName = patch.displayName;
        }
        if (patch.roles !== undefined) {
            entity.roles = patch.roles ?? [];
        }
        if (patch.provider !== undefined) {
            entity.provider = patch.provider;
        }
        if (patch.externalId !== undefined) {
            entity.externalId = patch.externalId;
        }
        if (patch.emailVerified !== undefined) {
            entity.emailVerified = patch.emailVerified;
        }
        if (patch.picture !== undefined) {
            entity.picture = patch.picture;
        }
        if (patch.lastLoginAt !== undefined) {
            entity.lastLoginAt = patch.lastLoginAt;
        }
        return toRecord(await repo.save(entity));
    }

    async touchLastLogin(id: string, at: Date = new Date()): Promise<void> {
        const repo = await this.repository();
        await repo.update(id, { lastLoginAt: at });
    }
}
