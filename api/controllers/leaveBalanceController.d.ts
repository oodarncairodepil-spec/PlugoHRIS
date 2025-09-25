import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getLeaveBalanceData: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const calculateLeaveBalances: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getLeaveBalanceRules: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=leaveBalanceController.d.ts.map