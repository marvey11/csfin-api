import config from "config";
import { Service } from "typedi";
import { getRepository, Repository } from "typeorm";
import { AddQuoteDataRequest } from "../dtos";
import { QuoteData, SecuritiesExchange, Security } from "../entities";
import { ExchangeService } from "./exchange-service";
import { SecuritiesService } from "./security-service";

@Service()
class QuoteDataService {
    private repository: Repository<QuoteData>;

    constructor(private securityService: SecuritiesService, private exchangeService: ExchangeService) {
        this.repository = getRepository<QuoteData>(QuoteData, config.get("ormconfig.connection"));
    }

    async get(isin: string, exchangeID: number, startDate?: string, endDate?: string): Promise<QuoteData[]> {
        const query = this.repository
            .createQueryBuilder("quote")
            .innerJoin("quote.security", "security")
            .innerJoin("quote.exchange", "exchange")
            .where("security.isin = :isin", { isin: isin })
            .andWhere("exchange.id = :exchID", { exchID: exchangeID });

        if (startDate) {
            const startTimeStamp: number = Date.parse(startDate);
            if (!isNaN(startTimeStamp)) {
                // checking the end date makes only sense if the start date is already valid
                // --> we initialise it with the current date
                let end: Date = new Date();
                if (endDate) {
                    // if the end date was actually set in the query params, try parsing it
                    const endTimeStamp: number = Date.parse(endDate);
                    if (!isNaN(endTimeStamp)) {
                        // if it's a valid date, then overwrite the original value
                        // ... otherwise it remains the current date from above
                        end = new Date(endTimeStamp);
                    }
                }

                query.andWhere("quote.date BETWEEN :start AND :end", {
                    start: new Date(startTimeStamp).toISOString(),
                    end: end.toISOString()
                });
            }
        }

        return query.getMany();
    }

    async add(data: AddQuoteDataRequest): Promise<void> {
        return this.securityService.getOne({ isin: data.isin }).then((security: Security) => {
            return this.exchangeService.getOne(data.exchangeID).then((exchange: SecuritiesExchange) => {
                /*
                 * Creates a list of items that need to be inserted or updated. And we really don't care which at this
                 * point; we only want to make sure that the latest data is in the repository.
                 */
                const itemList: QuoteData[] = [];
                for (const item of data.quotes) {
                    const qd = new QuoteData();
                    qd.security = security;
                    qd.exchange = exchange;
                    qd.date = item.date;
                    qd.quote = item.quote;
                    itemList.push(qd);
                }

                /*
                 * Insert or update the entities in the list.
                 *
                 * Found here: https://github.com/typeorm/typeorm/issues/1090#issuecomment-634391487
                 *
                 * Works since we made the date, security, and exchange columns a unique combination in the entity.
                 */
                this.repository
                    .createQueryBuilder()
                    .insert()
                    .values(itemList)
                    .orUpdate({ conflict_target: ["date", "security", "exchange"], overwrite: ["quote"] })
                    .execute();
            });
        });
    }
}

export { QuoteDataService };
