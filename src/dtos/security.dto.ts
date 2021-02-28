import { IsEnum, Length, MinLength } from "class-validator";

import { SecurityType } from "../entities";

class CreateSecurityRequest {
    @Length(12, 12, { message: "ISIN must be exactly 12 characters long" })
    isin: string;

    @MinLength(4, { message: "NSIN must be at least 4 characters long" })
    nsin: string;

    @MinLength(3, { message: "Security Name must be at least 3 characters long" })
    name: string;

    @IsEnum(SecurityType)
    type: SecurityType;

    constructor(isin: string, nsin: string, name: string, type: SecurityType) {
        this.isin = isin;
        this.nsin = nsin;
        this.name = name;
        this.type = type;
    }
}

export { CreateSecurityRequest };
