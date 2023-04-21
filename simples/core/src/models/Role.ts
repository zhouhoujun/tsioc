
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { User } from './User';


@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @OneToMany(type => User, user => user.role, { nullable: true })
    users!: User[]
}
