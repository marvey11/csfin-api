import config from "config";
import { Service } from "typedi";
import { getRepository, Repository } from "typeorm";
import { AddQuoteDataRequest } from "../dtos";
import { QuoteData } from "../entities";
import { ExchangeService } from "./exchange-service";
import { SecuritiesService } from "./security-service";

@Service()
class QuoteDataService {
    private repository: Repository<QuoteData>;

    constructor(private securityService: SecuritiesService, private exchangeService: ExchangeService) {
        this.repository = getRepository<QuoteData>(QuoteData, config.get("ormconfig.connection"));
    }

    async add(data: AddQuoteDataRequest): Promise<void> {
        for (const item of data.quoteData) {
            this.repository
                .createQueryBuilder("quote")
                .innerJoin("quote.security", "security")
                .innerJoin("quote.exchange", "exchange")
                .where("quote.security.isin = :isin", { isin: data.isin })
                .andWhere("quote.exchange.id = :exchID", { exchID: data.exchangeID })
                .andWhere("quote.date = :date", { date: item.date })
                .getOneOrFail()
                .then((quote: QuoteData) => {
                    console.log(quote);
                    console.log(item);
                    quote.quote = item.value;
                    console.log(quote);
                    this.repository.save(quote);
                }).catch(() => {
                    //
                });
        }
    }
}

export { QuoteDataService };
