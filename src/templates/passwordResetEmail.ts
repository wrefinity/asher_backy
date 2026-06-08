export default function generatePasswordResetEmailTemplate(
  code: string,
  resetUrl: string
): string {
  const safeResetUrl = resetUrl.replace(/"/g, '&quot;');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your Asher password</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                color: #333;
                margin: 0;
                padding: 0;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #fff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }
            .content {
                padding: 20px;
                text-align: center;
            }
            .content p {
                font-size: 16px;
                line-height: 1.5;
            }
            .reset-code {
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 4px;
                color: #B80238;
                margin: 24px 0;
            }
            .cta-button {
                display: inline-block;
                margin: 20px 0;
                padding: 14px 28px;
                background-color: #B80238;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
            }
            .steps {
                text-align: left;
                margin: 24px auto;
                max-width: 420px;
                font-size: 15px;
                line-height: 1.6;
            }
            .footer {
                text-align: center;
                padding: 10px 0;
                border-top: 1px solid #eee;
                margin-top: 20px;
                font-size: 14px;
                color: #777;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Asher password reset</h1>
            </div>
            <div class="content">
                <p>You requested to reset your Asher landlord account password.</p>
                <p>Click the button below to enter your code and choose a new password:</p>
                <a href="${safeResetUrl}" class="cta-button">Continue password reset</a>
                <p>Or use this 6-digit code on the reset page:</p>
                <div class="reset-code">${code}</div>
                <ol class="steps">
                    <li>Open the link above (or go to Sign in and choose Forgot password).</li>
                    <li>Enter the 6-digit code from this email.</li>
                    <li>Choose a new password and sign in.</li>
                </ol>
                <p>This code expires in 24 hours. If you did not request a password reset, you can ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Asher. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
