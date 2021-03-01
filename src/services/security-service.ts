import config from "config";

import { Service } from "typedi";
import { FindConditions, getRepository, Repository } from "typeorm";

import { CreateSecurityRequest } from "../dtos";
import { Security } from "../entities";

@Service()
class SecuritiesService {
    private repository: Repository<Security>;

    constructor() {
        this.repository = getRepository<Security>(Security, config.get("ormconfig.connection"));
    }

    async getAll(): Promise<Security[]> {
        return this.repository.find();
    }

    async getOne(condition: FindConditions<Security>): Promise<Security> {
        return this.repository.findOneOrFail(condition);
    }

    async addOne(data: CreateSecurityRequest): Promise<Security> {
        const security: Security = this.repository.create();
        security.nsin = data.nsin;
        security.isin = data.isin;
        security.name = data.name;
        security.type = data.type;
        return this.repository.save(security);
    }

    async update(isin: string, data: CreateSecurityRequest): Promise<Security> {
        return this.getOne({ isin: isin }).then((s: Security) => {
            s.isin = data.isin;
            s.nsin = data.nsin;
            s.name = data.name;
            s.type = data.type;
            return this.repository.save(s);
        });
    }
}

export { SecuritiesService };
