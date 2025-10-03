import { Request, Response } from 'express';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}
export declare const getSurveys: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const createSurvey: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const updateSurvey: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getSurveyDetails: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const assignSurvey: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getUserAssignments: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getSurveyAssignments: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const deleteAssignment: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const saveResponses: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getResponses: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const deleteSurvey: (req: AuthenticatedRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const submitSurveyResponse: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getSurveyResponses: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=performanceAppraisalController.d.ts.map