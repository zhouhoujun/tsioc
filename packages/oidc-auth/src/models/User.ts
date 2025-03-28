import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column({ nullable: true })
    @Exclude()
    password!: string;

    @Column({ nullable: true })
    email!: string;

    @Column({ nullable: true })
    firstName!: string;

    @Column({ nullable: true })
    lastName!: string;

    @Column({ nullable: true })
    avatar!: string;

    // OIDC相关字段
    @Column({ nullable: true, unique: true })
    oidcId!: string;

    @Column({ nullable: true })
    oidcProvider!: string;

    @Column({ type: 'json', nullable: true })
    oidcProfile!: any;

    @Column({ nullable: true })
    accessToken!: string;

    @Column({ nullable: true })
    refreshToken!: string;

    @Column({ type: 'timestamp', nullable: true })
    tokenExpiresAt!: Date;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
