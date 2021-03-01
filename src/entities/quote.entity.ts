import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

import { SecuritiesExchange } from "./exchange.entity";
import { Security } from "./security.entity";

@Entity({ name: "quotes" })
@Unique(["date", "security", "exchange"])
class QuoteData {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "date" })
    date!: Date;

    @Column({ type: "decimal", precision: 12, scale: 4 })
    quote!: number;

    @ManyToOne(() => Security, (security) => security.quotes)
    security!: Security;

    @ManyToOne(() => SecuritiesExchange, (exchange) => exchange.quotes)
    exchange!: SecuritiesExchange;
}

export { QuoteData };
