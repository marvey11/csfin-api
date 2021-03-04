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
     * Adds a security (or list of securities) to the database (or tries to update an item in case there is already
     * one with the same ISIN).
     *
     * @param data The DTO (or list of DTOs) containing the data for the security to be added.
     * @returns An InsertResponse object.
     */
    async addOrUpdate(data: CreateSecurityRequest | CreateSecurityRequest[]): Promise<InsertResult> {
        const result: Security | Security[] = Array.isArray(data)
            ? data.map((req: CreateSecurityRequest) => this.toSecurity(req))
            : this.toSecurity(data);

        return this.repository
            .createQueryBuilder()
            .insert()
            .values(result)
            .orUpdate({ conflict_target: ["isin"], overwrite: ["nsin", "name", "type"] })
            .execute();
    }

    /**
     * Converts a create-security request to an entity.
     *
     * @param data A single create-security request
     * @returns the newly created entity
     */
    private toSecurity(data: CreateSecurityRequest): Security {
        const security: Security = this.repository.create();
        security.isin = data.isin;
        security.nsin = data.nsin;
        security.name = data.name;
        security.type = data.type;
        return security;
    }
}

export { SecuritiesService };
