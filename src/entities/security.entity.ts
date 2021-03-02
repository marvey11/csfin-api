import { IsString, Length } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

import { QuoteData } from "./quote.entity";

enum SecurityType {
    STOCK = "stock",
    EQUITY_FUND = "fund",
    ETF = "etf",
    CERTIFICATE = "certificate"
}

@Entity({ name: "securities" })
@Unique(["isin"])
class Security {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
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
