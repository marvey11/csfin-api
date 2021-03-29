import { Service } from "typedi";
import { RSLevyResponseData, RSLevyWeeklyData } from "../dtos";
import { PerformanceIntervalDTO, PerformanceQuotesDTO, QuoteDataService } from "./quote-service";

type EvaluatePerformanceDTO = {
    securityISIN: string;
    securityName: string;
    exchangeName: string;
    newestDate: Date;
    performance: number;
};

@Service()
class EvaluationService {
    constructor(private quoteService: QuoteDataService) {}

    async evaluatePerformance(interval: PerformanceIntervalDTO): Promise<PerformanceQuotesDTO[]> {
        return this.quoteService.getPerformanceQuotes(interval);
    }

    async getRSLevyData(): Promise<RSLevyResponseData[]> {
        type TempElemType = {
            isin: string;
            exchange: string;
            items: RSLevyWeeklyData[];
        };

        const queryResult: RSLevyWeeklyData[] = await this.quoteService.getRSLevyData();

        // partition the array of query results into an array where all elements with the same ISIN
        // and exchange are grouped together
        const tempArray = queryResult.reduce((obj: TempElemType[], item: RSLevyWeeklyData) => {
            // find out whether there is already an element with the same ISIN and exchange
            const elem = obj.filter(
                (e: TempElemType) => e.isin === item.securityISIN && e.exchange == item.exchangeName
            );

            if (elem.length === 0) {
                // if not, create a new element
                obj.push({ isin: item.securityISIN, exchange: item.exchangeName, items: [item] });
            } else {
                // ... otherwise add the item data to the existing element
                elem[0].items.push(item);
            }
            return obj;
        }, []);

        // the result array
        const levyResult: RSLevyResponseData[] = [];

        // tempArray is now partitioned; there is exactly one entry for each ISIN/exchange combination
        for (const elem of tempArray) {
            // skip this entry if there's not enough data for the RSL evaluation
            if (elem.items.length < 27) {
                continue;
            }

            // sort all elements by date in descending order; use only the newest 27 elements
            const sortedItems = elem.items
                .sort((a, b) => b.lastDayOfWeek.valueOf() - a.lastDayOfWeek.valueOf())
                .slice(0, 27);

            const newest = sortedItems[0];

            // create a new result entry
            levyResult.push({
                securityISIN: newest.securityISIN,
                securityName: newest.securityName,
                instrumentType: newest.instrumentType,
                exchangeName: newest.exchangeName,
                newestWeeklyClose: newest.lastDayOfWeek,
                rslValue:
                    (newest.lastPriceOfWeek * sortedItems.length) /
                    sortedItems.reduce((sum, elem) => sum + elem.lastPriceOfWeek, 0.0)
            });
        }

        return levyResult;
    }
}

export { EvaluatePerformanceDTO, EvaluationService };
