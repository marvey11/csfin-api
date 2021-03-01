import { IsString } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "exchanges" })
class SecuritiesExchange {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({unique: true})
    @IsString()
    name!: string;
}

export { SecuritiesExchange };
