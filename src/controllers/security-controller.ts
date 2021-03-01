import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Body, Get, JsonController, Param, Post, Res } from "routing-controllers";
import { Service } from "typedi";

import { CreateSecurityRequest } from "../dtos";
import { Security } from "../entities";
import { SecuritiesService } from "../services";

@Service() // <-- apparently necessary with typedi > 0.8.0
@JsonController()
class SecurityController {
    constructor(private service: SecuritiesService) {}

    @Get("/securities")
    async getAll(@Res() response: Response): Promise<Response> {
        const securities: Security[] = await this.service.getAll();
        return response.status(StatusCodes.OK).send(securities);
    }

    @Get("/security/:isin")
    async getOne(@Param("isin") isin: string, @Res() response: Response): Promise<Response> {
        try {
            const s: Security = await this.service.getOne({ isin: isin });
            return response.status(StatusCodes.OK).send(s);
        } catch (error) {
            return response.status(StatusCodes.BAD_REQUEST).send({ message: error.message });
        }
    }

    @Post("/security")
    async addOrUpdate(
        @Body({ required: true }) data: CreateSecurityRequest,
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

export { SecurityController };
