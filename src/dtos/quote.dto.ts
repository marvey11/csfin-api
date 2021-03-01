import { IsArray, IsNumber, IsObject, Length } from "class-validator";

class AddQuoteDataRequest {
    @Length(12, 12, { message: "ISIN must be exactly 12 characters long" })
    isin: string;

    @IsNumber()
    exchangeID: number;

    @IsArray()
    @IsObject({ each: true })
    quoteData: Array<{ date: Date; value: number }>;

    constructor(isin: string, exchangeID: number, data: Array<{ date: Date; value: number }>) {
        this.isin = isin;
        this.exchangeID = exchangeID;
        this.quoteData = data;
    }
}

export { AddQuoteDataRequest };
