import { IsArray, IsNumber, IsObject, Length } from "class-validator";

class AddQuoteDataRequest {
    @Length(12, 12, { message: "ISIN must be exactly 12 characters long" })
    isin: string;

    @IsNumber()
    exchangeID: number;

    @IsArray()
    @IsObject({ each: true })
    quotes: { date: Date; quote: number }[];

    constructor(isin: string, exchangeID: number, data: { date: Date; quote: number }[]) {
        this.isin = isin;
        this.exchangeID = exchangeID;
        this.quotes = data;
    }
}

export { AddQuoteDataRequest };
