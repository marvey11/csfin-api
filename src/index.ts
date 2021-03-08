import "reflect-metadata";

import config from "config";
import cors from "cors";
import express from "express";

import { useContainer, useExpressServer } from "routing-controllers";
import { Container } from "typedi";
import { createConnection } from "typeorm";

import { EvaluationController, ExchangeController, QuoteDataController, SecurityController } from "./controllers";

const connectionName = config.get("ormconfig.connection") as string;
createConnection(connectionName)
    .then(() => {
        useContainer(Container);

        const app = express();
        app.use(cors());
        app.use(express.json());

        useExpressServer(app, {
            routePrefix: "/api",
            classTransformer: true,
            validation: true,
            controllers: [EvaluationController, ExchangeController, QuoteDataController, SecurityController]
        });

        const port = config.get("express.port") as number;
        app.listen(port, "0.0.0.0", () => {
            console.log(`Server listening on port ${port}`);
        });
    })
    .catch((error) => {
        console.log(error);
    });
