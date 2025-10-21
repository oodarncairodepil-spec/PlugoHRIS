import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const createBusinessTripRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMyBusinessTripRequests: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getBusinessTripRequestsForApproval: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const approveBusinessTripRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const rejectBusinessTripRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const cancelBusinessTripRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllBusinessTripRequestsForDashboard: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=businessTripController.d.ts.map