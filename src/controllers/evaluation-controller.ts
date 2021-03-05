import { JsonController } from "routing-controllers";
import { Service } from "typedi";

import { EvaluationService } from "../services/evaluation-service";

@Service()
@JsonController()
class EvaluationController {
    constructor(private service: EvaluationService) {}
}

export { EvaluationController };
