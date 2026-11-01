/** External providers implement these boundaries after their accounts and contracts are configured. */
export interface GiftProvider { request(input:{redemptionId:string;points:number;recipientId:string}):Promise<{providerId:string}> }
export interface AnalyticsProvider { track(event:{name:string;actorId?:string;properties:Record<string,string|number>}):Promise<void> }
export interface CustomerSupportProvider { open():void }
