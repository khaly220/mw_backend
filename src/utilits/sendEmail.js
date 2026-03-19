const nodemailer = require('nodemailer');

async function sendEmail(to, subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"School System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html, // ✅ IMPORTANT (was text before)
    });

    console.log("✅ Email sent:", info.messageId);
    return info;

  } catch (error) {
    console.error("❌ Email error:", error);
    throw error;
  }
}

module.exports = sendEmail;
