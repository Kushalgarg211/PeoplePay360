require('dotenv').config();
const nodemailer = require('nodemailer');

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

console.log('GMAIL_USER:', user);
console.log('GMAIL_APP_PASSWORD:', pass ? `${pass.substring(0, 4)}...` : '(empty)');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass },
});

console.log('\nVerifying SMTP connection...');
transporter.verify((err, success) => {
  if (err) {
    console.error('❌ SMTP Error:', err.message);
    console.error('Full error:', JSON.stringify(err, null, 2));
  } else {
    console.log('✅ SMTP connection OK! Sending test email...');
    transporter.sendMail({
      from:    `"PeoplePay360 Test" <${user}>`,
      to:      user,
      subject: 'PeoplePay360 Email Test',
      html:    '<p>If you see this, nodemailer Gmail is working! ✅</p>',
    }, (sendErr, info) => {
      if (sendErr) {
        console.error('❌ Send failed:', sendErr.message);
      } else {
        console.log('✅ Email sent! Message ID:', info.messageId);
      }
      process.exit(0);
    });
  }
});
