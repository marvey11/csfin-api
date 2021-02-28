import { IsString } from "class-validator";

class CreateExchangeRequest {
    @IsString()
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

export { CreateExchangeRequest };
