import express from 'express';
const path = require('path');


const router = express.Router();

// 1. 首頁：回傳 page/index.html
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../page', 'index.html'));
});

// 編輯頁面
router.get('/edit', (req, res) => {
    res.sendFile(path.join(__dirname, '../page', 'edit.html'));
});

export default router;