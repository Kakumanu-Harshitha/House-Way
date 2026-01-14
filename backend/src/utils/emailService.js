const nodemailer = require('nodemailer');

/**
 * Email Service for OTP and Notifications
 * Configure via environment variables:
 * - SMTP_HOST: SMTP server (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP port (e.g., 587)
 * - SMTP_USER: Email address
 * - SMTP_PASS: Password or App Password
 * - SMTP_FROM: From email (default: SMTP_USER)
 */

// Create transporter with environment config
const createTransporter = () => {
    const host = process.env.SMTP_HOST || 'pteja821@gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        console.warn('⚠️ [Email] SMTP credentials not configured. Email sending will fail.');
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });
};

/**
 * Send OTP email for password reset
 */
const sendPasswordOTP = async (email, otp, userName = '') => {
    const transporter = createTransporter();

    if (!transporter) {
        throw new Error('Email service not configured. Please set SMTP environment variables.');
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
        from: `"Houseway" <${fromEmail}>`,
        to: email,
        subject: 'Password Reset OTP - Houseway',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #D4AF37 0%, #DAA520 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset</h1>
          </div>
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
              Hi${userName ? ` ${userName}` : ''},
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              You requested to reset your password. Use the OTP below to proceed:
            </p>
            <div style="background: #f8f8f8; border: 2px dashed #D4AF37; border-radius: 10px; padding: 20px; margin: 25px 0; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D4AF37;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 12px;">
              This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              If you didn't request this, please ignore this email or contact support.
            </p>
          </div>
          <div style="background: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} Houseway. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
        text: `Your password reset OTP is: ${otp}. Valid for 10 minutes.`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ [Email] OTP sent to:', email, 'MessageId:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ [Email] Failed to send OTP:', error.message);
        throw error;
    }
};

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
    sendPasswordOTP,
    generateOTP,
};
