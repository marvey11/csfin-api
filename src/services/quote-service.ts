import config from "config";
import moment from "moment";
import { Service } from "typedi";
import { getRepository, Repository, SelectQueryBuilder } from "typeorm";
import { AddQuoteDataRequest, NewestDatesOptions, NewestSharePriceDateDTO } from "../dtos";
import { QuoteData, Security } from "../entities";
import { ExchangeService } from "./exchange-service";
import { SecuritiesService } from "./security-service";

type QuoteCountData = {
    isin: string;
    exchange: string;
    count: number;
};

@Service()
class QuoteDataService {
    private repository: Repository<QuoteData>;

    constructor(private securityService: SecuritiesService, private exchangeService: ExchangeService) {
        this.repository = getRepository<QuoteData>(QuoteData, config.get("ormconfig.connection"));
    }

    async get(isin: string, exchangeID: number, startDate?: string, endDate?: string): Promise<QuoteData[]> {
        const query = this.repository
            .createQueryBuilder("q")
            .innerJoin("q.security", "s")
            .innerJoin("q.exchange", "e")
            .where("s.isin = :isin", { isin: isin })
            .andWhere("e.id = :exid", { exid: exchangeID });

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

                query.andWhere("q.date BETWEEN :start AND :end", {
                    start: new Date(startTimeStamp).toISOString(),
                    end: end.toISOString()
                });
            }
        }

        return query.getMany();
    }

    async add(data: AddQuoteDataRequest): Promise<void> {
        return this.securityService.getOne({ isin: data.isin }).then(async (security: Security) => {
            const exchange = await this.exchangeService.getOne({ name: data.exchange });
            /*
             * Creates a list of items that need to be inserted or updated. And we really don't care which at this
             * point; we only want to make sure that the newest data is in the repository.
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
    }

    async getNewestDates(options: NewestDatesOptions): Promise<NewestSharePriceDateDTO[]> {
        const datesOnly = options && options["date-only"];
        return this.subQueryMinMaxDates(this.repository.createQueryBuilder().subQuery())
            .getRawMany()
            .then((data) =>
                data.map((x) => {
                    const ndate = new Date(x.newestDate);
                    const newestDateString = datesOnly ? moment(ndate).format("YYYY-MM-DD") : ndate.toISOString();
                    return { isin: x.isin, exchange: x.ename, newestDate: newestDateString };
                })
            );
    }

    getMinMaxDates(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "q.securityId AS sid",
                "q.exchangeId AS eid",
                "MIN(q.date) AS min_date",
                "MAX(q.date) AS max_date"
            ])
            .from(QuoteData, "q")
            .groupBy("sid")
            .addGroupBy("eid");
    }

    /**
     * Query builder for the subquery that returns both the oldest and the newest date for each of the securities that a share price is
     * stored with.
     *
     * @param qb the query builder of the calling query
     * @returns the query builder for the subquery
     *
     * For the SQL equivalent see docs/database.md
     */
    private subQueryMinMaxDates(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "s.id AS sid",
                "s.isin as isin",
                "s.name AS sname",
                "s.type AS itype",
                "e.id AS eid",
                "e.name AS ename",
                "MIN(q.date) AS oldestDate",
                "MAX(q.date) AS newestDate"
            ])
            .from(QuoteData, "q")
            .leftJoin("q.security", "s")
            .leftJoin("q.exchange", "e")
            .groupBy("sid")
            .addGroupBy("eid");
    }

    /**
     * Returns the number of quotes stored in the database for the specified security and exchange combination.
     *
     * @param isin the security's ISIN
     * @param exchangeID the exchange ID
     * @returns the number of the quotes stored in the database for the security and exchange combination
     */
    async getQuoteCount(): Promise<QuoteCountData[]> {
        return this.repository
            .createQueryBuilder("q")
            .select("s.isin ", "isin")
            .innerJoin("q.security", "s")
            .innerJoin("q.exchange", "e")
            .groupBy("s.id")
            .addGroupBy("e.id")
            .addSelect("e.name ", "exchange")
            .addSelect("COUNT(*) ", "count")
            .getRawMany()
            .then((rows) => rows.map((x) => ({ isin: x.isin, exchange: x.exchange, count: Number(x.count) })));
    }
}

export { QuoteDataService, QuoteCountData };
