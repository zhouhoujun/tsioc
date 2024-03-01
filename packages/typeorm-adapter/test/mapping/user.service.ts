import { Injectable } from '@tsdi/ioc';
import { InternalServerExecption } from '@tsdi/common/transport';
import { InjectRepository, Transactional } from '@tsdi/repository';
import { Repository } from 'typeorm';
import { User } from '../models/models';

@Injectable()
export class UserService {

    constructor(@InjectRepository(User) private usrRep: Repository<User>) {
        
    }

    @Transactional()
    async save(user: User, check?: boolean) {
        const val = await this.usrRep.save(user);
        if (check) throw new InternalServerExecption('check');
        return val;
    }

    @Transactional()
    async delete(id: string, check?: boolean) {
        const del = await this.usrRep.delete(id);
        if (check) throw new InternalServerExecption('check');
        return del
    }

    async findByAccount(account: string) {
        return await this.usrRep.findOne({ where: { account } });
    }

    search(key: string, skip?: number, take?: number) {
        let qsb = this.usrRep.createQueryBuilder('usr');
        if (key) {
            const keywords = `%${key}%`;
            qsb = qsb.where('usr.name LIKE :keywords OR usr.id::text = :key', { keywords, key })
        }

        return qsb.skip(skip)
            .take(take)
            .getManyAndCount();
    }

}