import { Service } from "typedi";

import { PerformanceQuotesDTO, QuoteDataService } from "./quote-service";

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

    async evaluatePerformance(): Promise<PerformanceQuotesDTO[]> {
        return this.quoteService.getPerformanceQuotes();
    }
}

export { EvaluatePerformanceDTO, EvaluationService };
