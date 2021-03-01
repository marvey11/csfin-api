import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Body, Get, JsonController, Param, Post, Put, Res } from "routing-controllers";
import { Service } from "typedi";

import { CreateSecurityRequest } from "../dtos";
import { Security } from "../entities";
import { SecuritiesService } from "../services";

@Service() // apparently necessary with typedi > 0.8.0
@JsonController()
class SecurityController {
    constructor(private service: SecuritiesService) {}

    @Get("/securities")
    async getAll(@Res() response: Response): Promise<Response> {
        const securities: Security[] = await this.service.getAll();
        return response.status(StatusCodes.OK).send(securities);
    }

    @Get("/security/:id")
    async getOne(@Param("id") id: number, @Res() response: Response): Promise<Response> {
        try {
            const s: Security = await this.service.getOne(id);
            return response.status(StatusCodes.OK).send(s);
        } catch (error) {
            return response.status(StatusCodes.BAD_REQUEST).send({ message: error.message });
        }
    }
    @Post("/security")
    async addOne(@Body({ required: true }) data: CreateSecurityRequest, @Res() response: Response): Promise<Response> {
        try {
            const s: Security = await this.service.addOne(data);
            return response.status(StatusCodes.OK).send(s);
        } catch (error) {
            const msg: string = error.message || "";

            if (msg.startsWith("ER_DUP_ENTRY")) {
                return response
                    .status(StatusCodes.CONFLICT)
                    .send({ message: `An item with ISIN ${data.isin} is already in the database.` });
            }

            return response.status(StatusCodes.BAD_REQUEST).send({ message: msg });
        }
    }

    @Put("/security/:id")
    async update(
        @Param("id") id: number,
        @Body({ required: true }) data: CreateSecurityRequest,
        @Res() response: Response
    ): Promise<Response> {
        try {
            const s = await this.service.update(id, data);
            if (s) {
                return response.status(StatusCodes.CREATED).send({ message: "Created" });
            }
        } catch (error) {
            return response.status(StatusCodes.BAD_REQUEST).send({ message: error.message });
        }

        return response.status(StatusCodes.CONFLICT).send({ message: "Security could not be updated" });
    }
}

export { SecurityController };
