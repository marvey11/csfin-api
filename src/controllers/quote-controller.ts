import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Body, Get, JsonController, Params, Post, QueryParams, Res } from "routing-controllers";
import { Service } from "typedi";
import { AddQuoteDataRequest } from "../dtos";
import { QuoteData } from "../entities";
import { QuoteDataService } from "../services";

@Service()
@JsonController()
class QuoteDataController {
    constructor(private service: QuoteDataService) {}

    @Get("/quotes/:isin/:exchange")
    async get(
        @Params({ required: true }) params: { isin: string; exchange: number },
        @QueryParams() queryParams: { startDate?: string; endDate?: string },
        @Res() response: Response
    ): Promise<Response> {
        const quotes: QuoteData[] = await this.service.get(
            params.isin,
            params.exchange,
            queryParams.startDate,
            queryParams.endDate
        );

        return response.send(quotes.map((qd: QuoteData) => ({ date: qd.date, quote: qd.quote })));
    }

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
