import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const generateRandomPassword: () => string;
export declare const hashPassword: (password: string) => Promise<string>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const changePassword: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=authController.d.ts.map