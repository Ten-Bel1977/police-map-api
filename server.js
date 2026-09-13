const express = require('express');
const cron = require('node-cron');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ⚠️ ЗАМЕНИ НА СВОЙ TELEGRAM ID (узнать: @userinfobot)
const OWNER_ID = '6637894231';

const COLORS = {
    'GuardiaCivil':     '#03ad00',
    'PatrolNacional':   '#fae502',
    'PostNacional':     '#031cfc',
    'PatrolLocal':      '#ff5e00',
    'PostLocal':        '#0088ff',
    'MotoAlert!!!':     '#fc0303',
    'PostMotoAlert!!!': '#990202'
};

const SHORT_LIVED = ['PatrolLocal', 'PatrolNacional', 'MotoAlert!!!', 'GuardiaCivil'];
const LONG_LIVED  = ['PostLocal', 'PostNacional', 'PostMotoAlert!!!'];

let markers = [];

cron.schedule('*/5 * * * *', () => {
    const now = new Date();
    const before = markers.length;
    markers = markers.filter(m => new Date(m.expiresAt) > now);
    if (before !== markers.length) console.log(`Удалено просроченных: ${before - markers.length}`);
});

app.get('/api/markers', (req, res) => {
    const now = new Date();
    res.json(markers.filter(m => new Date(m.expiresAt) > now));
});

app.post('/api/markers', (req, res) => {
    const { userId, userName, lat, lng, type, comment, durationMinutes, color } = req.body;
    console.log('POST /api/markers:', { userId, type, color });

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'Неверные координаты' });
    }

    const createdAt = new Date();
    let expiresAt;
    let finalColor;

    if (type === 'MainAlert') {
        if (String(userId) !== String(OWNER_ID)) {
            return res.status(403).json({ error: 'Только владелец может ставить MainAlert' });
        }
        const mins = parseInt(durationMinutes, 10);
        if (!mins || mins <= 0 || mins > 60 * 24 * 30) {
            return res.status(400).json({ error: 'Время от 1 минуты до 30 дней' });
        }
        if (!/^#[0-9a-fA-F]{6}$/.test(color || '')) {
            return res.status(400).json({ error: 'Неверный цвет (нужен hex)' });
        }
        expiresAt = new Date(createdAt.getTime() + mins * 60 * 1000);
        finalColor = color;
    } else if (SHORT_LIVED.includes(type)) {
        expiresAt = new Date(createdAt.getTime() + 90 * 60 * 1000);
        finalColor = COLORS[type];
    } else if (LONG_LIVED.includes(type)) {
        expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
        finalColor = COLORS[type];
    } else {
        return res.status(400).json({ error: 'Неизвестный тип метки' });
    }

    const newMarker = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        userId, userName, lat, lng, type,
        comment: comment || '',
        color: finalColor,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString()
    };

    markers.push(newMarker);
    console.log('✅ Добавлена:', newMarker.type, 'цвет:', newMarker.color);
    res.status(201).json(newMarker);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log(`👑 Владелец ID: ${OWNER_ID}`);
});