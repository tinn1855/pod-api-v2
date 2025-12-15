import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // Configure nodemailer with free SMTP (Gmail, Outlook, Mailtrap, etc.)
    const smtpHost = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpFrom = this.configService.get<string>('SMTP_FROM') || smtpUser;

    this.logger.log(`Initializing SMTP connection to ${smtpHost}:${smtpPort}`);

    // Only include auth if both credentials are provided
    const transportConfig: any = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      // For Mailtrap and other services that don't use TLS
      requireTLS: smtpPort === 587,
    };

    if (smtpUser && smtpPassword) {
      transportConfig.auth = {
        user: smtpUser,
        pass: smtpPassword,
      };
      this.logger.log('SMTP authentication configured');
    } else {
      this.logger.warn('SMTP credentials not configured. Email sending will fail. Please set SMTP_USER and SMTP_PASSWORD in your .env file.');
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection verification failed:', error);
        this.logger.error('Please check your SMTP configuration in .env file');
      } else {
        this.logger.log(`✅ SMTP server is ready to send emails (${smtpHost}:${smtpPort})`);
      }
    });
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    // Check if SMTP is configured
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    
    if (!smtpUser || !smtpPassword) {
      this.logger.error('SMTP credentials not configured. Cannot send email.');
      throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in .env file');
    }

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;

    const fromEmail = this.configService.get<string>('SMTP_FROM') || smtpUser;
    
    this.logger.log(`Attempting to send verification email to ${to} from ${fromEmail}`);

    const mailOptions = {
      from: fromEmail,
      to,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h1 style="color: #007bff; margin-top: 0;">Email Verification</h1>
            <p>Hello ${name},</p>
            <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #e9ecef; padding: 10px; border-radius: 3px; word-break: break-all;">
              ${verificationUrl}
            </p>
            <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name},
        
        Thank you for registering! Please verify your email address by clicking the link below:
        
        ${verificationUrl}
        
        This link will expire in 24 hours. If you didn't create an account, please ignore this email.
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Verification email sent successfully to ${to}`);
      this.logger.debug(`Email message ID: ${info.messageId}`);
      return;
    } catch (error: any) {
      this.logger.error(`❌ Failed to send verification email to ${to}`);
      this.logger.error(`Error: ${error.message}`);
      this.logger.error(`Error code: ${error.code || 'N/A'}`);
      this.logger.error(`Error response: ${error.response || 'N/A'}`);
      
      // Throw a more descriptive error
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }
}
