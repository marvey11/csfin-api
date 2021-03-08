import { Service } from "typedi";

import { PerformanceIntervalDTO, PerformanceQuotesDTO, QuoteDataService } from "./quote-service";

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

    async evaluatePerformance(interval: PerformanceIntervalDTO): Promise<PerformanceQuotesDTO[]> {
        return this.quoteService.getPerformanceQuotes(interval);
    }
}

export { EvaluatePerformanceDTO, EvaluationService };
