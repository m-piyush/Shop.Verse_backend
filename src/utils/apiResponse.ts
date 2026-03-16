import { Response } from 'express';

interface ResponseOptions {
  statusCode?: number;
  message?: string;
  data?: any;
  meta?: any;
}

export const sendResponse = (res: Response, { statusCode = 200, message = 'Success', data = null, meta = null }: ResponseOptions) => {
  const response: any = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};
