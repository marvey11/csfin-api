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

    /**
     * Adds a single security to the database.
     *
     * @param data The DTO containing the data for the security to be added.
     *
     * @returns The newly created instance if adding the security was successful, or `undefined` if a
     * security item with the same ISIN already exists (in that case `update()` should be called.)
     */
    async addOne(data: CreateSecurityRequest): Promise<Security | undefined> {
        return this.getOne({ isin: data.isin })
            .then(() => {
                return undefined;
            })
            .catch(() => {
                const security: Security = this.repository.create();
                security.isin = data.isin;
                security.nsin = data.nsin;
                security.name = data.name;
                security.type = data.type;
                return this.repository.save(security);
            });
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
