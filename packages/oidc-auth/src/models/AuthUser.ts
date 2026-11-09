import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Persisted auth user.
 *
 * Local users carry a scrypt password hash. OIDC users are linked through
 * `provider` + `externalId` and normally have no password hash.
 */
@Entity('oidc_auth_users')
export class AuthUserEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column({ type: 'varchar', nullable: true, unique: true })
    email?: string | null;

    @Column({ type: 'varchar', nullable: true })
    passwordHash?: string | null;

    @Column({ type: 'varchar', nullable: true })
    displayName?: string | null;

    @Column({ type: 'simple-json', nullable: true })
    roles?: string[] | null;

    @Column({ default: 'local' })
    provider!: string;

    @Column({ type: 'varchar', nullable: true })
    externalId?: string | null;

    @Column({ type: 'boolean', default: false })
    emailVerified!: boolean;

    @Column({ type: 'varchar', nullable: true })
    picture?: string | null;

    @Column({ type: 'datetime', nullable: true })
    lastLoginAt?: Date | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
