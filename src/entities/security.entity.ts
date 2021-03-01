import { IsString, Length } from "class-validator";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";

import { QuoteData } from "./quote.entity";

enum SecurityType {
    STOCK = "stock",
    EQUITY_FUND = "fund",
    ETF = "etf",
    CERTIFICATE = "certificate"
}

@Entity({ name: "securities" })
class Security {
    @PrimaryColumn()
    @IsString()
    @Length(12)
    isin!: string;

    @Column()
    @IsString()
    nsin!: string;

    @Column()
    @IsString()
    name!: string;

    @Column({
        type: "enum",
        enum: SecurityType
    })
    type!: SecurityType;

    @OneToMany(() => QuoteData, (quote) => quote.security)
    quotes!: QuoteData[];
}

export { Security, SecurityType };
