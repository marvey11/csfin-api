import config from "config";
import moment from "moment";
import { Service } from "typedi";
import { getRepository, Repository, SelectQueryBuilder } from "typeorm";
import { AddQuoteDataRequest, NewestDatesOptions, NewestSharePriceDateDTO, RSLevyWeeklyData } from "../dtos";
import { QuoteData, Security } from "../entities";
import { ExchangeService } from "./exchange-service";
import { SecuritiesService } from "./security-service";

type PerformanceIntervalDTO = {
    unit: "day" | "month" | "year";
    count: number;
};

type PerformanceQuotesDTO = {
    securityISIN: string;
    securityName: string;
    instrumentType: string;
    exchangeName: string;
    newestDate: Date;
    newestPrice: number;
    baseDate: Date;
    basePrice: number;
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

    async getRSLevyData(): Promise<RSLevyWeeklyData[]> {
        return this.repository
            .createQueryBuilder("q")
            .select([
                "wkcls.isin",
                "wkcls.sname",
                "wkcls.itype",
                "wkcls.ename",
                "wkcls.lastDayOfWeek",
                "q.quote AS lastPriceOfWeek"
            ])
            .leftJoin((qb) => this.subqueryByLastOfWeek(qb.subQuery()), "wkcls", "q.securityId = wkcls.sid")
            .where("q.date = wkcls.lastDayOfWeek")
            .groupBy("wkcls.isin")
            .addGroupBy("wkcls.ename")
            .addGroupBy("wkcls.lastDayOfWeek")
            .getRawMany()
            .then((data) =>
                data.map((x) => ({
                    securityISIN: x.isin,
                    securityName: x.sname,
                    instrumentType: x.itype,
                    exchangeName: x.ename,
                    lastDayOfWeek: new Date(x.lastDayOfWeek),
                    lastPriceOfWeek: Number(x.lastPriceOfWeek)
                }))
            );
    }

    subqueryByLastOfWeek(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "byweek.sid",
                "byweek.isin",
                "byweek.sname",
                "byweek.itype",
                "byweek.ename",
                "MAX(q.date) AS lastDayOfWeek"
            ])
            .from(QuoteData, "q")
            .leftJoin((qb) => this.subqueryLast28Weeks(qb.subQuery()), "byweek", "q.securityId = byweek.sid")
            .where("YEARWEEK(q.date, 3) = byweek.yearnweek")
            .groupBy("byweek.isin")
            .addGroupBy("byweek.ename")
            .addGroupBy("byweek.yearnweek");
    }

    subqueryLast28Weeks(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "ondates.sid",
                "ondates.isin",
                "ondates.sname",
                "ondates.itype",
                "ondates.ename",
                "YEARWEEK(q.date, 3) AS yearnweek"
            ])
            .from(QuoteData, "q")
            .leftJoin((qb) => this.subQueryMinMaxDates(qb.subQuery()), "ondates", "q.securityId = ondates.sid")
            .where("q.date > DATE_SUB(ondates.newestDate, INTERVAL 30 week)") // get a few more weeks than the required 27, just in case
            .groupBy("ondates.isin")
            .addGroupBy("ondates.ename")
            .addGroupBy("YEARWEEK(q.date, 3)");
    }

    /**
     * Returns a table of data that can be used for performance calculations.
     *
     * @returns the data table as an array of PerformanceQuotesDTO rows
     *
     * SQL equivalent:
     * ```sql
     * SELECT bdates.isin, bdates.sname, bdates.itype, bdates.ename, bdates.newestDate, bdates.newestPrice, bdates.baseDate, q.quote AS basePrice
     * FROM quotes AS q
     * LEFT JOIN (
     *     -- calculates the base dates (newest dates minus an interval, in this case 1 year)
     *     SELECT nprices.sid, nprices.isin, nprices.sname, nprices.ename, nprices.newestDate, nprices.newestPrice, MAX(q.date) AS baseDate
     *     FROM quotes AS q
     *     LEFT JOIN (
     *         -- adds the share prices to the newest dates
     *         SELECT ndates.sid, ndates.isin, ndates.sname, ndates.ename, ndates.newestDate, q.quote AS newestPrice
     *         FROM quotes AS q
     *         LEFT JOIN (
     *             -- the newest dates for each security
     *             SELECT s.id AS sid, s.isin AS isin, s.name AS sname, e.name AS ename, MAX(q.date) AS newestDate
     *             FROM quotes AS q
     *             LEFT JOIN securities AS s ON q.securityId = s.id
     *             LEFT JOIN exchanges AS e ON q.exchangeId = e.id
     *             GROUP BY s.isin, e.name
     *         ) AS ndates ON q.securityId = ndates.sid
     *         WHERE q.date = ndates.newestDate
     *     ) AS nprices ON q.securityId = nprices.sid
     *     WHERE q.date <= DATE_SUB(nprices.newestDate, INTERVAL 1 YEAR)
     *     GROUP BY nprices.isin, nprices.ename
     * ) AS bdates ON q.securityId = bdates.sid
     * WHERE q.date = bdates.baseDate;
     * ```
     */
    async getPerformanceQuotes(interval: PerformanceIntervalDTO): Promise<PerformanceQuotesDTO[]> {
        return this.repository
            .createQueryBuilder("q")
            .select([
                "bdates.isin",
                "bdates.sname",
                "bdates.itype",
                "bdates.ename",
                "bdates.newestDate",
                "bdates.newestPrice",
                "bdates.baseDate",
                "q.quote AS basePrice"
            ])
            .leftJoin((qb) => this.subQueryBaseDates(qb.subQuery(), interval), "bdates", "q.securityId = bdates.sid")
            .where("q.date = bdates.baseDate")
            .getRawMany()
            .then((data) =>
                data.map((x) => ({
                    securityISIN: x.isin,
                    securityName: x.sname,
                    instrumentType: x.itype,
                    exchangeName: x.ename,
                    newestDate: new Date(x.newestDate),
                    newestPrice: Number(x.newestPrice),
                    baseDate: new Date(x.baseDate),
                    basePrice: Number(x.basePrice)
                }))
            );
    }

    /**
     * Query builder for the subquery that adds the base date (i.e. the date that the performance calculation is
     * based on) for each security.
     *
     * @param qb the query builder of the calling query
     * @returns the query builder for the subquery
     *
     * SQL equivalent:
     * ```sql
     * SELECT nprices.sid, nprices.isin, nprices.sname, nprices.itype, nprices.ename, nprices.newestDate, nprices.newestPrice, MAX(q.date) AS baseDate
     * FROM quotes AS q
     * LEFT JOIN (
     *     -- adds the share prices to the newest dates
     *     SELECT ndates.sid, ndates.isin, ndates.sname, ndates.ename, ndates.newestDate, q.quote AS newestPrice
     *     FROM quotes AS q
     *     LEFT JOIN (
     *         -- the newest dates for each security
     *         SELECT s.id AS sid, s.isin AS isin, s.name AS sname, e.name AS ename, MAX(q.date) AS newestDate
     *         FROM quotes AS q
     *         LEFT JOIN securities AS s ON q.securityId = s.id
     *         LEFT JOIN exchanges AS e ON q.exchangeId = e.id
     *         GROUP BY s.isin, e.name
     *     ) AS ndates ON q.securityId = ndates.sid
     *     WHERE q.date = ndates.newestDate
     * ) AS nprices ON q.securityId = nprices.sid
     * WHERE q.date <= DATE_SUB(nprices.newestDate, INTERVAL 1 YEAR)
     * GROUP BY nprices.isin, nprices.ename
     * ```
     */
    private subQueryBaseDates(
        qb: SelectQueryBuilder<QuoteData>,
        interval: PerformanceIntervalDTO
    ): SelectQueryBuilder<QuoteData> {
        if (interval.count < 1) {
            throw new RangeError("Interval count must be positive");
        }
        const unit = { day: "DAY", month: "MONTH", year: "YEAR" };
        const intvl = `${interval.count} ${unit[interval.unit]}`;

        return qb
            .select([
                "nprices.sid",
                "nprices.isin",
                "nprices.sname",
                "nprices.itype",
                "nprices.ename",
                "nprices.newestDate",
                "nprices.newestPrice",
                "MAX(q.date) AS baseDate"
            ])
            .from(QuoteData, "q")
            .leftJoin((qb) => this.subQueryNewestSharePrices(qb.subQuery()), "nprices", "q.securityId = nprices.sid")
            .where(`q.date <= DATE_SUB(nprices.newestDate, INTERVAL ${intvl})`)
            .groupBy("nprices.isin")
            .addGroupBy("nprices.ename");
    }

    /**
     * Query builder for the subquery that returns the share prices for the newest date for each of the securities.
     *
     * @param qb the query builder of the calling query
     * @returns the query builder for the subquery
     *
     * SQL equivalent:
     * ```sql
     * SELECT ndates.sid, ndates.isin, ndates.sname, ndates.itype, ndates.ename, ndates.newestDate, q.quote AS newestPrice
     * FROM quotes AS q
     * LEFT JOIN (
     *     -- the newest dates for each security
     *     SELECT s.id AS sid, s.isin AS isin, s.name AS sname, e.name AS ename, MAX(q.date) AS newestDate
     *     FROM quotes AS q
     *     LEFT JOIN securities AS s ON q.securityId = s.id
     *     LEFT JOIN exchanges AS e ON q.exchangeId = e.id
     *     GROUP BY s.isin, e.name
     * ) AS ndates ON q.securityId = ndates.sid
     * WHERE q.date = ndates.newestDate
     * ```
     */
    private subQueryNewestSharePrices(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "ndates.sid",
                "ndates.isin",
                "ndates.sname",
                "ndates.itype",
                "ndates.ename",
                "ndates.newestDate",
                "q.quote AS newestPrice"
            ])
            .from(QuoteData, "q")
            .leftJoin((qb) => this.subQueryMinMaxDates(qb.subQuery()), "ndates", "q.securityId = ndates.sid")
            .where("q.date = ndates.newestDate");
    }

    /**
     * Query builder for the subquery that returns both the oldest and the newest date for each of the securities that a share price is
     * stored with.
     *
     * @param qb the query builder of the calling query
     * @returns the query builder for the subquery
     *
     * SQL equivalent:
     * ```sql
     * SELECT s.id AS sid, s.isin AS isin, s.name AS sname, s.type AS itype, e.name AS ename, MIN(q.date) AS oldestDate, MAX(q.date) AS newestDate
     * FROM quotes AS q
     * LEFT JOIN securities AS s ON q.securityId = s.id
     * LEFT JOIN exchanges AS e ON q.exchangeId = e.id
     * GROUP BY s.isin, e.name
     * ```
     */
    private subQueryMinMaxDates(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select([
                "s.id AS sid",
                "s.isin AS isin",
                "s.name AS sname",
                "s.type AS itype",
                "e.name AS ename",
                "MIN(q.date) AS oldestDate",
                "MAX(q.date) AS newestDate"
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

export { PerformanceIntervalDTO, PerformanceQuotesDTO, QuoteDataService, QuoteCountDTO };
