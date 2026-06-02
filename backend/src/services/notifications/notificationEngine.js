const nodemailer = require('nodemailer');
const prisma = require('../../config/database');
const logger = require('../../middleware/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Email send failed: ${err.message}`);
  }
}

async function sendSMS(to, message) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    logger.warn('Twilio not configured, skipping SMS');
    return;
  }
  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to, body: message });
    logger.info(`SMS sent to ${to}`);
  } catch (err) {
    logger.error(`SMS send failed: ${err.message}`);
  }
}

async function processAlert(alert) {
  const configs = await prisma.notificationConfig.findMany({
    where: { enabled: true, events: { path: [], array_contains: alert.type } },
  });

  const severities = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
  const alertLevel = severities[alert.severity] || 0;

  for (const config of configs) {
    const minLevel = severities[config.severity_min] || 0;
    if (alertLevel < minLevel) continue;

    if (config.channel === 'email') {
      await sendEmail(config.destination, `[${alert.severity}] ${alert.type}`, `<p>${alert.message}</p><p>Time: ${alert.created_at}</p>`);
    } else if (config.channel === 'sms') {
      await sendSMS(config.destination, `[${alert.severity}] ${alert.message}`);
    }
  }
}

module.exports = { sendEmail, sendSMS, processAlert };
