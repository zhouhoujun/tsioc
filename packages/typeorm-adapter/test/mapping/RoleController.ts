import { RouteMapping, DBRepository, Transactional, RequestParam } from '@tsdi/core';
import { ILogger, Logger } from '@tsdi/logs';
import { Repository } from 'typeorm';
import { Role } from '../models/models';

@RouteMapping('/roles')
export class RoleController {

    constructor(@DBRepository(Role) private repo: Repository<Role>, @Logger() private logger: ILogger) {

    }

    @Transactional()
    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async save(role: Role, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        const value = await this.repo.save(role);
        if (check) throw new Error('check');
        this.logger.info(value);
        return value;
    }

    @Transactional()
    @RouteMapping('/save2', 'post')
    @RouteMapping('/save2', 'put')
    async save2(role: Role, @DBRepository(Role) roleRepo: Repository<Role>, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save2 isTransactionActive:', roleRepo.queryRunner?.isTransactionActive);
        const value = await roleRepo.save(role);
        if (check) throw new Error('check');
        this.logger.info(value);
        return value;
    }


    @RouteMapping('/:name', 'get')
    async getRole(name: string) {
        this.logger.log('name:', name);
        console.log('getRole isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        return await this.repo.findOne({ where: { name } });
    }


    @Transactional()
    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        this.logger.log('id:', id);
        console.log('del isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        await this.repo.delete(id);
        return true;
    }


}
