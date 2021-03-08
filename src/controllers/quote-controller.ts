import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Body, Get, JsonController, Param, Post, QueryParam, Res } from "routing-controllers";
import { Service } from "typedi";

import { AddQuoteDataRequest, LatestSharePriceDateDTO } from "../dtos";
import { QuoteData } from "../entities";
import { QuoteDataService } from "../services";
import { QuoteCountDTO } from "../services/quote-service";

@Service()
@JsonController()
class QuoteDataController {
    constructor(private service: QuoteDataService) {}

    @Get("/quotes/:isin/:exchange")
    async get(
        @Res() response: Response,
        @Param("isin") isin: string,
        @Param("exchange") exchangeID: number,
        @QueryParam("start-date") startDate?: string,
        @QueryParam("end-date") endDate?: string
    ): Promise<Response> {
        const quotes: QuoteData[] = await this.service.get(isin, exchangeID, startDate, endDate);
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

    @Get("/quotes/latest-dates")
    async getLatestDates(@Res() response: Response): Promise<Response> {
        const data: LatestSharePriceDateDTO[] = await this.service.getLatestDates();
        return response.status(StatusCodes.OK).send(data);
    }

    @Get("/quotes/count")
    async getCount(@QueryParam("with-sum") withSum: boolean, @Res() response: Response): Promise<Response> {
        const data: QuoteCountDTO[] = await this.service.getQuoteCount();

        if (withSum) {
            const sum = data.map((item) => item.count).reduce((a, b) => a + b, 0);
            data.push({ isin: "ALL", exchange: "ALL", count: sum });
        }

        return response.status(StatusCodes.OK).send(data);
    }
}

export { QuoteDataController };
