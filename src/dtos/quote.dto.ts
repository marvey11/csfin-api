import { IsArray, IsObject, IsString, Length } from "class-validator";

class AddQuoteDataRequest {
    @Length(12, 12, { message: "ISIN must be exactly 12 characters long" })
    isin: string;

    @IsString()
    exchange: string;

    @IsArray()
    @IsObject({ each: true })
    quotes: { date: Date; quote: number }[];

    constructor(isin: string, exchange: string, data: { date: Date; quote: number }[]) {
        this.isin = isin;
        this.exchange = exchange;
        this.quotes = data;
    }
}

type NewestDatesOptions = {
    "date-only"?: boolean;
};

type NewestSharePriceDateDTO = {
    isin: string;
    exchange: string;
    newestDate: string;
};

export { AddQuoteDataRequest, NewestDatesOptions, NewestSharePriceDateDTO };
