import * as nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function main() {
  console.log("Sending test email using:", process.env.SMTP_USER);
  const info = await transporter.sendMail({
    from: '"할 일 캘린더 (강제 테스트)" <noreply@todocalendar.app>',
    to: "seungwoo.kim@kuraray.com",
    subject: `[SMTP 테스트] 강제 발송 메일입니다`,
    text: `봇이 정상적으로 작동하는지 확인하는 강제 발송 테스트입니다!`,
  });
  console.log("Email sent successfully: ", info.messageId);
}

main().catch(console.error);
