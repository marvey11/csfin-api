import { IsString } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { QuoteData } from "./quote.entity";

@Entity({ name: "exchanges" })
class SecuritiesExchange {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    @IsString()
    name!: string;

    @OneToMany(() => QuoteData, (quote) => quote.exchange)
    quotes!: QuoteData[];
}

export { SecuritiesExchange };
