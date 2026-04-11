/**
 *  根据唯一码获取简易报价
 *  @param  {Array[String]} uniqueCodes 唯一码
 */
export const getSimpleQuoteUseUniqueCodes = async (uniqueCodes) => {
  let params = JSON.stringify({ ticket: 'gold-price-h5', uniqueCodes })
  let res = await fetch(`https://ms.jr.jd.com/gw2/generic/jdtwt/h5/m/getSimpleQuoteUseUniqueCodes?reqData=${encodeURIComponent(params)}`)
  return (await res.json()).resultData || {}
}

/**
 *  获取首个相关产品信息
 *  @param  {String}  productSku  产品SKU
 */
export const getFirstRelatedProductInfo = async (productSku) => {
  let params = JSON.stringify({ invokeSource: 5, circleId: '13245', productId: productSku })
  let res = await fetch(`https://ms.jr.jd.com/gw2/generic/CreatorSer/newh5/m/getFirstRelatedProductInfo?reqData=${encodeURIComponent(params)}`)
  return (await res.json()).resultData || {}
}

/**
 *  获取黄金实时价格
 *  @param  {String}  uniqueCode  唯一码
 */
export const getGoldPrice = async (uniqueCode) => {
  let res = await fetch(`https://api.jdjygold.com/gw2/generic/produTools/h5/m/getGoldPrice?goldCode=${encodeURIComponent(uniqueCode)}`)
  return (await res.json()).resultData || {}
}

/**
 *  获取最新标准积存金价格
 *  @param  {String}  productSku  产品SKU
 */
export const getStdLatestPrice = async (productSku) => {
  let res = await fetch(`https://api.jdjygold.com/gw2/generic/jrm/h5/m/stdLatestPrice?productSku=${encodeURIComponent(productSku)}`)
  return (await res.json()).resultData || {}
}

/**
 *  获取民生银行最新积存金价格
 *  @see  https://m.jr.jd.com/finance-gold/msjgold/homepage
 */
export const getMinShengLatestPrice = async () => {
  let res = await fetch('https://ms.jr.jd.com/gw/generic/hj/h5/m/latestPrice')
  return (await res.json()).resultData || {}
}
