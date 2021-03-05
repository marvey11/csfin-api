import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Body, Get, JsonController, Param, Post, Res } from "routing-controllers";
import { Service } from "typedi";

import { CreateExchangeRequest } from "../dtos";
import { SecuritiesExchange } from "../entities";
import { ExchangeService } from "../services";

@Service()
@JsonController()
class ExchangeController {
    constructor(private service: ExchangeService) {}

    @Get("/exchanges")
    async getAll(): Promise<SecuritiesExchange[]> {
        return this.service.getAll();
    }

    @Get("/exchange/:id")
    async getOne(@Param("id") id: number, @Res() response: Response): Promise<Response> {
        try {
            const e: SecuritiesExchange = await this.service.getOne(id);
            return response.status(StatusCodes.OK).send(e);
        } catch (error) {
            return response.status(StatusCodes.BAD_REQUEST).send({ message: error.message });
        }
    }

    @Post("/exchanges")
    async addOrUpdate(
        @Body({ required: true }) data: CreateExchangeRequest | CreateExchangeRequest[],
        @Res() response: Response
    ): Promise<Response> {
        try {
            await this.service.addOrUpdate(data);
            return response.status(StatusCodes.NO_CONTENT).send();
        } catch (error) {
            return response.status(StatusCodes.BAD_REQUEST).send({ message: error.message });
        }
    }
}

export { ExchangeController };
