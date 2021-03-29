type RSLevyResponseData = {
    securityISIN: string;
    securityName: string;
    instrumentType: string;
    exchangeName: string;
    newestWeeklyClose: Date;
    rslValue: number;
};

type RSLevyWeeklyData = {
    securityISIN: string;
    securityName: string;
    instrumentType: string;
    exchangeName: string;
    lastDayOfWeek: Date;
    lastPriceOfWeek: number;
};

export { RSLevyResponseData, RSLevyWeeklyData };
