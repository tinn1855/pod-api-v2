import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // Configure nodemailer with free SMTP (Gmail, Outlook, Mailtrap, etc.)
    const smtpHost =
      this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    this.logger.log(`Initializing SMTP connection to ${smtpHost}:${smtpPort}`);

    // Only include auth if both credentials are provided
    const transportConfig: nodemailer.TransportOptions = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      requireTLS: smtpPort === 587,
      ...(smtpUser && smtpPassword
        ? {
            auth: {
              user: smtpUser,
              pass: smtpPassword,
            },
          }
        : {}),
    } as nodemailer.TransportOptions;

    if (smtpUser && smtpPassword) {
      this.logger.log('SMTP authentication configured');
    } else {
      this.logger.warn(
        'SMTP credentials not configured. Email sending will fail. Please set SMTP_USER and SMTP_PASSWORD in your .env file.',
      );
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection verification failed:', error);
        this.logger.error('Please check your SMTP configuration in .env file');
      } else {
        this.logger.log(
          `✅ SMTP server is ready to send emails (${smtpHost}:${smtpPort})`,
        );
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
      throw new Error(
        'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in .env file',
      );
    }

    // Use FRONTEND_URL if available, otherwise fall back to APP_URL
    // The verification URL should point to frontend page that will make POST request to backend API
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_URL') ||
      'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const fromEmail = this.configService.get<string>('SMTP_FROM') || smtpUser;

    this.logger.log(
      `Attempting to send verification email to ${to} from ${fromEmail}`,
    );

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Verification email sent successfully to ${to}`);
      if (info && typeof info === 'object' && 'messageId' in info) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const messageId = String(info.messageId);
        this.logger.debug(`Email message ID: ${messageId}`);
      }
      return;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorCode =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code !== null &&
        error.code !== undefined
          ? typeof error.code === 'string' || typeof error.code === 'number'
            ? String(error.code)
            : 'N/A'
          : 'N/A';
      const errorResponse =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response !== null &&
        error.response !== undefined
          ? typeof error.response === 'string' ||
            typeof error.response === 'number'
            ? String(error.response)
            : 'N/A'
          : 'N/A';

      this.logger.error(`❌ Failed to send verification email to ${to}`);
      this.logger.error(`Error: ${errorMessage}`);
      this.logger.error(`Error code: ${errorCode}`);
      this.logger.error(`Error response: ${errorResponse}`);

      // Throw a more descriptive error
      throw new Error(`Failed to send verification email: ${errorMessage}`);
    }
  }

  async sendVerificationEmailWithPassword(
    to: string,
    name: string,
    token: string,
    temporaryPassword: string,
  ): Promise<void> {
    // Check if SMTP is configured
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    if (!smtpUser || !smtpPassword) {
      this.logger.error('SMTP credentials not configured. Cannot send email.');
      throw new Error(
        'SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in .env file',
      );
    }

    // Use FRONTEND_URL if available, otherwise fall back to APP_URL
    // The verification URL should point to frontend page that will make POST request to backend API
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_URL') ||
      'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const fromEmail = this.configService.get<string>('SMTP_FROM') || smtpUser;

    this.logger.log(
      `Attempting to send verification email with password to ${to} from ${fromEmail}`,
    );

    const mailOptions = {
      from: fromEmail,
      to,
      subject: 'Welcome! Your Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h1 style="color: #007bff; margin-top: 0;">Welcome to Our System!</h1>
            <p>Hello ${name},</p>
            <p>Your account has been created successfully. Please find your temporary credentials below:</p>
            
            <div style="background-color: #fff; border: 2px solid #007bff; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #007bff;">Your Temporary Password:</p>
              <p style="margin: 10px 0 0 0; font-size: 18px; font-family: monospace; letter-spacing: 2px; color: #333;">
                ${temporaryPassword}
              </p>
            </div>
            
            <p><strong>Important Security Steps:</strong></p>
            <ol>
              <li>Click the button below to verify your email address</li>
              <li>After verification, log in using your email and the temporary password above</li>
              <li>You will be required to change your password on first login</li>
            </ol>
            
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
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ Security Notice:</p>
              <p style="margin: 5px 0 0 0; color: #856404;">
                This is a temporary password. Please change it immediately after your first login for security reasons.
              </p>
            </div>
            
            <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
              This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name},
        
        Your account has been created successfully. Please find your temporary credentials below:
        
        Your Temporary Password: ${temporaryPassword}
        
        Important Security Steps:
        1. Verify your email address by clicking the link below
        2. After verification, log in using your email and the temporary password above
        3. You will be required to change your password on first login
        
        Verification Link: ${verificationUrl}
        
        ⚠️ Security Notice:
        This is a temporary password. Please change it immediately after your first login for security reasons.
        
        This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
      `,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `✅ Verification email with password sent successfully to ${to}`,
      );
      if (info && typeof info === 'object' && 'messageId' in info) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const messageId = String(info.messageId);
        this.logger.debug(`Email message ID: ${messageId}`);
      }
      return;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorCode =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code !== null &&
        error.code !== undefined
          ? typeof error.code === 'string' || typeof error.code === 'number'
            ? String(error.code)
            : 'N/A'
          : 'N/A';
      const errorResponse =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response !== null &&
        error.response !== undefined
          ? typeof error.response === 'string' ||
            typeof error.response === 'number'
            ? String(error.response)
            : 'N/A'
          : 'N/A';

      this.logger.error(
        `❌ Failed to send verification email with password to ${to}`,
      );
      this.logger.error(`Error: ${errorMessage}`);
      this.logger.error(`Error code: ${errorCode}`);
      this.logger.error(`Error response: ${errorResponse}`);

      // Throw a more descriptive error
      throw new Error(
        `Failed to send verification email with password: ${errorMessage}`,
      );
    }
  }
}
