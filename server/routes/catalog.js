const express = require('express');
const { readJSON } = require('../utils/fileHelpers');
const path = require('path');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const catalog = await readJSON(path.join(__dirname, '..', 'data', 'catalog', 'prices.json'));
    res.json(catalog);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения каталога' });
  }
});

router.post('/calculate', async (req, res) => {
  try {
    const { modelId, size, extra10cm } = req.body;
    const catalog = await readJSON(path.join(__dirname, '..', 'data', 'catalog', 'prices.json'));
    const model = catalog.models[modelId];
    if (!model) {
      return res.status(404).json({ error: 'Модель не найдена' });
    }
    let basePrice = model.prices[size];
    if (!basePrice) {
      return res.status(404).json({ error: 'Размер не найден' });
    }
    let surcharge = 0;
    if (extra10cm) {
      const seriesInfo = catalog.series[model.series];
      surcharge = seriesInfo ? seriesInfo.surcharge10cm : 0;
    }
    res.json({ basePrice, surcharge, totalPrice: basePrice + surcharge, series: model.series });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка расчёта цены' });
  }
});

module.exports = router;
