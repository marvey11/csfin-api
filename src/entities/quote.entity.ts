import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { SecuritiesExchange } from "./exchange.entity";
import { Security } from "./security.entity";

@Entity({ name: "quotes" })
class QuoteData {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    date!: Date;

    @Column()
    quote!: number;

    @ManyToOne(() => Security, (security) => security.quotes)
    security!: Security;

    @ManyToOne(() => SecuritiesExchange, (exchange) => exchange.quotes)
    exchange!: SecuritiesExchange;
}

export { QuoteData };
