import config from "config";
import { Service } from "typedi";
import { Connection, getConnection, SelectQueryBuilder } from "typeorm";
import { QuoteData } from "../entities";
import { QuoteDataService } from "./quote-service";

type PerformanceInterval = {
    unit: "day" | "month" | "year";
    count: number;
};

type PerformanceResponseData = {
    securityISIN: string;
    securityName: string;
    instrumentType: string;
    exchangeName: string;
    newestDate: Date;
    performance: number;
};

@Service()
class PerformanceEvaluationService {
    private connection: Connection;

    constructor(private service: QuoteDataService) {
        this.connection = getConnection(config.get("ormconfig.connection"));
    }

    async getPerformanceData(interval: PerformanceInterval): Promise<PerformanceResponseData[]> {
        return this.connection
            .createQueryBuilder()
            .select([
                "s.isin AS isin",
                "s.name AS sname",
                "s.type AS itype",
                "e.name AS ename",
                "newest_date",
                "(newest_price / q.quote - 1) AS performance"
            ])
            .from(QuoteData, "q")
            .leftJoin("q.security", "s")
            .leftJoin("q.exchange", "e")
            .leftJoin(
                (qb) => this.getBaseDates(qb.subQuery(), interval),
                "bdates",
                "q.securityId = sid AND q.exchangeId = eid"
            )
            .where("q.date = base_date")
            .getRawMany()
            .then((rawData) =>
                rawData.map((x) => ({
                    securityISIN: x.isin,
                    securityName: x.sname,
                    instrumentType: x.itype,
                    exchangeName: x.ename,
                    newestDate: new Date(x.newest_date),
                    performance: Number(x.performance)
                }))
            );
    }

    private getBaseDates(
        qb: SelectQueryBuilder<QuoteData>,
        interval: PerformanceInterval
    ): SelectQueryBuilder<QuoteData> {
        if (interval.count < 1) {
            throw new RangeError("Interval count must be positive");
        }
        const unit = { day: "DAY", month: "MONTH", year: "YEAR" };
        const intvl = `${interval.count} ${unit[interval.unit]}`;

        return qb
            .select(["sid", "eid", "newest_date", "newest_price", "MAX(q.date) AS base_date"])
            .from(QuoteData, "q")
            .leftJoin(
                (qb) => this.getNewestPrices(qb.subQuery()),
                "nprices",
                "q.securityId = sid AND q.exchangeId = eid"
            )
            .where(`q.date <= DATE_SUB(newest_date, INTERVAL ${intvl})`)
            .groupBy("sid")
            .addGroupBy("eid");
    }

    private getNewestPrices(qb: SelectQueryBuilder<QuoteData>): SelectQueryBuilder<QuoteData> {
        return qb
            .select(["sid", "eid", "max_date AS newest_date", "q.quote AS newest_price"])
            .from(QuoteData, "q")
            .leftJoin(
                (qb) => this.service.getMinMaxDates(qb.subQuery()),
                "mmdates",
                "q.securityId = sid AND q.exchangeId = eid"
            )
            .where("q.date = max_date");
    }
}

export { PerformanceEvaluationService, PerformanceInterval, PerformanceResponseData };
