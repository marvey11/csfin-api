import config from "config";

import { Service } from "typedi";
import { FindConditions, getRepository, Repository } from "typeorm";

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

    async addOne(data: CreateExchangeRequest): Promise<SecuritiesExchange> {
        const exchange: SecuritiesExchange = this.repository.create();
        exchange.name = data.name;
        return this.repository.save(exchange);
    }

    async update(exchangeID: number, data: CreateExchangeRequest): Promise<SecuritiesExchange> {
        return this.getOne(exchangeID).then((exch: SecuritiesExchange) => {
            exch.name = data.name;
            return this.repository.save(exch);
        });
    }
}

export { ExchangeService };
