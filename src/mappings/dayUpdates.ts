import { PairHourData } from './../types/schema'
/* eslint-disable prefer-const */
import { BigInt, BigDecimal, ethereum, log } from '@graphprotocol/graph-ts'
import { Pair, Bundle, Token, SwaprFactory, SwaprDayData, PairDayData, TokenDayData } from '../types/schema'
import { ONE_BI, ZERO_BD, ZERO_BI } from './helpers'
import { getFactoryAddress } from '../commons/addresses'

export function updateSwaprDayData(event: ethereum.Event): SwaprDayData | null {
  let swapr = SwaprFactory.load(getFactoryAddress())
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let swaprDayData = SwaprDayData.load(dayID.toString())
  if (swaprDayData === null) {
    swaprDayData = new SwaprDayData(dayID.toString())
    swaprDayData.date = dayStartTimestamp
    swaprDayData.dailyVolumeUSD = ZERO_BD
    swaprDayData.dailyVolumeNativeCurrency = ZERO_BD
    swaprDayData.totalVolumeUSD = ZERO_BD
    swaprDayData.totalVolumeNativeCurrency = ZERO_BD
    swaprDayData.dailyVolumeUntracked = ZERO_BD
  }

  if (swapr === null) {
    log.error('swapr not found', [])
    return null
  }

  swaprDayData.totalLiquidityUSD = swapr.totalLiquidityUSD
  swaprDayData.totalLiquidityNativeCurrency = swapr.totalLiquidityNativeCurrency
  swaprDayData.txCount = swapr.txCount
  swaprDayData.save()

  return swaprDayData as SwaprDayData
}

export function updatePairDayData(event: ethereum.Event): PairDayData | null {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = event.address
    .toHexString()
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())
  let pair = Pair.load(event.address.toHexString())
  if (pair === null) {
    log.error('Pair not found for address {}', [event.address.toHex()])
    return null
  }
  let pairDayData = PairDayData.load(dayPairID)
  if (pairDayData === null) {
    pairDayData = new PairDayData(dayPairID)
    pairDayData.date = dayStartTimestamp
    pairDayData.token0 = pair.token0
    pairDayData.token1 = pair.token1
    pairDayData.pairAddress = event.address
    pairDayData.dailyVolumeToken0 = ZERO_BD
    pairDayData.dailyVolumeToken1 = ZERO_BD
    pairDayData.dailyVolumeUSD = ZERO_BD
    pairDayData.dailyTxns = ZERO_BI
  }

  pairDayData.totalSupply = pair.totalSupply
  pairDayData.reserve0 = pair.reserve0
  pairDayData.reserve1 = pair.reserve1
  pairDayData.reserveUSD = pair.reserveUSD
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI)
  pairDayData.save()

  return pairDayData as PairDayData
}

export function updatePairHourData(event: ethereum.Event): PairHourData | null {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPairID = event.address
    .toHexString()
    .concat('-')
    .concat(BigInt.fromI32(hourIndex).toString())
  let pair = Pair.load(event.address.toHexString())
  let pairHourData = PairHourData.load(hourPairID)
  if (pairHourData === null) {
    pairHourData = new PairHourData(hourPairID)
    pairHourData.hourStartUnix = hourStartUnix
    pairHourData.pair = event.address.toHexString()
    pairHourData.hourlyVolumeToken0 = ZERO_BD
    pairHourData.hourlyVolumeToken1 = ZERO_BD
    pairHourData.hourlyVolumeUSD = ZERO_BD
    pairHourData.hourlyTxns = ZERO_BI
  }
  if (pair === null) {
    log.error('Pair not found for address {}', [event.address.toHex()])
    return null
  }
  pairHourData.reserve0 = pair.reserve0
  pairHourData.reserve1 = pair.reserve1
  pairHourData.reserveUSD = pair.reserveUSD
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI)
  pairHourData.save()

  return pairHourData as PairHourData
}

export function updateTokenDayData(token: Token, event: ethereum.Event): TokenDayData | null {
  let bundle = Bundle.load('1')
  if (bundle === null) {
    log.error('Bundle not found', [])
    return null
  }
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())

  let tokenDayData = TokenDayData.load(tokenDayID)

  const derivedNativeCurrency = token.derivedNativeCurrency
  if (derivedNativeCurrency === null) {
    log.error('derivedNativeCurrency not found', [])
    return null
  }
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.priceUSD = derivedNativeCurrency.times(bundle.nativeCurrencyPrice)
    tokenDayData.dailyVolumeToken = ZERO_BD
    tokenDayData.dailyVolumeNativeCurrency = ZERO_BD
    tokenDayData.dailyVolumeUSD = ZERO_BD
    tokenDayData.dailyTxns = ZERO_BI
    tokenDayData.totalLiquidityUSD = ZERO_BD
  }
  tokenDayData.priceUSD = derivedNativeCurrency.times(bundle.nativeCurrencyPrice)
  tokenDayData.totalLiquidityToken = token.totalLiquidity
  tokenDayData.totalLiquidityNativeCurrency = token.totalLiquidity.times(derivedNativeCurrency as BigDecimal)
  tokenDayData.totalLiquidityUSD = tokenDayData.totalLiquidityNativeCurrency.times(bundle.nativeCurrencyPrice)
  tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(ONE_BI)
  tokenDayData.save()

  /**
   * @todo test if this speeds up sync
   */
  // updateStoredTokens(tokenDayData as TokenDayData, dayID)
  // updateStoredPairs(tokenDayData as TokenDayData, dayPairID)

  return tokenDayData as TokenDayData
}
