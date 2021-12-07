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
        const value = await roleRepo.save(role);
        if (check) throw new Error('check');
        this.logger.info(value);
        return value;
    }


    @RouteMapping('/:name', 'get')
    async getRole(name: string) {
        this.logger.log('name:', name);
        return await this.repo.findOne({ where: { name } });
    }


    @Transactional()
    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        this.logger.log('id:', id);
        await this.repo.delete(id);
        return true;
    }


}
