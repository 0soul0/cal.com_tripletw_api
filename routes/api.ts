import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';


const router = express.Router();

const EXPECTED_API_KEY = process.env.API_KEY || '1234';

/**
 * 💡 優化 1: 設定連線池 (Connection Pool)
 * 避免迴圈呼叫時瞬間建立太多資料庫連線導致資料庫崩潰
 */
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const { apiKey } = req.query;
  if (!apiKey || apiKey !== EXPECTED_API_KEY) {
    res.status(401).json({ success: false, error: '未授權' });
    return;
  }
  next();
};

// const checkAuth = (req: Request, res: Response, next: NextFunction) => {
//     if (req.session.isLoggedIn) return next();

//     const targetId = req.params.scheduleId;
//     if (!targetId) {
//         return res.status(400).json({ error: '請求無效：遺漏排程 ID' });
//     }
//     return res.redirect(`/login/${targetId}`);
// };


router.get('/api', (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head><title>Attendee API</title></head>
      <body>
        <h1 style="color: green;">Attendee API is running</h1>
        <p>歡迎使用 API 服務</p>
      </body>
    </html>
  `;
  res.send(htmlContent);
});


// get schedule's data
router.get('/api/threshold/:scheduleId', async (req: Request, res: Response) => {
    const scheduleId = parseInt(req.params.scheduleId);
    const shouldCreate = req.query.create === 'true';
    console.log("shouldCreate",shouldCreate)
        console.log("shouldCreate req.query.create",req.query.create)
    if (isNaN(scheduleId)) return res.status(400).send('ID 格式錯誤');

    try {
        if(shouldCreate){
            const result = await prisma.timeThreshold.upsert({
                where: { schedule: scheduleId },
                update: {}, 
                create: {
                    // userId: req.session.userId!,
                    schedule: scheduleId,
                    data: [
                        { week: 1, time: '17:00',isOpen: true },
                        { week: 2, time: '17:00',isOpen: true  },
                        { week: 3, time: '17:00',isOpen: true  },
                        { week: 4, time: '17:00',isOpen: true  },
                        { week: 5, time: '17:00',isOpen: true  },
                        { week: 6, time: '17:00',isOpen: true  },
                        { week: 7, time: '17:00',isOpen: true  }
                    ]
                }
            });
            res.json(result.data);
        }else{
            const result = await prisma.timeThreshold.findUnique({
              where: { schedule: scheduleId }
            });
            if (!result) {
                return res.json([]);
            }

            res.json(result.data);
        }


    } catch (error) {
        console.error(error);
        res.status(500).send('資料庫處理失敗');
    }
});


// post schedule's data
router.post('/api/threshold/:scheduleId', async (req: Request, res: Response) => {
    const scheduleId = parseInt(req.params.scheduleId);
    const updatedData = req.body; // 前端傳來的 json 陣列

    try {
        await prisma.timeThreshold.update({
            where: { 
              schedule: scheduleId ,          
              userId: req.session.userId},
            data: { data: updatedData }
        });
        res.json({ message: '儲存成功' });
    } catch (error) {
        res.status(500).json({ error: '儲存失敗' });
    }
});


/**
 * 根據 ID 刪除 Attendee
 */
router.delete('/api/attendee/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const numId = Number(id);

  if (isNaN(numId)) {
    res.status(400).json({ error: 'ID 必須是數字' });
    return;
  }

  try {
  const result = await prisma.$transaction(async (tx) => {
    // 1. 查詢該 attendee 並取得其 bookingId
    const attendee = await tx.attendee.findUnique({
      where: { id: numId },
      select: { bookingId: true }
    });

    // 如果找不到 attendee，直接回傳 null 或報錯
    if (!attendee) return null;

    const { bookingId } = attendee;
    console.log('Attendee Booking ID:', bookingId);

    if (bookingId === null || bookingId === undefined) {
        return null; 
    }
    // 2. 查詢該 bookingId 下還有多少筆 attendee
    const attendeeCount = await tx.attendee.count({
      where: { bookingId: bookingId }
    });
    console.log('Attendee Count for Booking ID', attendeeCount);

    // 3. 執行刪除 attendee
    const deleteResult = await tx.attendee.delete({
      where: { id: numId }
    });

    // 4. 如果原本只有一筆，則刪除對應的 Booking
    if (attendeeCount === 1) {
     const deleteBooking =  await tx.booking.delete({
        where: { id: bookingId }
      });
      console.log('Deleted Booking:', deleteBooking);
    }

    return deleteResult;
  });

  if (!result) {
    res.status(404).json({ success: false, message: '找不到資料' });
    return;
  }

  res.status(200).json({
    success: true,
    message: `已刪除 ID: ${id}，且已處理相關訂單`,
  });

  } catch (error: any) {
    console.error('Database Error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

export default router;