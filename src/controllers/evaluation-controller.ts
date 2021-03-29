import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Get, JsonController, QueryParam, Res } from "routing-controllers";
import { Service } from "typedi";
import {
    PerformanceEvaluationService,
    PerformanceInterval,
    PerformanceResponseData,
    RSLevyResponseData,
    RSLevyService
} from "../services";

@Service()
@JsonController()
class EvaluationController {
    constructor(private perfService: PerformanceEvaluationService, private rslService: RSLevyService) {}

    @Get("/evaluate/performance-data")
    async evaluatePerformance(
        @QueryParam("interval") interval: PerformanceInterval = { count: 1, unit: "year" },
        @Res() response: Response
    ): Promise<Response> {
        const data: PerformanceResponseData[] = await this.perfService.getPerformanceData(interval);
        return response.status(StatusCodes.OK).send(data);
    }

    @Get("/evaluate/rsl-data")
    async getRSLevyData(@Res() response: Response): Promise<Response> {
        const data: RSLevyResponseData[] = await this.rslService.getRSLevyData();
        return response.status(StatusCodes.OK).send(data);
    }
}

export { EvaluationController };
