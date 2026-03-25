import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

admin.initializeApp();
const db = admin.firestore();

// 이메일을 발송하는 이메일 계정 정보
// 실제 사용을 위해서는 SMTP 환경 변수(비밀번호) 등록이 필요합니다.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "your-email@gmail.com",
    pass: process.env.SMTP_PASS || "your-app-password",
  },
});

// AI 서비스 초기화 (프론트엔드와 동일한 설정 적용)
const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});

export const dailyReminderEmail = onSchedule({
  schedule: "every day 07:00",
  timeZone: "Asia/Seoul",
}, async (event) => {
  const today = new Date();
  // 한국 시간(UTC+9) 기준으로 맞추기
  const offset = today.getTimezoneOffset() + (9 * 60); 
  today.setMinutes(today.getMinutes() + offset);
  
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');

  // 1. 모든 유저 정보 가져오기
  const usersSnapshot = await db.collection("users").get();
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    // Firebase Auth에서 유저 이메일 정보 가져오기
    const userSnapshot = await admin.auth().getUser(userId).catch(() => null);
    if (!userSnapshot || !userSnapshot.email) continue;
    
    // 2. 해당 유저의 할 일(todos) 목록 중에서 알림이 켜져있고 완료되지 않은 것들만 가져오기
    const todosRef = db.collection(`users/${userId}/todos`);
    const todosSnapshot = await todosRef
      .where("isReminderActive", "==", true)
      .where("completed", "==", false)
      .get();
      
    const todaysTodos: any[] = [];
    for (const todoDoc of todosSnapshot.docs) {
      const todo = todoDoc.data();
      const targetDate = todo.reminderDate || todo.date;
      
      // 3. 알림 설정된 날짜가 오늘 날짜와 일치하는 경우 수집
      if (targetDate === todayStr) {
        todaysTodos.push(todo);
      }
    }

    // 4. 오늘 할 일이 하나라도 있다면 AI 브리핑 생성 및 메일 발송
    if (todaysTodos.length > 0) {
      // AI 브리핑 생성 (다정하고 격려하는 어조)
      let aiBriefing = "오늘 하루도 화이팅하세요!";
      try {
        const response = await ai.generate({
          prompt: `
            오늘의 할 일 목록을 분석해서 다정하고 에너지가 넘치는 말투로 오늘 하루를 브리핑해줘.
            수신자: 승우님 (기분 좋은 아침 인사를 포함해줘)
            날짜: ${todayStr}
            할 일 개수: ${todaysTodos.length}개
            목록:
            ${todaysTodos.map((t, idx) => `${idx + 1}. ${t.title} (${t.importance === 'High' ? '매우 중요' : '보통'})`).join('\n')}
            
            요청 사항:
            - 너무 길지 않게 3~4문장 정도로 요약해줘.
            - 중요도가 높은 일정이 있다면 특별히 신경 써달라고 언급해줘.
            - 마지막은 따뜻한 응원의 한마디로 마무리해줘.
          `
        });
        aiBriefing = response.text;
      } catch (err) {
        console.error("AI 브리핑 생성 중 오류:", err);
      }

      // 첫 번째 할 일을 기본 데이터로 추출 (메타데이터용)
        
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
      <div style="background-color: #f5f3ff; border: 1px dashed #c7d2fe; padding: 20px; border-radius: 16px; margin-bottom: 30px; color: #4338ca; font-size: 15px; font-style: italic; line-height: 1.7;">
        " ${aiBriefing.replace(/\n/g, '<br>')} "
      </div>

      <p style="font-size: 16px; margin-bottom: 30px;">
        설레는 오늘 하루도 힘차게 시작하셨나요? 잊어버리시기 전에 오늘 꼭 확인하셔야 할 중요한 일정이 있어서 조용히 알려드리려고 왔어요. 🤫
      </p>
      
      <!-- Task List -->
      ${todaysTodos.map(todo => {
        const badgeColors: Record<string, string> = {
          "High": "background-color: #fee2e2; color: #b91c1c;",
          "Medium": "background-color: #fef08a; color: #a16207;",
          "Low": "background-color: #dcfce3; color: #15803d;"
        };
        const importanceStyle = badgeColors[todo.importance] || badgeColors["Medium"];
        
        return `
        <div style="background-color: #f1f5f9; border-left: 5px solid #6366f1; padding: 24px; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); word-break: keep-all;">
          <h2 style="font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 10px 0;">✨ ${todo.title}</h2>
          ${todo.description ? `<p style="color: #475569; margin: 0 0 15px 0; font-size: 15px; white-space: pre-wrap;">${todo.description}</p>` : ''}
          <div>
            <span style="font-size: 13px; font-weight: 600; color: #64748b; margin-right: 8px;">우선순위:</span>
            <span style="display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 800; ${importanceStyle}">
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

        const mailOptions = {
          from: '"AI 캘린더 요정" <noreply@todocalendar.app>',
          to: "seungwoo.kim@kuraray.com", // 요청하신 수신자 고정
          subject: `✨ [브리핑] 승우님, 오늘 하루를 미리 확인해보세요!`,
          html: htmlTemplate,
        };
        
        try {
          // SMTP 비밀번호가 올바르게 설정되면 진짜 이메일이 발송됩니다!
          await transporter.sendMail(mailOptions);
          console.log(`알림 전송 성공: ${userSnapshot.email} (총 ${todaysTodos.length}개의 할 일)`);
        } catch (error) {
          console.error("이메일 전송 실패:", error);
        }

        // 5. 반복 주기나 알림 비활성화 처리 (여기는 루프를 돌며 처리)
        for (const todoDoc of todosSnapshot.docs) {
          const todo = todoDoc.data();
          const targetDate = todo.reminderDate || todo.date;
          if (targetDate !== todayStr) continue;

          if (todo.repeatIntervalDays) {
            const nextDate = new Date(today);
            nextDate.setDate(nextDate.getDate() + todo.repeatIntervalDays);
            const nextDateStr = [
              nextDate.getFullYear(),
              String(nextDate.getMonth() + 1).padStart(2, '0'),
              String(nextDate.getDate()).padStart(2, '0')
            ].join('-');
            
            if (todo.reminderEndDate && nextDateStr > todo.reminderEndDate) {
              await todoDoc.ref.update({ isReminderActive: false });
            } else {
              await todoDoc.ref.update({ reminderDate: nextDateStr });
            }
          } else {
            await todoDoc.ref.update({ isReminderActive: false });
        }
      }
    }
  }
});
