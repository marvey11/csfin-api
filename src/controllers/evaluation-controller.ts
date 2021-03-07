import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Get, JsonController, Res } from "routing-controllers";
import { Service } from "typedi";

import { EvaluationService } from "../services/evaluation-service";

@Service()
@JsonController()
class EvaluationController {
    constructor(private service: EvaluationService) {}

    @Get("/evaluate/performance")
    async evaluatePerformance(@Res() response: Response): Promise<Response> {
        const data = await this.service.evaluatePerformance();
        return response.status(StatusCodes.OK).send(data);
    }
}

export { EvaluationController };
