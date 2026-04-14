/** 全局配置 */
export default {
  /** 产品信息 */
  productList: [
    {
      name: '民生银行',
      productSku: '21001001000001',
      logo: 'https://storage.jd.com/payment-assets/sdk/bank/CMBC.png'
    },
    {
      name: '浙商银行',
      productSku: '1961543816',
      logo: 'https://storage.jd.com/payment-assets/sdk/bank/CZB.png'
    },
    {
      name: '工商银行',
      productSku: '2005453243',
      logo: 'https://storage.jd.com/payment-assets/sdk/bank/ICBC.png'
    },
    {
      name: '广发银行',
      productSku: '2024345112',
      logo: 'https://storage.jd.com/payment-assets/sdk/bank/CGB.png'
    },
    {
      name: '兴业银行',
      productSku: '2039007297',
      logo: 'https://storage.jd.com/payment-assets/sdk/bank/CIB.png'
    }
  ],
  /** 价格来源 */
  priceSourceList: [
    { name: '伦敦金', uniqueCode: 'WG-XAUUSD', precision: 2 },
    { name: '黄金T+D', uniqueCode: 'SGE-Au(T+D)', precision: 2 },
    { name: '民生积存金', uniqueCode: 'CMBC-JCJ', precision: 2 },
    { name: '浙商积存金', uniqueCode: 'CZB-JCJ', precision: 2 },
    { name: '工商积存金', uniqueCode: 'ICBC-JCJ', precision: 2 },
    { name: '广发积存金', uniqueCode: 'CGB-JCJ', precision: 2 },
    { name: '兴业积存金', uniqueCode: 'CIB-JCJ', precision: 2 },
    { name: '离岸人民币', uniqueCode: 'FX-USDCNH', precision: 4 },
    { name: '美元指数', uniqueCode: 'FX-DXY', precision: 4 }
  ],
  /** 刷新频率 */
  refreshRateList: [
    { name: '暂停', value: 0 },
    { name: '极快 (0.5s)', value: 500 },
    { name: '快 (1s)', value: 1000 },
    { name: '中 (2s)', value: 2000, default: true },
    { name: '慢 (3s)', value: 3000 },
    { name: '极慢 (5s)', value: 5000 },
    { name: '每十秒 (10s)', value: 10000 },
    { name: '每半分 (30s)', value: 30000 },
    { name: '每分钟 (60s)', value: 60000 }
  ],
  /** 主题样式 */
  themeStyleList: [
    { name: '明亮', value: 'light' },
    { name: '灰暗', value: 'dark', default: true }
  ],
  /** 来源详情 */
  sourceDetailUrl: 'https://gold-price-pro.pf.jd.com' // https://m.jr.jd.com/finance-gold/msjgold/homepage
}
