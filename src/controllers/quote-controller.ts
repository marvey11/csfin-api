import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Body, JsonController, Post, Res } from "routing-controllers";
import { Service } from "typedi";
import { AddQuoteDataRequest } from "../dtos";
import { QuoteDataService } from "../services";

@Service()
@JsonController()
class QuoteDataController {
    constructor(private service: QuoteDataService) {}

    @Post("/quotes")
    async add(@Body({ required: true }) data: AddQuoteDataRequest, @Res() response: Response): Promise<Response> {
        try {
            await this.service.add(data);
            return response.status(StatusCodes.NO_CONTENT).send();
        } catch (error) {
            return response.status(StatusCodes.BAD_REQUEST).send({ message: error.message });
        }
    }
}

export { QuoteDataController };
