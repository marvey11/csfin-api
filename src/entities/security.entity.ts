import { IsString, Length } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

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
}

export { Security, SecurityType };
