import { EntityRepository, Repository } from 'typeorm';
import { User } from '../models/models';

@EntityRepository(User)
export class UserRepository extends Repository<User> {

    async findByAccount(account: string) {
        return await this.findOne({ where: { account } });
    }

    search(key: string, skip?: number, take?: number) {
        let qsb = this.createQueryBuilder('usr');
        if (key) {
            const keywords = `%${key}%`;
            qsb = qsb.where('usr.name LIKE :keywords OR usr.id::text = :key', { keywords, key })
        }

        return qsb.skip(skip)
            .take(take)
            .getManyAndCount();
    }
}
