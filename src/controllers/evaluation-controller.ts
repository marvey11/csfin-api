import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Get, JsonController, QueryParam, Res } from "routing-controllers";
import { Service } from "typedi";

import { EvaluationService } from "../services/evaluation-service";
import { PerformanceIntervalDTO } from "../services/quote-service";

@Service()
@JsonController()
class EvaluationController {
    constructor(private service: EvaluationService) {}

    @Get("/evaluate/performance")
    async evaluatePerformance(
        @QueryParam("interval") interval: PerformanceIntervalDTO = { count: 1, unit: "year" },
        @Res() response: Response
    ): Promise<Response> {
        const data = await this.service.evaluatePerformance(interval);
        return response.status(StatusCodes.OK).send(data);
    }
}

export { EvaluationController };
