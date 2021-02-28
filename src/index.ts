import "reflect-metadata";

import bodyParser from "body-parser";
import config from "config";
import cors from "cors";
import express from "express";

import { useExpressServer } from "routing-controllers";
import { createConnection } from "typeorm";

const connectionName = config.get("ormconfig.connection") as string;
createConnection(connectionName)
    .then(() => {
        const app = express();
        app.use(cors());
        app.use(bodyParser.json());

        useExpressServer(app, {
            routePrefix: "/api",
            classTransformer: true,
            validation: true,
            controllers: []
        });

        const port = config.get("express.port") as number;
        app.listen(port, "0.0.0.0", () => {
            console.log(`Server listening on port ${port}`);
        });
    })
    .catch((error) => {
        console.log(error);
    });
