import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Body, Get, JsonController, Params, Post, QueryParam, QueryParams, Res } from "routing-controllers";
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

    @Get("/quotes/count")
    async getCount(@QueryParam("with-sum") withSum: boolean, @Res() response: Response): Promise<Response> {
        const data = await this.service.getQuoteCount();

        if (withSum) {
            const sum = data.map((item) => Number(item.count)).reduce((a, b) => a + b, 0);
            data.push({ isin: "ALL", exchange: "ALL", count: sum });
        }

        return response.status(StatusCodes.OK).send(data);
    }
}

export { QuoteDataController };
