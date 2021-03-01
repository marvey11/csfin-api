import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Body, Get, JsonController, Param, Post, Put, Res } from "routing-controllers";
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
    async addOne(@Body({ required: true }) data: CreateSecurityRequest, @Res() response: Response): Promise<Response> {
        const s: Security | undefined = await this.service.addOne(data);

        if (s) {
            return response.status(StatusCodes.CREATED).send(s);
        }

        return response
            .status(StatusCodes.CONFLICT)
            .send({ message: `An item with ISIN ${data.isin} is already in the database.` });
    }

    @Put("/security/:isin")
    async update(
        @Param("isin") isin: string,
        @Body({ required: true }) data: CreateSecurityRequest,
        @Res() response: Response
    ): Promise<Response> {
        try {
            const s = await this.service.update(isin, data);
            if (s) {
                return response.status(StatusCodes.NO_CONTENT).send();
            }
        } catch (error) {
            return response.status(StatusCodes.BAD_REQUEST).send({ message: error.message });
        }

        return response.status(StatusCodes.CONFLICT).send({ message: "Security could not be updated" });
    }
}

export { SecurityController };
