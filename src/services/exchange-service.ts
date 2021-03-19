import config from "config";

import { Service } from "typedi";
import { FindConditions, getRepository, InsertResult, Repository } from "typeorm";

import { CreateExchangeRequest } from "../dtos";
import { SecuritiesExchange } from "../entities";

@Service()
class ExchangeService {
    private repository: Repository<SecuritiesExchange>;

    constructor() {
        this.repository = getRepository<SecuritiesExchange>(SecuritiesExchange, config.get("ormconfig.connection"));
    }

    async getAll(): Promise<SecuritiesExchange[]> {
        return this.repository.find();
    }

    async getOne(id: number): Promise<SecuritiesExchange>;
    async getOne(conditions: FindConditions<SecuritiesExchange>): Promise<SecuritiesExchange>;
    async getOne(id_or_conds: number | FindConditions<SecuritiesExchange>): Promise<SecuritiesExchange> {
        if (typeof id_or_conds == "number") {
            return this.repository.findOneOrFail(id_or_conds as number);
        }
        return this.repository.findOneOrFail(id_or_conds);
    }

    async addOrUpdate(data: CreateExchangeRequest | CreateExchangeRequest[]): Promise<InsertResult> {
        const result: SecuritiesExchange | SecuritiesExchange[] = Array.isArray(data)
            ? data.map((req: CreateExchangeRequest) => this.toExchange(req))
            : this.toExchange(data);

        return this.repository
            .createQueryBuilder()
            .insert()
            .values(result)
            .orUpdate({ conflict_target: ["name"], overwrite: ["name"] }) // workaround since empty overwrite doesn't work
            .execute();
    }

    private toExchange(req: CreateExchangeRequest): SecuritiesExchange {
        const exchange: SecuritiesExchange = new SecuritiesExchange();
        exchange.name = req.name;
        return exchange;
    }
}

export { ExchangeService };
