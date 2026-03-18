const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // This helps prevent "Self-signed certificate" errors in cloud environments
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"School System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log('Email sent:', info.messageId);
    return info; // Return info so the controller knows it worked
  } catch (err) {
    console.error('Failed to send email:', err);
    throw err; // Throw the error so your API returns a 500 if the email fails
  }
}

module.exports = sendEmail;