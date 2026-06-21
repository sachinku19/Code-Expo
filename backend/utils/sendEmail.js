const nodemailer = require("nodemailer");
const axios = require("axios");

const sendEmail = async (options) => {
  // 1. If Resend HTTP API Key is configured, prioritize it to completely bypass SMTP blocks
  if (process.env.RESEND_API_KEY) {
    console.log("Resend API Key detected. Sending email via HTTP API...");
    try {
      const response = await axios.post(
        "https://api.resend.com/emails",
        {
          from: process.env.EMAIL_FROM || '"CodeExpo" <onboarding@resend.dev>',
          to: [options.email],
          subject: options.subject,
          html: options.html,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Email dispatched via Resend HTTP successfully:", response.data);
      return response.data;
    } catch (apiError) {
      console.error("Resend HTTP API error:", apiError.response?.data || apiError.message);
      throw new Error(`Resend HTTP API Failed: ${JSON.stringify(apiError.response?.data || apiError.message)}`);
    }
  }

  // 2. Fallback to Nodemailer SMTP (e.g. Gmail App Password, Brevo SMTP)
  console.log("Using Nodemailer SMTP to send email...");
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: parseInt(process.env.EMAIL_PORT, 10) === 465, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    family: 4, // CRITICAL: Forces IPv4 to bypass ENETUNREACH IPv6 issues on hosting platforms
    connectionTimeout: 10000, // 10s connection timeout
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false, // Prevents SSL/TLS handshake failures with self-signed certs
    },
  });

  // Verify SMTP Transporter Connection on startup
  try {
    await transporter.verify();
    console.log("SMTP Server handshake verified successfully.");
  } catch (verifyError) {
    console.error("SMTP Handshake Verification failed:", verifyError.message);
    throw new Error(`SMTP Verification failed: ${verifyError.message}`);
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"CodeExpo" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent via SMTP successfully. Message ID:", info.messageId);
    return info;
  } catch (sendError) {
    console.error("SMTP sendMail failed:", sendError.message);
    throw sendError;
  }
};

module.exports = sendEmail;
