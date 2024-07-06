export default function generateEmailTemplate(token: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
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
            .header h1 {
                margin: 0;
            }
            .content {
                padding: 20px;
                text-align: center;
            }
            .content p {
                font-size: 16px;
                line-height: 1.5;
            }
            .confirmation-code {
                font-size: 24px;
                font-weight: bold;
                color: #007BFF;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                padding: 10px 0;
                border-top: 1px solid #eee;
                margin-top: 20px;
            }
            .footer p {
                font-size: 14px;
                color: #777;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Asher Email Verification</h1>
            </div>
            <div class="content">
                <p>Thank you for registering with us. Please use the confirmation code below to verify your email address.</p>
                <div class="confirmation-code">${token}</div>
                <p>If you did not request this email, please ignore it.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 asher. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}