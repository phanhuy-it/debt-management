import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());

// Đảm bảo thư mục data tồn tại
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Tạo file database.json mặc định nếu chưa có
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify({ loans: [] }, null, 2), 'utf-8');
    }
  }
}

// Khởi tạo khi server start
ensureDataDirectory();

const CREDIT_CARDS_FILE = path.join(DATA_DIR, 'credit-cards.json');

// Đảm bảo file credit-cards.json tồn tại
async function ensureCreditCardsFile() {
  try {
    await fs.access(CREDIT_CARDS_FILE);
  } catch {
    await fs.writeFile(CREDIT_CARDS_FILE, JSON.stringify({ creditCards: [] }, null, 2), 'utf-8');
  }
}

// Khởi tạo khi server start
ensureCreditCardsFile();

const FIXED_EXPENSES_FILE = path.join(DATA_DIR, 'fixed-expenses.json');

// Đảm bảo file fixed-expenses.json tồn tại
async function ensureFixedExpensesFile() {
  try {
    await fs.access(FIXED_EXPENSES_FILE);
  } catch {
    await fs.writeFile(FIXED_EXPENSES_FILE, JSON.stringify({ fixedExpenses: [] }, null, 2), 'utf-8');
  }
}

// Khởi tạo khi server start
ensureFixedExpensesFile();

// GET: Lấy tất cả dữ liệu khoản vay
app.get('/api/loans', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const jsonData = JSON.parse(data);
    res.json(jsonData.loans || []);
  } catch (error) {
    // Nếu file chưa tồn tại, trả về mảng rỗng
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('Lỗi khi đọc dữ liệu:', error);
      res.status(500).json({ error: 'Không thể đọc dữ liệu' });
    }
  }
});

// POST: Lưu toàn bộ dữ liệu khoản vay
app.post('/api/loans', async (req, res) => {
  try {
    const loans = req.body.loans || req.body; // Hỗ trợ cả {loans: [...]} và [...]
    
    if (!Array.isArray(loans)) {
      return res.status(400).json({ error: 'Dữ liệu phải là một mảng' });
    }

    const data = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      loans: loans
    };

    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ 
      success: true, 
      message: 'Đã lưu dữ liệu thành công',
      count: loans.length 
    });
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu:', error);
    res.status(500).json({ error: 'Không thể lưu dữ liệu' });
  }
});

// GET: Export dữ liệu (tải file về)
app.get('/api/export', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const jsonData = JSON.parse(data);
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      loans: jsonData.loans || []
    };

    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="debt-management-backup-${timestamp}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Lỗi khi export dữ liệu:', error);
    res.status(500).json({ error: 'Không thể export dữ liệu' });
  }
});

// GET: Lấy tất cả thẻ tín dụng
app.get('/api/credit-cards', async (req, res) => {
  try {
    const data = await fs.readFile(CREDIT_CARDS_FILE, 'utf-8');
    const jsonData = JSON.parse(data);
    res.json(jsonData.creditCards || []);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('Lỗi khi đọc dữ liệu thẻ tín dụng:', error);
      res.status(500).json({ error: 'Không thể đọc dữ liệu' });
    }
  }
});

// POST: Lưu thẻ tín dụng
app.post('/api/credit-cards', async (req, res) => {
  try {
    const creditCards = req.body.creditCards || req.body;
    
    if (!Array.isArray(creditCards)) {
      return res.status(400).json({ error: 'Dữ liệu phải là một mảng' });
    }

    const data = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      creditCards: creditCards
    };

    await fs.writeFile(CREDIT_CARDS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ 
      success: true, 
      message: 'Đã lưu dữ liệu thành công',
      count: creditCards.length 
    });
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu thẻ tín dụng:', error);
    res.status(500).json({ error: 'Không thể lưu dữ liệu' });
  }
});

// GET: Lấy tất cả chi tiêu cố định
app.get('/api/fixed-expenses', async (req, res) => {
  try {
    const data = await fs.readFile(FIXED_EXPENSES_FILE, 'utf-8');
    const jsonData = JSON.parse(data);
    res.json(jsonData.fixedExpenses || []);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('Lỗi khi đọc dữ liệu chi tiêu cố định:', error);
      res.status(500).json({ error: 'Không thể đọc dữ liệu' });
    }
  }
});

// POST: Lưu chi tiêu cố định
app.post('/api/fixed-expenses', async (req, res) => {
  try {
    const fixedExpenses = req.body.fixedExpenses || req.body;
    
    if (!Array.isArray(fixedExpenses)) {
      return res.status(400).json({ error: 'Dữ liệu phải là một mảng' });
    }

    const data = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      fixedExpenses: fixedExpenses
    };

    await fs.writeFile(FIXED_EXPENSES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ 
      success: true, 
      message: 'Đã lưu dữ liệu thành công',
      count: fixedExpenses.length 
    });
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu chi tiêu cố định:', error);
    res.status(500).json({ error: 'Không thể lưu dữ liệu' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from dist folder (for production)
async function setupStaticFiles() {
  const DIST_DIR = path.join(__dirname, '../dist');
  try {
    await fs.access(DIST_DIR);
    app.use(express.static(DIST_DIR));
    
    // Fallback to index.html for client-side routing
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
      } else {
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });
    console.log('✅ Đã cấu hình serve static files từ dist/');
  } catch (error) {
    console.log('ℹ️  Thư mục dist chưa có, chỉ chạy API server');
  }
}

setupStaticFiles();

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📁 Dữ liệu được lưu tại: ${DATA_DIR}`);
  console.log(`   - Loans: ${DATA_FILE}`);
  console.log(`   - Credit Cards: ${CREDIT_CARDS_FILE}`);
  console.log(`   - Fixed Expenses: ${FIXED_EXPENSES_FILE}`);
});

