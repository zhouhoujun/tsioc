
import { ApiModel, ApiModelProperty } from '@tsdi/swagger';
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, OneToMany, EntityRepository, Repository, Connection } from 'typeorm';


@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @OneToMany(type => User, user => user.role)
    users!: User[]
}


@Entity()
export class User {
    constructor() {
    }

    @PrimaryGeneratedColumn('uuid')
    id!: string;


    @Column()
    name!: string;

    @Column({
        unique: true
    })
    account!: string;

    @Column()
    password!: string;

    @Column({ nullable: true, length: 50 })
    email!: string;

    @Column({ nullable: true, length: 50 })
    phone!: string;

    @Column({ type: 'boolean', nullable: true })
    gender!: boolean;

    @Column({ type: 'int', nullable: true })
    age!: number;

    @ManyToOne(type => Role, role => role.users, { nullable: true })
    role!: Role;

}
