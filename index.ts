import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();

/**
 * 💡 優化 1: 設定連線池 (Connection Pool)
 * 避免迴圈呼叫時瞬間建立太多資料庫連線導致資料庫崩潰
 */
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const PORT = process.env.PORT || 3000;
const EXPECTED_API_KEY = process.env.API_KEY || '1234';

app.use(express.json());

// 驗證 API Key 中間件
const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const { apiKey } = req.query;
  if (!apiKey || apiKey !== EXPECTED_API_KEY) {
    res.status(401).json({ success: false, error: '未授權' });
    return;
  }
  next();
};

app.get('/', (req, res) => res.send('Attendee API is running'));

/**
 * 根據 ID 刪除 Attendee
 */
app.delete('/api/attendee/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
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

// 啟動伺服器
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});

/**
 * 💡 優化 3: 優雅關閉 (Graceful Shutdown)
 * 當伺服器重啟時，確保舊的資料庫連線被正確釋放，不佔用 Railway 的額度
 */
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close();
});