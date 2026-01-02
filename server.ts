import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import api, { prisma } from './routes/api';
import client from './routes/client'; 

declare module 'express-session' {
  interface SessionData {
    isLoggedIn: boolean; 
    userId: number
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'attendee-api-key',
    resave: false,
    saveUninitialized: true
}));



const PORT = process.env.PORT || 3000;

app.use('/', client); 
app.use('/', api); 


// 啟動伺服器
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close();
});


//----------------------------------中間層-----------------------------------------

// // 驗證 API Key 中間件
// const authenticate = (req: Request, res: Response, next: NextFunction): void => {
//   const { apiKey } = req.query;
//   if (!apiKey || apiKey !== EXPECTED_API_KEY) {
//     res.status(401).json({ success: false, error: '未授權' });
//     return;
//   }
//   next();
// };


//-------------------------------------client-----------------------------------------------




// // 2. 登入頁：顯示登入表單
// app.get('/login/:scheduleId', (req, res) => {
//   const targetId = req.params.scheduleId || ""; // 取得要跳轉的 ID

//   if (req.session.isLoggedIn) {
//     // 如果已登入，直接去該 ID 的編輯頁，若無 ID 則去預設頁（例如 1）
//     return res.redirect(`/edit/${targetId}`);
//   }

//   // 將檔案送出，但我們要讓前端知道等下要跳轉去哪
//   res.sendFile(path.join(__dirname, 'page', 'login.html'));
// });


// const checkAuth = (req: Request, res: Response, next: NextFunction) => {
//     if (req.session.isLoggedIn) return next();

//     const targetId = req.params.scheduleId;
//     if (!targetId) {
//         return res.status(400).json({ error: '請求無效：遺漏排程 ID' });
//     }
//     return res.redirect(`/login/${targetId}`);
// };


//-------------------------------------api-----------------------------------------------

// 登入
// app.post('/login', async (req, res) => {
//     const { email, password,scheduleId } = req.body;
//     try {
//     // 1. 尋找使用者，同時抓出密碼 hash
//     const user = await prisma.user.findFirst({
//       where: {
//         OR: [
//           { email: email },
//           { username: email } // 支援 email 或 username 登入
//         ]
//       },
//       include: {
//         password: true // 關聯 UserPassword 模型
//       }
//     });

//     // 2. 檢查使用者是否存在且有設定密碼
//     if (!user || !user.password) {
//       return res.status(401).send('帳號或密碼錯誤');
//     }

//     // 3. 比對密碼 (將使用者輸入的明文與資料庫的 hash 比對)
//     const isPasswordValid = await bcrypt.compare(password, user.password.hash);

//     if (isPasswordValid) {
//       // 4. 登入成功，寫入 Session
//       req.session.isLoggedIn = true;
//       req.session.userId = user.id; // 儲存使用者 ID 供後續查詢使用
//       res.status(200).json({ 
//           success: true,
//           scheduleId: scheduleId 
//       });
//       // res.redirect(`/edit/${scheduleId}`);
//     } else {
//       res.status(402).send('帳號或密碼錯誤');
//     }
//   } catch (error) {
//     console.error('Login Error:', error);
//     res.status(500).send('伺服器錯誤');
//   }
// });



// // 根據傳入的 schedule 查詢 data
// app.get('/api/threshold/:scheduleId', checkAuth, async (req: Request, res: Response) => {
//     const scheduleId = parseInt(req.params.scheduleId);
    
//     if (isNaN(scheduleId)) return res.status(400).send('ID 格式錯誤');

//     try {
//         // 使用 upsert：如果不存在 (where) 則建立 (create)，存在則不更新 (update: {})
//         const result = await prisma.timeThreshold.upsert({
//             where: { schedule: scheduleId },
//             update: {}, // 如果已存在，不執行任何動作
//             create: {
//                 userId: req.session.userId!,
//                 schedule: scheduleId,
//                 data: [
//                     { week: 1, time: '17:00' },
//                     { week: 2, time: '17:00' },
//                     { week: 3, time: '17:00' },
//                     { week: 4, time: '17:00' },
//                     { week: 5, time: '17:00' },
//                     { week: 6, time: '17:00' },
//                     { week: 7, time: '17:00' }
//                 ]
//             }
//         });

//         res.json(result.data);
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('資料庫處理失敗');
//     }
// });
