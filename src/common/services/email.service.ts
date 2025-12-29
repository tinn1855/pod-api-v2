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

    // Use APP_URL (backend API URL) for verification endpoint
    // The verification API endpoint is POST /auth/verify-email
    const backendUrl =
      this.configService.get<string>('APP_URL') ||
      'http://localhost:3000';
    const verificationApiUrl = `${backendUrl}/auth/verify-email`;

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
            <p>Thank you for registering! Please verify your email address by calling the API endpoint below:</p>
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">API Endpoint:</p>
              <p style="margin: 0 0 5px 0; font-family: monospace; word-break: break-all; color: #007bff;">
                POST ${verificationApiUrl}
              </p>
              <p style="margin: 10px 0 5px 0; font-weight: bold; color: #333;">Request Body:</p>
              <pre style="margin: 0; background-color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;">{
  "verificationToken": "${token}"
}</pre>
            </div>
            <p style="color: #6c757d; font-size: 14px;">
              <strong>Note:</strong> You can use tools like Postman, curl, or your application to make a POST request to the above endpoint with the verification token.
            </p>
            <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
              This token will expire in 60 minutes. If you didn't create an account, please ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name},
        
        Thank you for registering! Please verify your email address by calling the API endpoint:
        
        POST ${verificationApiUrl}
        
        Request Body:
        {
          "verificationToken": "${token}"
        }
        
        This token will expire in 60 minutes. If you didn't create an account, please ignore this email.
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

    // Use APP_URL (backend API URL) for verification endpoint
    // The verification API endpoint is POST /auth/verify-email
    const backendUrl =
      this.configService.get<string>('APP_URL') ||
      'http://localhost:3000';
    const verificationApiUrl = `${backendUrl}/auth/verify-email`;

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
              <li>Call the API endpoint below to verify your email address</li>
              <li>After verification, log in using your email and the temporary password above</li>
              <li>You will be required to change your password on first login</li>
            </ol>
            
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">API Endpoint:</p>
              <p style="margin: 0 0 5px 0; font-family: monospace; word-break: break-all; color: #007bff;">
                POST ${verificationApiUrl}
              </p>
              <p style="margin: 10px 0 5px 0; font-weight: bold; color: #333;">Request Body:</p>
              <pre style="margin: 0; background-color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;">{
  "verificationToken": "${token}"
}</pre>
            </div>
            <p style="color: #6c757d; font-size: 14px;">
              <strong>Note:</strong> You can use tools like Postman, curl, or your application to make a POST request to the above endpoint with the verification token.
            </p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ Security Notice:</p>
              <p style="margin: 5px 0 0 0; color: #856404;">
                This is a temporary password. Please change it immediately after your first login for security reasons.
              </p>
            </div>
            
            <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
              This token will expire in 60 minutes. If you didn't create an account, please ignore this email.
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
        1. Verify your email address by calling the API endpoint below
        2. After verification, log in using your email and the temporary password above
        3. You will be required to change your password on first login
        
        API Endpoint: POST ${verificationApiUrl}
        
        Request Body:
        {
          "verificationToken": "${token}"
        }
        
        ⚠️ Security Notice:
        This is a temporary password. Please change it immediately after your first login for security reasons.
        
        This token will expire in 60 minutes. If you didn't create an account, please ignore this email.
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
