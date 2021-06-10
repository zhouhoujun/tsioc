import { EntityRepository, Repository } from 'typeorm';
import { User } from '../models/models';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    
    async findByAccount(account: string) {
        return await this.findOne({ where: { account } });
    }

    search(key: string, skip?: number, take?: number) {
        const keywords =  `%${key}%`;
        return this.createQueryBuilder('usr')
            .where('usr.name = :keywords OR usr.id = :key', { keywords, key })
            .skip(skip)
            .take(take)
            .getManyAndCount();
    }
}
