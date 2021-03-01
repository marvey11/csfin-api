import { Response } from "express";
import { Body, JsonController, Post, Res } from "routing-controllers";
import { Service } from "typedi";
import { AddQuoteDataRequest } from "../dtos";
import { QuoteDataService } from "../services";

@Service()
@JsonController()
class QuoteDataController {
    constructor(private service: QuoteDataService) {}

    @Post("/quotes")
    async add(@Body({required: true}) data: AddQuoteDataRequest, @Res() response: Response): Promise<Response> {
        console.log(data);
        await this.service.add(data);
        return response.send(data);
    }
}

export {QuoteDataController};
