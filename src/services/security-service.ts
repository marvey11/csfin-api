import config from "config";

import { Service } from "typedi";
import { FindConditions, getRepository, InsertResult, Repository } from "typeorm";

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

    /**
     * Adds a security to the database (or tries to update it in case there is already an entry with the same ISIN).
     *
     * @param data The DTO containing the data for the security to be added.
     *
     * @returns An InsertResponse object.
     */
    async addOrUpdate(data: CreateSecurityRequest): Promise<InsertResult> {
        const security: Security = this.repository.create();
        security.isin = data.isin;
        security.nsin = data.nsin;
        security.name = data.name;
        security.type = data.type;

        return this.repository
            .createQueryBuilder()
            .insert()
            .values(security)
            .orUpdate({ conflict_target: ["isin"], overwrite: ["nsin", "name", "type"] })
            .execute();
    }
}

export { SecuritiesService };
