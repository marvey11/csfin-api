import { Service } from "typedi";
import { AllLatestDatesDTO, QuoteDataService } from "./quote-service";

type EvaluatePerformanceDTO = {
    securityISIN: string;
    securityName: string;
    exchangeName: string;
    latestDate: Date;
    performance: number;
};

@Service()
class EvaluationService {
    constructor(private quoteService: QuoteDataService) {}

    async evaluatePerformance(days = 365): Promise<EvaluatePerformanceDTO[]> {
        const result = [];
        const latestDates: AllLatestDatesDTO[] = await this.quoteService.getAllLatestDates();
        for (const item of latestDates) {
            const last_quote: number = await this.quoteService.getQuoteForDate(
                item.securityISIN,
                item.exchangeID,
                item.latestDate
            );
            const date1y: Date = await this.quoteService.getLatestDateOnOrBefore(
                item.securityISIN,
                item.exchangeID,
                new Date(item.latestDate.getTime() - days * 24 * 3600 * 1000)
            );

            if (date1y.getTime() === 0) {
                // there is no date stored for the reference date or before
                continue;
            }
            const quote1y: number = await this.quoteService.getQuoteForDate(item.securityISIN, item.exchangeID, date1y);

            result.push({
                securityISIN: item.securityISIN,
                securityName: item.securityName,
                exchangeName: item.exchangeName,
                latestDate: item.latestDate,
                performance: last_quote / quote1y - 1
            });
        }
        return result;
    }
}

export { EvaluatePerformanceDTO, EvaluationService };
