import { Resend } from 'resend';
import { RESEND_API_KEY } from '../secrets';
if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined');
}

export const resend = new Resend(RESEND_API_KEY);
