import * as nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from the same directory
dotenv.config({ path: path.join(__dirname, ".env") });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const todaysTodos = [
  {
    title: "프로젝트 진행 현황 보고서 작성",
    description: "주요 마일스톤 확인 및 다음 주 일정 조율",
    importance: "High"
  },
  {
    title: "클라이언트 미팅 준비 (Sample)",
    description: "제안서 초안 리뷰 및 피드백 반영",
    importance: "Medium"
  },
  {
    title: "팀 주간 회의 참석",
    description: "오후 2시 회의실 A",
    importance: "Low"
  }
];

const aiBriefing = "좋은 아침입니다, 승우님! 오늘은 리마인더가 총 3개나 잡혀있네요. 특히 '프로젝트 보고서 작성'은 오늘 가장 중요한 업무이니 오전에 먼저 집중해서 끝내시는 걸 추천드려요. 오후 미팅과 회의도 차질 없이 진행될 수 있게 제가 이따가 한 번 더 챙겨드릴게요. 오늘도 승우님의 멋진 성취를 응원합니다! 화이팅! 🚀";

const badgeColors: Record<string, string> = {
  "High": "background-color: #fee2e2; color: #b91c1c;",
  "Medium": "background-color: #fef08a; color: #a16207;",
  "Low": "background-color: #dcfce3; color: #15803d;"
};

const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); word-break: keep-all;">
    
    <!-- Header -->
    <div style="background-color: #e0e7ff; padding: 40px 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">📅</div>
      <h1 style="margin: 0; color: #4338ca; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">좋은 아침입니다, 승우님!</h1>
    </div>
    
    <!-- Body -->
    <div style="padding: 40px 30px; text-align: left; color: #334155; line-height: 1.6;">
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 24px; color: #1e293b;">
        AI 비서의 오늘의 리마인드 브리핑 💌
      </div>
      
      <!-- AI Briefing Box -->
      <div style="background-color: #f5f3ff; border: 1px dashed #c7d2fe; padding: 20px; border-radius: 16px; margin-bottom: 30px; color: #4338ca; font-size: 15px; font-style: italic; line-height: 1.7; word-break: keep-all;">
        " ${aiBriefing.replace(/\n/g, '<br>')} "
      </div>

      <p style="font-size: 16px; margin-bottom: 30px;">
        설레는 오늘 하루도 힘차게 시작하셨나요? 잊어버리시기 전에 오늘 꼭 확인하셔야 할 중요한 일정이 있어서 조용히 알려드리려고 왔어요. 🤫
      </p>
      
      <!-- Task List -->
      ${todaysTodos.map(todo => {
        const itemImportanceStyle = badgeColors[todo.importance] || badgeColors["Medium"];
        return `
        <div style="background-color: #f1f5f9; border-left: 5px solid #6366f1; padding: 24px; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); word-break: keep-all;">
          <h2 style="font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 10px 0;">✨ ${todo.title}</h2>
          ${todo.description ? `<p style="color: #475569; margin: 0 0 15px 0; font-size: 15px; white-space: pre-wrap;">${todo.description}</p>` : ''}
          <div>
            <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-right: 8px;">우선순위:</span>
            <span style="display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 800; ${itemImportanceStyle}">
              ${todo.importance === "High" ? "🚨 높은 중요도" : todo.importance === "Medium" ? "⭐️ 중간 중요도" : "🌱 낮은 중요도"}
            </span>
          </div>
        </div>
        `;
      }).join('')}
      
      <p style="font-size: 16px; margin-top: 30px; margin-bottom: 10px;">
        이 일정들을 멋지게 끝내셨다면, 아래 캘린더로 가셔서 통쾌하게 <span style="white-space: nowrap;">'완료' 체크</span>를 눌러주세요! 
      </p>
      <p style="font-size: 14px; color: #64748b; margin-top: 0;">
        (완료 버튼을 누르시면 이제 이 알람은 영원히 안녕입니다 👋)
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 45px; margin-bottom: 20px;">
        <a href="https://weekday-todo--studio-7490725313-b0a24.us-central1.hosted.app" 
           style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 99px; font-weight: 700; font-size: 16px; box-shadow: 0 6px 15px rgba(99, 102, 241, 0.4);">
          🚀 나만의 캘린더 앱으로 이동하기
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 25px; color: #94a3b8; font-size: 13px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
      나만의 똑똑한 캘린더 요정 비서 • Monthly To-do Calendar<br><br>
      이 메일은 승우님께서 캘린더에 직접 설정해두신 <span style="white-space: nowrap;">'이메일 알람'</span> 규칙에 의해 <span style="white-space: nowrap;">자동 발송되었습니다.</span>
    </div>
  </div>
</body>
</html>
`;

async function main() {
  console.log("Sending formatted reminder email to seungwoo.kim@kuraray.com");
  const info = await transporter.sendMail({
    from: '"AI 캘린더 요정" <noreply@todocalendar.app>',
    to: "seungwoo.kim@kuraray.com",
    subject: `✨ [브리핑] 승우님, 오늘 하루를 미리 확인해보세요!`,
    html: htmlTemplate,
  });
  console.log("Formatted email sent successfully: ", info.messageId);
}

main().catch(console.error);
