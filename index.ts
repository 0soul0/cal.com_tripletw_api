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
    /**
     * 💡 優化 2: 使用 deleteMany (在迴圈呼叫中更安全)
     * .delete() 如果資料不存在會噴 Error
     * .deleteMany() 如果資料不存在只會回傳 count: 0，不會導致程式報錯
     * 這對於「不確定資料是否還在」的快速迴圈刪除更友善
     */
    const result = await prisma.attendee.deleteMany({
      where: { id: numId },
    });

    if (result.count === 0) {
      res.status(404).json({ success: false, message: '找不到資料或已被刪除' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `已刪除 ID: ${id}`,
      count: result.count
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