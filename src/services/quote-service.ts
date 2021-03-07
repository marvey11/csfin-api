import config from "config";

import { Service } from "typedi";
import { getRepository, Repository, SelectQueryBuilder } from "typeorm";

import { AddQuoteDataRequest } from "../dtos";
import { QuoteData, Security } from "../entities";

import { ExchangeService } from "./exchange-service";
import { SecuritiesService } from "./security-service";

type AllLatestDatesDTO = {
    securityISIN: string;
    securityName: string;
    exchangeID: number;
    exchangeName: string;
    latestDate: Date;
};

type QuoteCountDTO = {
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
        const query = this.createFilteredRowsQuery(isin, exchangeID);

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
    }

    /**
     *
     * @returns
     * ```sql
     * SELECT s.isin AS isin, e.name AS exchange, MAX(q.date) AS max_date FROM quotes AS q INNER JOIN securities AS s ON q.securityId = s.id INNER JOIN exchanges AS e ON q.exchangeId = e.id GROUP BY s.isin, e.name;
     * ```
     */
    async getAllLatestDates(): Promise<AllLatestDatesDTO[]> {
        return this.createJoinedTablesQuery()
            .groupBy("s.isin")
            .addGroupBy("e.id")
            .select("s.isin", "securityISIN")
            .addSelect("s.name", "securityName")
            .addSelect("e.id", "exchangeID")
            .addSelect("e.name", "exchangeName")
            .addSelect("MAX(q.date)", "latestDate")
            .getRawMany()
            .then((rows) =>
                rows.map((x) => ({
                    securityISIN: x.securityISIN,
                    securityName: x.securityName,
                    exchangeID: Number(x.exchangeID),
                    exchangeName: x.exchangeName,
                    latestDate: new Date(x.latestDate)
                }))
            );
    }

    async getLatestDateOnOrBefore(isin: string, exchangeID: number, refDate?: Date): Promise<Date> {
        const query = this.createFilteredRowsQuery(isin, exchangeID);

        if (refDate) {
            // where() is already used in createFilteredRowsQuery()
            query.andWhere("q.date <= :date", { date: refDate.toISOString() });
        }

        return query
            .select("MAX(q.date)", "max_date")
            .getRawOne()
            .then((x) => new Date(x.max_date));
    }

    /**
     * Returns the quote value on the reference date for the specified security/exchange combination.
     *
     * This method presumes that for the specified security/exchange combination there actually is quote stored for
     * the reference date. The caller has to make sure of it, otherwise the result will be empty.
     *
     * @param isin the security's ISIN
     * @param exchangeID the exchange ID
     * @param refDate the date for which to retrieve the quote
     * @returns the quote on the reference date for the specified security/exchange
     *
     * SQL equivalent:
     * ```sql
     * SELECT q.quote FROM quotes AS q INNER JOIN securities AS s ON q.securityId = s.id INNER JOIN exchanges AS e ON q.exchangeId = e.id WHERE s.isin = {isin} AND e.id = {exchangeID} AND q.date = {refDate};
     * ```
     */
    async getQuoteForDate(isin: string, exchangeID: number, refDate: Date): Promise<number> {
        return this.createFilteredRowsQuery(isin, exchangeID)
            .andWhere("q.date = :date", { date: refDate }) // where() is already used in createFilteredRowsQuery()
            .select("q.quote", "quote")
            .getRawOne()
            .then((x) => Number(x.quote));
    }

    /**
     * Returns the number of quotes stored in the database for the specified security and exchange combination.
     *
     * @param isin the security's ISIN
     * @param exchangeID the exchange ID
     * @returns the number of the quotes stored in the database for the security and exchange combination
     *
     * SQL equivalent:
     * ```sql
     * SELECT s.isin AS isin, e.name AS name, COUNT(*) AS count FROM quotes AS q INNER JOIN securities AS s ON q.securityId = s.id INNER JOIN exchanges AS e ON q.exchangeId = e.id GROUP BY s.id, e.id;
     * ```
     */
    async getQuoteCount(): Promise<QuoteCountDTO[]> {
        return this.createJoinedTablesQuery()
            .groupBy("s.id")
            .addGroupBy("e.id")
            .select("s.isin ", "isin")
            .addSelect("e.name ", "exchange")
            .addSelect("COUNT(*) ", "count")
            .getRawMany()
            .then((rows) => rows.map((x) => ({ isin: x.isin, exchange: x.exchange, count: Number(x.count) })));
    }

    /**
     * Convenience method that returns a (partial) query joining the quotes and the securities and exchanges tables.
     *
     * @returns The query builder instance.
     *
     * SQL equivalent:
     * ```sql
     * SELECT * FROM quotes AS q INNER JOIN securities AS s ON q.securityId = s.id INNER JOIN exchanges AS e ON q.exchangeId = e.id;
     * ```
     */
    private createJoinedTablesQuery(): SelectQueryBuilder<QuoteData> {
        return this.repository.createQueryBuilder("q").innerJoin("q.security", "s").innerJoin("q.exchange", "e");
    }

    /**
     * Convenience method that returns a (partial) query with filtered rows based on a combination of ISIN and
     * exchange ID.
     *
     * @param isin The security's ISIN.
     * @param exchangeID The ID of the exchange we want the quotes for
     * @returns The query builder instance
     *
     * SQL equivalent:
     * ```sql
     * SELECT * FROM quotes AS q INNER JOIN securities AS s ON q.securityId = s.id INNER JOIN exchanges AS e ON q.exchangeId = e.id WHERE s.isin = {isin} AND e.id = {exchangeID};
     * ```
     */
    private createFilteredRowsQuery(isin: string, exchangeID: number): SelectQueryBuilder<QuoteData> {
        return this.createJoinedTablesQuery()
            .where("s.isin = :isin", { isin: isin })
            .andWhere("e.id = :exid", { exid: exchangeID });
    }
}

export { AllLatestDatesDTO, QuoteDataService, QuoteCountDTO };
