import config from "config";

import { Service } from "typedi";
import { getRepository, Repository, SelectQueryBuilder } from "typeorm";

import { AddQuoteDataRequest } from "../dtos";
import { QuoteData, Security } from "../entities";

import { ExchangeService } from "./exchange-service";
import { SecuritiesService } from "./security-service";

type PerformanceQuotesDTO = {
    securityISIN: string;
    securityName: string;
    exchangeName: string;
    latestDate: Date;
    latestQuote: number;
    referenceDate: Date;
    referenceQuote: number;
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

    async getPerformanceQuotes(): Promise<PerformanceQuotesDTO[]> {
        return this.repository
            .createQueryBuilder("q")
            .select([
                "rdates.isin",
                "rdates.sname",
                "rdates.ename",
                "rdates.latestDate",
                "rdates.latestQuote",
                "rdates.referenceDate",
                "q.quote AS referenceQuote"
            ])
            .leftJoin((qb) => this.getReferenceDates(qb.subQuery()), "rdates", "q.securityId = rdates.secID")
            .where("q.date = rdates.referenceDate")
            .getRawMany()
            .then((data) =>
                data.map((x) => ({
                    securityISIN: x.isin,
                    securityName: x.sname,
                    exchangeName: x.ename,
                    latestDate: new Date(x.latestDate),
                    latestQuote: Number(x.latestQuote),
                    referenceDate: new Date(x.referenceDate),
                    referenceQuote: Number(x.referenceQuote)
                }))
            );
    }

    private getReferenceDates(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "lquotes.secID",
                "lquotes.isin",
                "lquotes.sname",
                "lquotes.ename",
                "lquotes.latestDate",
                "lquotes.latestQuote",
                "MAX(q.date) AS referenceDate"
            ])
            .from(QuoteData, "q")
            .leftJoin((qb) => this.getLatestQuotes(qb.subQuery()), "lquotes", "q.securityId = lquotes.secID")
            .where("q.date <= DATE_SUB(lquotes.latestDate, INTERVAL 1 YEAR)")
            .groupBy("lquotes.isin")
            .addGroupBy("lquotes.ename");
    }

    private getLatestQuotes(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "ldates.secID",
                "ldates.isin",
                "ldates.sname",
                "ldates.ename",
                "ldates.latestDate",
                "q.quote AS latestQuote"
            ])
            .from(QuoteData, "q")
            .leftJoin((qb) => this.getLatestDates(qb.subQuery()), "ldates", "q.securityId = ldates.secID")
            .where("q.date = ldates.latestDate");
    }

    private getLatestDates(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "s.id AS secID",
                "s.isin AS isin",
                "s.name AS sname",
                "e.name AS ename",
                "MAX(q.date) AS latestDate"
            ])
            .from(QuoteData, "q")
            .leftJoin("q.security", "s")
            .leftJoin("q.exchange", "e")
            .groupBy("s.isin")
            .addGroupBy("e.name");
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

export { PerformanceQuotesDTO, QuoteDataService, QuoteCountDTO };
