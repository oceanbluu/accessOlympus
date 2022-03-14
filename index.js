"use strict";

class Token {
	constructor(chainId, address, decimals, symbol, name, totalSupply, pairs) {
		this.chainId = chainId;
		this.address = address;
		this.decimals = decimals;
		this.symbol = symbol;	
		this.name = name;
    this.totalSupply = totalSupply;
    this.pairToken = pairs;
	}
}

class LiveMarket {
  constructor (marketID, markets, terms, pro) {
    this.ID = marketID;
    this.markets = markets;
    this.terms = terms;
    this.pro = pro;
  }
}

class Note {
  constructor (noteID, payout, matured, tokenAddress, pro) {
    this.ID = noteID;
    this.payout = payout;
    this.matured = matured;
    this.tokenAddress = tokenAddress;
    this.pro = pro;
  }
}

class Balance {
  constructor (quantity, tokenAddress, symbol) {
    this.quantity = quantity;
    this.tokenAddress = tokenAddress;
    this.symbol = symbol
  }
}

class Epoch {
  constructor(length, number, end, distribute) {
    this["length"] = length;
    this.number = number;
    this.end = end;
    this.distribute = distribute;
  }
}

/**
 * Storage for converted function names' SHA hex representation (reduce API calls)
 */
class Methodmap {
  constructor(function_name, method) {
//    this.address = address;
    this.function_name = function_name;
    this.method = method;
  }
}

/**
 * Data repository finessed for mirroring to UI table
 */
class Position {
  constructor(custody, tk, locked, maturity, available) {
    let ohms = (tk == '') ? 0 
    : tk.isNative ? tk.price * BigInt(locked + available) / BigInt(Math.pow(10, tk.decimals))
    : BigInt(1e9) * BigInt(locked + available) / tk.price;
    this.asset      = tk == '' ? '' : tk.symbol;
    this.status     = tk == '' ? '' : tk.symbol == 'gOHM' || tk.symbol == 'sOHM' ? 'Staking' : isTokenLp(tk.address) ? 'Mining' : 'Idle';
    this.custody    = custody;
    this.lockup     = maturity;
    this.locked     = locked == '' ? '' : utilsFormatUnits(locked, tk.decimals, 5, true);
    this.available  = available == '' ? '' : utilsFormatUnits(Number(available), tk.decimals, 5, true);
    this.Ω  = utilsFormatUnits(ohms, 9, 2, true);
    this.$  = Math.round(utilsFormatUnits(ohms, 9, 2, true) / GLOBAL.price.ohmusd);
  }
}

/**
 * Data repository finessed for mirroring to UI table
 */
class Market {
  constructor(baseTokenSymbol, quoteTokenSymbol, type, vestingPeriod, marketValue, quoteTokenPrice, epochLength, epochYield, max, capacity, conclusion) {
    let secondsPerYear = 31557600; // 365.25 days
    let marketPair = baseTokenSymbol + "/" + quoteTokenSymbol;
    this.market  = marketPair;
    this.lockup   = utilsTsPeriodToTime(type == "Fixed-term" ? vestingPeriod : vestingPeriod - Date.now()/1000);
    this.ask    = (100*marketValue).toFixed(2);
    this.ytm      = (100*((1/marketValue)*Math.pow(1+epochYield,vestingPeriod/epochLength)-1)).toFixed(2) + "%";
    this.apr      = marketValue > 1 || marketPair == 'OHM/gOHM'? "" : (100*epochYield*secondsPerYear/(marketValue*epochLength)).toFixed(0) + "%";
    this.apy      = marketValue > 1 ? "" : (100*Math.pow((1/marketValue)*(1+(Math.pow(1+epochYield,vestingPeriod/epochLength)-1)),secondsPerYear/vestingPeriod)-1).toFixed(0) + "%";
    this["i-price"] = '';
    this.low24h = '';
    this.maxΩ   = max;
    this.capΩ   = capacity;
    this.conclusion = conclusion == "" ? "" : utilsTsPeriodToTime(conclusion);
    if (marketPair == 'gOHM/OHM') {   // special treatment of Staking line
      this.lockup = "";
      this.ytm = "";
      this.apy = (100*(Math.pow(1+epochYield,secondsPerYear/epochLength)-1)).toFixed(0) + "%";
      this.capΩ = '';
    } else if (marketPair == 'OHM/gOHM') { // unstaking line
      this.lockup = "";
      this.ytm = "";
      this.apy = "";    
    } else {
      utilsSetLowToLocalStorage(marketPair,(100*marketValue).toFixed(2));
      this.low24h = utilsGetLowFromLocalStorage(marketPair); 
      if (GLOBAL.simulation.depositSize > 0) {
        let a = GLOBAL.tokens.find(token => token.symbol == quoteTokenSymbol);
        let isSingleAsset = a.factory == 'undefined' ? true : false;
        let gasCostForPar = 100*(Number(UI.showGasPrice.innerHTML) * Number(GLOBAL.simulation.gasUsage)
          * GLOBAL.price.usdeth * GLOBAL.price.ohmusd / 1e9) / Number(GLOBAL.simulation.depositSize);
        this["i-price"] = (100*marketValue + gasCostForPar + (isSingleAsset 
          ? (Number(GLOBAL.simulation.swapFee) + Number(GLOBAL.simulation.slippage))
          : (Number(GLOBAL.simulation.swapFee) + Number(GLOBAL.simulation.slippage)) / 2)).toFixed(2);
      }
    }
  }
}

/**
 * Contract addresses
 */
const address = {
  olympusDepository: '0x9025046c6fb25fb39e720d97a8fd881ed69a1ef6'.toLowerCase(), // Olympus V2
  olympusProDepository: '0x', // Olympus Pro V2
  olympusStaking: '0xB63cac384247597756545b500253ff8E607a8020'.toLowerCase(), // Olympus Staking
  frontendRewards:'0xee1520f94f304e8D551Cbf310Fe214212e3cA34a'.toLowerCase(), // Olympus Gnosis Safe
  factorySLP: '0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac', // Sushiswap
  factoryUNIV2: '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f', // Uniswap v2
  OHM:    '0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D5'.toLowerCase(),   // token - native 
  sOHM:   '0x04906695D6D12CF5459975d7C3C03356E4Ccd460'.toLowerCase(),   // token - native 
  gOHM:   '0x0ab87046fBb341D058F17CBC4c1133F25a20a52f'.toLowerCase(),   // token - native 
  DAI:    '0x6B175474E89094C44Da98b954EedeAC495271d0F'.toLowerCase(),   // token - represent USD
  OHMDAI: '0x055475920a8c93CfFb64d039A8205F7AcC7722d3'.toLowerCase(),   // token - main pool for price data
  WETH:   '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'.toLowerCase(),   // token - alt route for price data
  USDCWETH: '0x397ff1542f962076d0bfe58ea045ffa2d347aca0'.toLowerCase(), // token - main pool for price data (sim)
  USDC:   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase(), //
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase(),
  FRAX: '0x853d955aCEf822Db058eb8505911ED77F175b99e'.toLowerCase(),
  UST: '0xa693B19d2931d498c5B318dF961919BB4aee87a5'.toLowerCase(),
  LUSD: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0'.toLowerCase(),
  MUSD: '0xe2f2a5C287993345a840Db3B0845fbC70f5935a5'.toLowerCase(),
}

const account = {
  address: '0x',
  pending: [],
  totalOHM: 0,
  totalValue: 0,
  portfolio: [],
  transactionCount: 0,
}

var GLOBAL = {
  API_CALLS: 0, 
  RPC_ERRORS: 0,
  liveMarket: [],
  note: [],
  market: [],
  balance: [],
  methodmap: [],
  tokens: [],
  uintLength: 64,
  price: {ohmusd: 0, usdeth: 0},
  lastRefresh: {marketPrices: 0, notes: 0, balances: 0, prices: 0},
  refreshFrequency: {balances: 300, notes: 300, prices: 120, markets: 600, limit: 60},
  simulation: {depositSize: 0, gasUsage: 600000, swapFee: 0.3, slippage: 0.3},
  altStablecoin: [
    {tokenAddress: address.UST, decimals: 6}, // UST (wormhole)
    {tokenAddress: address.FRAX, decimals: 18}, // FRAX
    {tokenAddress: address.USDC, decimals: 6}, // USDC
    {tokenAddress: address.USDT, decimals: 6}, // USDT
    {tokenAddress: address.LUSD, decimals: 18}, // LUSD
    {tokenAddress: address.MUSD, decimals: 18}, // mUSD
    {tokenAddress: address.DAI, decimals: 18}, // DAI
  ],
  factoryPairingToken: [address.WETH, address.DAI, address.USDC, address.FRAX],
}

const olympusDepository = {
  address: address.olympusDepository,
  indexesFor: [],
  notes:  [],
  pro: false,
}

const liveMarkets = [{
  marketID:     '',
  marketPrice:  '',
  premium:      '',
  pro:          '',
  markets:  [],
  terms:  [],
  product: '',
}]

const olympusStaking = {
  epoch: 0,
  index: 0,
}

/*
function getOut(bytes) {
  let a = bytes.substring(2);
  let words = a.length / GLOBAL.uintLength;
  for(let i = 0; i < words; i++) {
    let d = a.substr(i*GLOBAL.uintLength, GLOBAL.uintLength);
    console.log("getOut", d);
  }
}
*/

/**
 * Link HTML and JS
 */
const UI = {
  connectButton: document.querySelector(".connectButton"),
  showAccount: document.querySelector(".showAccount"),
  showMarket: document.querySelector(".showMarket"),
  showStatus: document.querySelector(".showStatus"),
  showGasPrice: document.querySelector(".showGasPrice"),
  positionTable: document.querySelector(".table1"),
  marketTable: document.querySelector(".table2"),
  cashButton: document.querySelector(".cashButton"),
  bidButton: document.querySelector(".bidButton"),
  settingsButton: document.querySelector(".settingsButton"),
  simButton: document.querySelector(".simButton"),
  titleSign: document.getElementById("title"),
  showWarning: document.querySelector(".warning"),
  claimList: document.getElementById("claimList"),
  claim: document.getElementById('claim'),
  marketList: document.getElementById("marketList"),
  market: document.getElementById('market'),
}

/**
 * Initialize application
 */ 
UI.connectButton.addEventListener("click", async () => {
  await checkMetamask();
  UI.connectButton.remove();
  UI.showAccount.innerHTML = account.address;
  await initializeApplication();
  UI.claim.style.visibility = 'visible'; 
  UI.cashButton.style.visibility = 'visible'; 
  UI.market.style.visibility = 'visible'; 
  UI.bidButton.style.visibility = 'visible';
//  UI.showMarket.innerHTML = '---------- Quote data ----------';
  UI.settingsButton.style.visibility = 'visible';
  UI.simButton.style.visibility = 'visible';
  UI.showAccount.innerHTML = '';
});

/**
 * Execute cash transaction (redeem)
 */
UI.cashButton.addEventListener("click", async () => {
  await sendCash(UI.claim.value);
});


UI.claim.addEventListener("keyup", function(event) {
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    UI.cashButton.click();
  }
}); 

UI.market.addEventListener("keyup", function(event) {
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    UI.bidButton.click();
  }
}); 


/**
 * Execute exchange/bid transaction
 */
 UI.bidButton.addEventListener("click", async () => {
  await sendExchange(UI.market.value);
});

/** Allow change in refresh frequency
 *  Shorter interval leads to more API calls to RPC provider
 */
UI.settingsButton.addEventListener("click", () => {
  let values = `${GLOBAL.refreshFrequency.prices};${GLOBAL.refreshFrequency.balances};${GLOBAL.refreshFrequency.notes};${GLOBAL.refreshFrequency.markets}`;
  let k = prompt("FOR ADVANCED USAGE:\n(Mind your RPC rate limits)\n\nSet refresh frequency in seconds using format:\n" +
    "prices;balances;notes;markets\n\nDefault:\n120;300;300;600\n\nMin:  60\nMax: 3600", values);
  if (k === null) return;
  let va = k.split(';');
  if (va.length != 4) return;
  for (let i = 0; i < 4; i++)
    va[i] = Math.floor(va[i]);
  GLOBAL.refreshFrequency.prices   = va[0] >= 60 && va[0] <= 3600 ? va[0] : GLOBAL.refreshFrequency.prices;
  GLOBAL.refreshFrequency.balances = va[1] >= 60 && va[1] <= 3600 ? va[1] : GLOBAL.refreshFrequency.balances;
  GLOBAL.refreshFrequency.notes    = va[2] >= 60 && va[2] <= 3600 ? va[2] : GLOBAL.refreshFrequency.notes;
  GLOBAL.refreshFrequency.markets  = va[3] >= 60 && va[3] <= 3600 ? va[3] : GLOBAL.refreshFrequency.markets;
  utilsSetCookie('refreshFrequency', JSON.stringify(GLOBAL.refreshFrequency), 30);

});
/** Allow to simulate impact of position size, fees, slippage, gas price on returns */
UI.simButton.addEventListener("click", () => {
  let values = `${GLOBAL.simulation.depositSize};${GLOBAL.simulation.gasUsage};${GLOBAL.simulation.swapFee};${GLOBAL.simulation.slippage}`;
  let k = prompt("FOR ADVANCED USE:\nSimulate impact of execution costs on quote data\n\nCustomize your inputs using format:\n" +
    "deposit size (OHMs);gas usage; swap fee (%); slippage (%)\n\nDefault: 0;600000;0.3;0.3 (depositSize = 0 => simulation disabled)\n", values);
  if (k === null) return;
  let va = k.split(';');
  if (va.length != 4) return;
  for (let i = 0; i < 2; i++)
    va[i] = Math.ceil(va[i]);
  GLOBAL.simulation.depositSize = va[0] >= 0 && va[0] <= 1000000 ? va[0] : GLOBAL.simulation.depositSize;
  GLOBAL.simulation.gasUsage    = va[1] >= 0 && va[1] <= 1000000 ? va[1] : GLOBAL.simulation.gasUsage;
  GLOBAL.simulation.swapFee     = va[2] >= 0 && va[2] <= 5       ? va[2] : Number(GLOBAL.simulation.swapFee);
  GLOBAL.simulation.slippage    = va[3] >= 0 && va[3] <= 10      ? va[3] : Number(GLOBAL.simulation.slippage);
  utilsSetCookie('simulation', JSON.stringify(GLOBAL.simulation), 30);
  refreshMarketTable();
})

/** First load
 *  Some data is stored in local storage, reducing overall need for API calls
 *  during subsequent launches
 */
async function initializeApplication() {
  UI.connectButton.innerHTML = 'Initializing ...';
  let rf = utilsGetCookie('refreshFrequency');
  let sc = utilsGetCookie('simulation');
  GLOBAL.refreshFrequency = rf != "" ? JSON.parse(rf) : GLOBAL.refreshFrequency;
  GLOBAL.simulation = sc != "" ? JSON.parse(sc) : GLOBAL.simulation;

  await getNativeTokens();
  await updateEpoch();
  await updateMarkets(olympusDepository);
  await getTokensFromPair();
  await removeTokensWoPriceSource();
  await getPairTokenForTokens();
  await updateTokenPrices();
  await removeTokensPricedZero();
  await updateBalances(olympusDepository);
  await updateNotes(olympusDepository);
  await updateMarketPrices(olympusDepository);

  for (let i = 0; i < GLOBAL.tokens.length; i++) {
    if (!isTokenLp(GLOBAL.tokens[i].address))
      console.log(GLOBAL.tokens[i].symbol, Number(GLOBAL.tokens[i].price)* GLOBAL.price.ohmusd / Math.pow(10, GLOBAL.tokens[i].decimals));
  }
  try {
    UI.showGasPrice.innerHTML = ((await ethereum.request({method: "eth_gasPrice", params: []}))/1e9).toFixed(0);
    GLOBAL.API_CALLS += 1;
  } catch (e) {};
  refreshPortfolioTable();
  refreshMarketTable();
  initializeClock();
}

/**
 * Refresh visualized data on set intervals
 */
  
async function initializeClock() {
  setInterval(async () => {
    // Shorten refresh frequency if we got pending transactions in the queue.
    try {
      for (let i = 0; i < account.pending.length; i++) {
        let rcpt = await ethereum.request({method: "eth_getTransactionReceipt", params: [account.pending[i]]});
        GLOBAL.API_CALLS += 1;
        if (rcpt != null) {
          if (rcpt.status == 1) {
            GLOBAL.lastRefresh.balances = 0;
            GLOBAL.lastRefresh.notes = 0;
          }
          account.pending.splice(i--, 1)
        }
      }
    } catch (e) {};
    await updateEpoch();
    await updateMarkets(olympusDepository);
    await getTokensFromPair();
    await removeTokensWoPriceSource();
    await getPairTokenForTokens();
    await updateTokenPrices();
    await removeTokensPricedZero();
    await updateBalances(olympusDepository);
    await updateNotes(olympusDepository);
    await updateMarketPrices(olympusDepository);
    try {
      UI.showGasPrice.innerHTML = ((await ethereum.request({method: "eth_gasPrice", params: []}))/1e9).toFixed(0);
      GLOBAL.API_CALLS += 1;
    } catch (e) {};
    refreshPortfolioTable();
    refreshMarketTable();
  }, GLOBAL.refreshFrequency.limit*1000);
}

function refreshPortfolioTable() {
  account.portfolio.length = 0;
  for (let i = 0; i < GLOBAL.balance.length; i++) {
    let token = GLOBAL.tokens.find(tk => tk.address == GLOBAL.balance[i].tokenAddress);
    if (GLOBAL.balance[i].quantity)
      account.portfolio.push(new Position('Wallet', token, '', '', GLOBAL.balance[i].quantity));    
  }
  for (let i = 0; i < GLOBAL.note.length; i++) {
    let payoutToken = GLOBAL.tokens.find(tk => tk.address == GLOBAL.note[i].tokenAddress)
    let payout = GLOBAL.note[i].payout;
    let locked = GLOBAL.note[i].matured > Date.now()/1000 ? true : false;
    account.portfolio.push(new Position('Depository', payoutToken, 
      locked ? payout : '',
      locked ? utilsTsPeriodToTime(GLOBAL.note[i].matured - Date.now()/1000) : '',
      !locked ? payout : ''));
  }
  account.totalOHM = 0; 
  account.totalValue = 0; 
  for (let i = 0; i < account.portfolio.length; i++) {
    account.totalOHM += Number(account.portfolio[i].Ω);
    account.totalValue += Number(account.portfolio[i].$);
  }
  account.portfolio.push(new Position('','','','','',''));
  account.portfolio[account.portfolio.length-1].Ω = account.totalOHM.toFixed(2);
  account.portfolio[account.portfolio.length-1].$ = account.totalValue;

  showPortfolioTable();
}

function refreshMarketTable() {
  GLOBAL.market.length = 0;
  for(let i = 0; i < GLOBAL.liveMarket.length; i++) {
    let quoteToken = GLOBAL.tokens.find(token => token.address == GLOBAL.liveMarket[i].markets.quoteToken);
    let product = GLOBAL.liveMarket[i].product;
    let baseTokenSymbol = (GLOBAL.tokens.find(tk => tk.address == GLOBAL.liveMarket[i].markets.baseToken)).symbol;
    let type            = GLOBAL.liveMarket[i].terms.fixedTerm ? "Fixed-term" : "Fixed-expiry";
    let vestingPeriod   = GLOBAL.liveMarket[i].terms.fixedTerm ? GLOBAL.liveMarket[i].terms.vesting : GLOBAL.liveMarket[i].terms.conclusion;
    let marketValue     = GLOBAL.liveMarket[i].premium;
    let quoteTokenPrice = Number(quoteToken.price) / Math.pow(10, quoteToken.decimals);
    let quoteTokenSymbol= quoteToken.symbol;
    let max = GLOBAL.liveMarket[i].markets.maxPayout / BigInt(1e9);
    let capacity;
    if (!GLOBAL.liveMarket[i].markets.capacityInQuote) {
      capacity = String(GLOBAL.liveMarket[i].markets.capacity / BigInt(1e9));
    } else {
      if (String(GLOBAL.liveMarket[i].markets.capacity).length > 20) {
        capacity = Math.round(String(GLOBAL.liveMarket[i].markets.capacity / BigInt(Math.pow(10, quoteToken.decimals))) / quoteTokenPrice);
      } else {
        capacity = Math.round(String(GLOBAL.liveMarket[i].markets.capacity) / quoteTokenPrice / Math.pow(10, quoteToken.decimals));
      }
    }
    GLOBAL.market.push(new Market(baseTokenSymbol, quoteTokenSymbol, type, vestingPeriod, marketValue, quoteTokenPrice, olympusStaking.epoch.length, Number(olympusStaking.epoch.distribute/BigInt(1e6))/Number(olympusStaking.epoch.circulatingSupply/BigInt(1e6)), max, capacity, GLOBAL.liveMarket[i].terms.conclusion - Date.now()/1000));

  }
  GLOBAL.market.unshift(new Market('gOHM', "OHM", "Staking", "", 1, 1, olympusStaking.epoch.length, Number(olympusStaking.epoch.distribute/BigInt(1e6))/Number(olympusStaking.epoch.circulatingSupply/BigInt(1e6)), "", "", ""));
  GLOBAL.market.unshift(new Market('OHM', "gOHM", "Staking", "", 1, 1, olympusStaking.epoch.length, Number(olympusStaking.epoch.distribute/BigInt(1e6))/Number(olympusStaking.epoch.circulatingSupply/BigInt(1e6)), "", "", ""));
  
  showMarketTable();

}
/**
 * Generic warning function to be called upon errors
 */
function showWarning(msg) {
  GLOBAL.RPC_ERRORS += 1;
  UI.titleSign.insertAdjacentHTML("beforebegin", 
    `<div class="warning" id="warning" style="background-color: red;text-align: center;color:white;font-family:monospace;font-size:small;"></div>`);
  const showWarning = document.getElementById("warning");
  showWarning.innerHTML = `Your selected RPC provider failed to provide ${msg} data. This should self-correct by next refresh.<br>If this occurred during initialization, please reload page and try again.<br><br>RPC errors/session: ${GLOBAL.RPC_ERRORS}`;
  setTimeout(() => showWarning.remove(), 15000)
}

function showMarketTable() {
  UI.marketTable.style = "border:1px solid dark-gray;border-collapse:collapse;";
  let table = document.querySelector(".table2");
  table.innerHTML = '';
  let data = Object.keys(GLOBAL.market[0]);
  generateTableHead(table, data);
  generateTable(table, GLOBAL.market);
  for (let i = 1; i < table.rows.length; i++) {
    if (Number(table.rows[i].cells[2].innerHTML) <= 100) {
      for (let j = 2; j < 6; j++)
        table.rows[i].cells[j].style = "text-align:right;padding-right:10px;padding-left:10px;color:green;border-width:1px;border-style:none solid none solid;border-color:darkgray;";
    } else {
      for (let j = 2; j < 6; j++)
        table.rows[i].cells[j].style = "text-align:right;padding-right:10px;padding-left:10px;color:red;border-width:1px;border-style:none solid none solid;border-color:darkgray;";
    }
  }

  let str = '';
  for (let i = 0; i < GLOBAL.market.length; i++) 
    if (GLOBAL.balance.find(bal => bal.symbol == GLOBAL.market[i].market.slice(GLOBAL.market[i].market.indexOf('/')+1)))
      str += `<option value="${GLOBAL.market[i].market}"</option>`;

  if (UI.marketList.innerHTML != str)
    UI.marketList.innerHTML = str;
}

function showPortfolioTable() {
  let str = '';
  UI.positionTable.style = "border:1px solid darkgray;border-collapse:collapse;";
  let table = document.querySelector(".table1");
  table.innerHTML = '';
  let data = Object.keys(account.portfolio[0]);
  for (let i = 0; i < account.portfolio.length; i++) {
    let nm = String(account.portfolio[i].asset);
    if (account.portfolio[i].available > 0 && account.portfolio[i].custody == 'Depository'
      && !str.includes(`<option value="${nm}</option>`)) {
      str += `<option value="${nm}"</option>`;
    }
  }
  if (UI.claimList.innerHTML != str)
    UI.claimList.innerHTML = str;

    generateTableHead(table, data);
  generateTable(table, account.portfolio);
  table.rows[table.rows.length-1].cells[table.rows[table.rows.length-1].cells.length-2].style = "color:black;background-color:orange;";
  table.rows[table.rows.length-1].cells[table.rows[table.rows.length-1].cells.length-1].style = "color:black;background-color:orange;";

}

function generateTableHead(table, data) {
  let thead = table.createTHead();
  let row = thead.insertRow();
  for (let key of data) {
    let th = document.createElement("th");
    let text = document.createTextNode(key);
    th.appendChild(text);
    th.style = "border-width:1px;border-style:solid;border-color:darkgray;border-collapse:collapse;margin-left:auto;margin-right:auto;color:white;background-color:dimgray";
    row.appendChild(th);
  }
}

function generateTable(table, data) {
  for (let element of data) {
    let row = table.insertRow();
    for (let key in element) {
      let cell = row.insertCell();
      let text = document.createTextNode(element[key]);
      cell.appendChild(text);
      if (!isNaN(cell.innerHTML) && cell.innerHTML != '' && Number(cell.innerHTML) >= 1000) 
        cell.innerHTML = parseFloat(cell.innerHTML).toLocaleString('en');
      cell.style = "border-width:1px;border-style:none solid none solid;border-color:darkgray;border-collapse:collapse;color:orange";
      cell.style.paddingLeft = '10px';
      cell.style.paddingRight = '10px';
      if (String(element[key]).substr(0,1) >= '0' && String(element[key]).substr(0,1) <= '9') {
        cell.style.textAlign = 'right';
      } else { cell.style.textAlign = 'left'} 
    }
  }
  table.style = "border-width:1px;border-style:solid;border-color:darkgray;border-collapse:collapse;margin-left:auto;margin-right:auto;";
  table.rows[0].style = "border-width:1px;border-style:solid;border-color:darkgray";
}

/**
 * Translate a function declaration to EVM method
 */
async function getMethod(function_name) {
  if (!GLOBAL.methodmap.find(mm => function_name == mm.function_name)) {
    let hexStr = "0x" + utilsUtf8ToHex(function_name);
    let method = (await ethereum.request({method: "web3_sha3", params: [hexStr], "id":64})).substr(0,10);
    GLOBAL.methodmap.push(new Methodmap(function_name, method));
    GLOBAL.API_CALLS++;
  }
  return GLOBAL.methodmap.find(mm => function_name == mm.function_name).method;
}

/**
 * All (most) queries to blockchain go via this function
 */
async function eth_call(toAddress, function_name, args) {
  UI.showStatus.innerHTML = `Querying ${function_name}... (API calls: ${GLOBAL.API_CALLS})`;
  args = typeof(args) != 'undefined' ? args : "";
  GLOBAL.API_CALLS++;
  let method = await getMethod(function_name);
  let response = await ethereum.request({method: "eth_call", params: [{"to": toAddress, "data": method + args}, "latest"]})
  UI.showStatus.innerHTML = 'Resting (API calls: ' + GLOBAL.API_CALLS + ')';
  return response;
}

/**
 * All send transactions go via this function
 */
async function eth_send(toAddress, function_name, args) {
  let method = await getMethod(function_name);
  ethereum
  .request({
    method: "eth_sendTransaction",
    params: [
      {
        from: account.address,
        to: toAddress, 
        value: 0, 
        data: method + args,
      },
    ],
  })
  .then((txHash) => { account.pending.push(txHash); UI.moveButton.disabled = true })
  .catch((error) => console.error);
}

/** 
 * Read token balance for certain address
 */
async function getTokenBalance(tokenAddress) {
  const userAddress = utilsAddressToBytes32(account.address);
  try {
    const queryResult = await eth_call(tokenAddress, "balanceOf(address)", userAddress);
    return BigInt("0x" + queryResult.substr("0x".length, GLOBAL.uintLength));
  } catch (e) {
    showWarning('BALANCES');
  }
}

/**
 * Get note data from regular/pro depository
 */
async function getUserNote(dep, noteID) {
//  const userAddress = accountAddress.substr(2, accountAddress.length).padStart(GLOBAL.uintLength, "0");
  const userNoteID = noteID.toString(16).padStart(GLOBAL.uintLength, '0');
  const args = utilsAddressToBytes32(account.address) + userNoteID;
  let queryResult;
  try {
    queryResult = await eth_call(address.olympusDepository, "notes(address,uint256)", args);
  } catch (e) {
    showWarning('NOTES');
  }
  let qr = utilsSplitQueryResult(queryResult);
  const payout  = BigInt(qr[0]);
  const created = Number(qr[1]);
  const matured = Number(qr[2]);
  const tokenAddress = !dep.pro ? address.gOHM : utilsToAddress(qr[5]);
  return {payout: payout, created: created, matured: matured, tokenAddress: tokenAddress};
}

/**
 * Get regular/pro data for live markets
 */
async function getMarkets(dep, marketID) {
  const args = marketID.toString(16).padStart(GLOBAL.uintLength, '0');
  let queryResult;
  try {
    queryResult = await eth_call(dep.address, "markets(uint256)", args);
  } catch (e) {
    showWarning('MARKETS');
  }
  let qr = utilsSplitQueryResult(queryResult);
  //dep.pro = qr.length > 7 ? true : false;
  const capacity        = qr[!dep.pro?0:5];
  const quoteToken      = qr[!dep.pro?1:2].toLowerCase();
  const capacityInQuote = qr[!dep.pro?2:4];
  const maxPayout       = qr[!dep.pro?4:8];
  const baseToken       = !dep.pro ? address.gOHM : qr[1].toLowerCase();

  return {capacity: BigInt(capacity), capacityInQuote: Number(capacityInQuote), 
    quoteToken: utilsToAddress(quoteToken), baseToken: utilsToAddress(baseToken),  
    maxPayout: BigInt(maxPayout) };
}

/**
 * Get regular/pro data for live markets
 */
async function getTerms(dep, marketID) {
  const args = marketID.toString(16).padStart(GLOBAL.uintLength, '0');
  let queryResult;
  try {
    queryResult = await eth_call(dep.address, "terms(uint256)", args);
  } catch (e) {
    showWarning('MARKETS');
  }
  let qr = utilsSplitQueryResult(queryResult);
  const fixedTerm  = Number(qr[!dep.pro?0:2]);
  const vesting    = Number(qr[!dep.pro?2:3]);
  const conclusion = Number(qr[!dep.pro?3:4]);
 
  return {fixedTerm: fixedTerm, vesting: vesting, conclusion: conclusion};
}

  //Get Current Balance
//  const balance = await ethereum.request({ method: "eth_getBalance", params: [account, "latest"], });
//  const balance = await ethereum.request({ method: "eth_call", params: [{"to": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "data": "0x70a08231000000000000000000000000EF2544db4AF24e8B60e93859Ca49687bEa3143A6"}, "latest"]});


/**
 * Get static token data for specific token and store it
 */
async function getTokenInfo(tokenAddress) {
  let pairs = [], t;
  let val = window.localStorage.getItem(tokenAddress);
  if (val) {
    let json = JSON.parse(val);
    t = new Token(json.chainId, json.address, json.decimals, json.symbol, json.name, json.totalSupply, json.pairToken);
    if (typeof(json.factory) != 'undefined') t.factory = json.factory;
    if (typeof(json.token0) != 'undefined') t.token0 = json.token0;
    if (typeof(json.token1) != 'undefined') t.token1 = json.token1;
    return t;
  } else {
    try {
      let [decimals, symbol] = 
        await Promise.all([eth_call(tokenAddress, "decimals()"), eth_call(tokenAddress, "symbol()")]);
      symbol = utilsToEString(symbol);
      const name = symbol;
      let t = new Token(1, tokenAddress, Number(decimals), symbol, name, 0, pairs);
      if (t.name == 'SLP' || t.name == 'UNI-V2') {
        let factory = await eth_call(tokenAddress, "factory()");
        let results = await Promise.all([
          eth_call(tokenAddress, "token0()"),
          eth_call(tokenAddress, "token1()")]);
        t.factory = utilsToAddress(factory);
        t.token0  = utilsToAddress(results[0]);
        t.token1  = utilsToAddress(results[1]);
        results = await Promise.all([eth_call(t.token0,'symbol()'), eth_call(t.token1,'symbol()')]);
        t.symbol = utilsToEString(results[0]) + "-" + utilsToEString(results[1]);
      } else {
        if (!GLOBAL.altStablecoin.find(t => t.tokenAddress == tokenAddress) 
          && tokenAddress != address.WETH 
          && tokenAddress != address.gOHM
          && tokenAddress != address.sOHM
          && tokenAddress != address.OHM)
          t.pairToken = await getPairs(tokenAddress);
      }
      window.localStorage.setItem(tokenAddress, JSON.stringify(t));
      return t;
        } catch (e) {
      showWarning('MARKETS');
    }
  }
}

/**
 * Catch pairs from V2 factories
 */
async function getPairs(tokenAddress) {
  let pair = []; let pairs = [];
  for (let i = 0; i < GLOBAL.factoryPairingToken.length; i++) { 
    let args = utilsAddressToBytes32(tokenAddress) + utilsAddressToBytes32(GLOBAL.factoryPairingToken[i]);
    pair = await Promise.all([
      eth_call(address.factorySLP, 'getPair(address,address)', args),
      eth_call(address.factoryUNIV2, 'getPair(address,address)', args)]);
    pairs.push(utilsToAddress(pair[0]));
    pairs.push(utilsToAddress(pair[1]));
  }
  return pairs.filter(p => p != utilsToAddress('0x0000000000000000000000000000000000000000000000000000000000000000'));
}

async function getTokens(tokenAddress) {
//  if (tokenAddress != address.WETH && !isAltStablecoin(tokenAddress) && tokenAddress != address.OHM)
  if (GLOBAL.tokens.length == 0 || !GLOBAL.tokens.find(token => token.address == tokenAddress))
    GLOBAL.tokens.push(await getTokenInfo(tokenAddress));
}

async function getNativeTokens() {
  await getTokens(address.OHM);
  (GLOBAL.tokens.find(tk => tk.address == address.OHM)).isNative = true;
  await getTokens(address.sOHM);
  (GLOBAL.tokens.find(tk => tk.address == address.sOHM)).isNative = true;
  await getTokens(address.gOHM);
  (GLOBAL.tokens.find(tk => tk.address == address.gOHM)).isNative = true;
}

async function getTokensFromPair() {
  for (let i = 0; i < GLOBAL.tokens.length; i++)
    if (isTokenLp(GLOBAL.tokens[i].address)) {
      await getTokens(GLOBAL.tokens[i].token0); 
      await getTokens(GLOBAL.tokens[i].token1);
    }
}

async function getPairTokenForTokens() { // FIX a REFRESH CHECK FOR NEW PAIRS
  for (let i = 0; i < GLOBAL.tokens.length; i++)
    for (let j = 0; j < GLOBAL.tokens[i].pairToken.length; j++) 
      await getTokens(GLOBAL.tokens[i].pairToken[j]);
}

async function removeTokensWoPriceSource() { // removes tokens not on Sushi/UniV2
  for (let i = 0; i < GLOBAL.tokens.length; i++)
    if (!isTokenLp(GLOBAL.tokens[i].address) && GLOBAL.tokens[i].pairToken.length == 0 
      && !isAltStablecoin(GLOBAL.tokens[i]) && !GLOBAL.tokens[i].isNative)
        GLOBAL.tokens.splice(i--, 1);
}

async function removeTokensPricedZero() { 
  for (let i = 0; i < GLOBAL.tokens.length; i++)
    if (GLOBAL.tokens[i].price == 0 && !GLOBAL.tokens[i].isNative)
      GLOBAL.tokens.splice(i--, 1);
}

async function removeDeadPair() {
  for (let i = 0; i < GLOBAL.tokens.length; i++)
  if (isTokenLp(GLOBAL.tokens[i].address) && !GLOBAL.tokens[i].price > 0) {
    for (let j = 0; j < GLOBAL.tokens.length; j++ )
      for (let n = 0; n < GLOBAL.tokens[j].pairToken.length; n++)
        if (GLOBAL.tokens[j].pairToken[n] == GLOBAL.tokens[i].address)
          GLOBAL.tokens[j].pairToken.splice(n, 1);
    GLOBAL.tokens.splice(i--, 1);
  }
}

async function updateMarkets(dep) {
  if (typeof(GLOBAL.lastRefresh.markets) == 'undefined' || Date.now()/1000 - GLOBAL.lastRefresh.markets > GLOBAL.refreshFrequency.markets) {

    const queryResult = utilsSplitQueryResult(await eth_call(dep.address, "liveMarkets()"));
    const marketCount = Number(queryResult[1]);
    const liveMarkets = [];
    for (let i = 1; i <= marketCount; i++)      // identify all live market IDs
      liveMarkets.push(Number(queryResult[i+1]));
    for (let i = 0; i < GLOBAL.liveMarket.length; i++) // remove expired markets
      if (!liveMarkets.find(mid => mid == GLOBAL.liveMarket[i].ID)) GLOBAL.liveMarket.splice(i, 1);
      
    for (let i = 0; i < liveMarkets.length; i++) // add market if it does not exist already
      if (typeof(GLOBAL.liveMarket) == 'undefined' 
        || !GLOBAL.liveMarket.find(lm => lm.ID == liveMarkets[i])
        || GLOBAL.liveMarket.find(lm => lm.ID == liveMarkets[i] && lm.pro != dep.pro)) {
        let k = await getMarkets(dep, liveMarkets[i]);
        let m = await getTerms(dep, liveMarkets[i]);
        GLOBAL.liveMarket.push(new LiveMarket(liveMarkets[i], k, m, dep.pro));
      }

    for (let i = 0; i < GLOBAL.liveMarket.length; i++) {
      await getTokens(GLOBAL.liveMarket[i].markets.quoteToken);
      await getTokens(GLOBAL.liveMarket[i].markets.baseToken);
    }
    GLOBAL.lastRefresh.markets = Date.now()/1000;
  }
}

async function updateMarketPrices(dep) {
  if(Date.now()/1000 - GLOBAL.lastRefresh.marketPrices > GLOBAL.refreshFrequency.prices) {
    try {
      for (let i = 0; i < GLOBAL.liveMarket.length; i++) {
        GLOBAL.liveMarket[i].marketPrice = Number(await eth_call(dep.address, "marketPrice(uint256)", GLOBAL.liveMarket[i].ID.toString(16).padStart(GLOBAL.uintLength, "0")));
        GLOBAL.liveMarket[i].premium = Math.pow(10, (GLOBAL.tokens.find(token => token.address == GLOBAL.liveMarket[i].markets.quoteToken).decimals)-9) * 
          Number(GLOBAL.liveMarket[i].marketPrice)/Number(GLOBAL.tokens.find(token => token.address == GLOBAL.liveMarket[i].markets.quoteToken).price);
          // FIX for PRO
        }
    } catch (e) {
      showWarning('PRICES');
    }
    GLOBAL.lastRefresh.marketPrices = Date.now()/1000;
  }
}

async function updateNotes(dep) {
    if (GLOBAL.lastRefresh.notes == 0 || Date.now()/1000 - GLOBAL.lastRefresh.notes > GLOBAL.refreshFrequency.notes) {
      let queryResult;
      try {
        queryResult = await eth_call(dep.address, "indexesFor(address)", utilsAddressToBytes32(account.address)); 
      } catch (e) {
        showWarning('NOTES');
      }
      let qr = utilsSplitQueryResult(queryResult);
      const noteCount = Number(qr[1]);
      const indexesFor = [];
      for (let i = 1; i <= noteCount; i++)    // identify all live notes
        indexesFor.push(Number(qr[1 + i]));

      for (let i = 0; i < GLOBAL.note.length; i++) // remove expired notes
        if (!indexesFor.find(nid => nid == GLOBAL.note[i].ID)) GLOBAL.note.splice(i, 1);

      for (let i = 0; i < indexesFor.length; i++) // add note if it does not exist already
        if (typeof(GLOBAL.note) == 'undefined' || !GLOBAL.note.find(nt => nt.ID == indexesFor[i])) {
          let k = await getUserNote(dep, indexesFor[i]);
          GLOBAL.note.push(new Note(indexesFor[i], k.payout, k.matured, k.tokenAddress, dep.pro));
        }

      GLOBAL.lastRefresh.notes = Date.now()/1000;
    }
}

async function updateEpoch() {
  if (typeof(olympusStaking.epoch.end) == 'undefined' || Date.now()/1000 > olympusStaking.epoch.end) {
    const queryResult = await Promise.all([eth_call(address.olympusStaking, "epoch()"), eth_call(address.olympusStaking, "index()"), eth_call(address.sOHM, "circulatingSupply()")]);
    let qr = utilsSplitQueryResult(queryResult[0]);
    olympusStaking.epoch = new Epoch(
      Number(qr[0]),
      Number(qr[1]),
      Number(qr[2]),
      BigInt(qr[3]));

    qr = utilsSplitQueryResult(queryResult[1]);
    olympusStaking.index = BigInt(qr[0]);
    qr = utilsSplitQueryResult(queryResult[2]);
    olympusStaking.epoch.circulatingSupply = BigInt(qr[0]);
  }
}

async function updateBalances(dep) {
  if (Date.now() / 1000 - GLOBAL.lastRefresh.balances > GLOBAL.refreshFrequency.balances) {
    GLOBAL.balance.length = 0;
    let eth_calls = []; // FIX an OPTIMIZE BATCHING
    if (!dep.pro)
      for (let i = 0; i < GLOBAL.tokens.length; i++) 
        if (GLOBAL.tokens[i].isNative) { 
          let bal = await getTokenBalance(GLOBAL.tokens[i].address);
          GLOBAL.balance.push(new Balance(bal, GLOBAL.tokens[i].address, GLOBAL.tokens[i].symbol));  
        }

    for (let i = 0; i < GLOBAL.liveMarket.length; i++) {
      let qT = GLOBAL.tokens.find(tk => tk.address == GLOBAL.liveMarket[i].markets.quoteToken);
      if (!(GLOBAL.tokens.find(tk => tk.address == qT.address)).isNative) {
        let bal = await getTokenBalance(qT.address); 
        if (bal) GLOBAL.balance.push(new Balance(bal, qT.address, qT.symbol));
      }
    }

    GLOBAL.lastRefresh.balances = Math.round(Date.now() / 1000);
  }
}

async function updateTokenPrices() {
  if(Date.now()/1000 - GLOBAL.lastRefresh.prices > GLOBAL.refreshFrequency.prices) {
    await updatePrice();
//    try {
      for (let i = 0; i < GLOBAL.tokens.length; i++) // LP tokens
        if (isTokenLp(GLOBAL.tokens[i].address)) {
          console.log('aquí', GLOBAL.tokens[i].symbol, GLOBAL.tokens[i].address)
          let b = [], _reserve, _price, _token;
          b = await Promise.all([
            eth_call(GLOBAL.tokens[i].address, "totalSupply()"),
            eth_call(GLOBAL.tokens[i].address, "getReserves()")]);
          GLOBAL.tokens[i].totalSupply = BigInt(b[0]);
          let reserves = b[1];
          GLOBAL.tokens[i].reserve0 = BigInt("0x" + reserves.substr("0x".length + GLOBAL.uintLength * 0, GLOBAL.uintLength));
          GLOBAL.tokens[i].reserve1 = BigInt("0x" + reserves.substr("0x".length + GLOBAL.uintLength * 1, GLOBAL.uintLength));
          if (GLOBAL.tokens[i].token0 == address.OHM) { _reserve = GLOBAL.tokens[i].reserve0 } 
          else if (GLOBAL.tokens[i].token1 == address.OHM) { _reserve = GLOBAL.tokens[i].reserve1 } 
          else { // convert reserve to OHMs using ETH or stable price
            if (GLOBAL.tokens[i].token0 == address.WETH || isAltStablecoin(GLOBAL.tokens[i].token0)) {
              _reserve = GLOBAL.tokens[i].reserve0; _token = GLOBAL.tokens[i].token0; }
            if (GLOBAL.tokens[i].token1 == address.WETH || isAltStablecoin(GLOBAL.tokens[i].token1)) {
              _reserve = GLOBAL.tokens[i].reserve1; _token = GLOBAL.tokens[i].token1; }
            if (GLOBAL.tokens[i].token0 == address.WETH || GLOBAL.tokens[i].token1 == address.WETH) {
                _price = GLOBAL.price.usdeth; } else { _price = 1; }
            if (typeof(_reserve) == 'undefined')
              { _reserve = BigInt(1) } // kill
            let sc = GLOBAL.altStablecoin.find(c => c.tokenAddress == _token);
            let decimals = sc ? sc.decimals : 18; //fugly 18 for weth
            let decDiff = decimals - 9;

              // if value of pool < x then remove lpToken, and remove pairToken from all singles
            let valueOfPool = BigInt(Math.round(2 * Number(_reserve) * _price)) / BigInt(Math.pow(10, decimals));
            if (valueOfPool < 1e5) {
              GLOBAL.tokens[i].totalSupply = BigInt(0); // this will kill this token
              _reserve = BigInt(1);                     // this will kill this token
            } else {
              _reserve = (_reserve * BigInt(Math.round(1e9 * _price / GLOBAL.price.ohmusd)) / BigInt(1e9));
              _reserve = decDiff > 0 ? _reserve / BigInt(Math.pow(10, decDiff))
                                     : _reserve * BigInt(Math.pow(10, -decDiff));
            }
          }
          GLOBAL.tokens[i].price =  GLOBAL.tokens[i].totalSupply * BigInt(1e9) / (BigInt(2) * _reserve);
        } 
  //      }
 //   } catch (e) {
 //     showWarning('PRICES')
  //  }

      removeDeadPair();
      for (let i = 0; i < GLOBAL.tokens.length; i++)  // base tokens
        if (!isTokenLp(GLOBAL.tokens[i].address)) {
          await getSingleAssetPrice(GLOBAL.tokens[i]);
        }
  }
}

async function getSingleAssetPrice(singleToken) {
  singleToken.price = 0;
  // if the asset is a stablecoin other than DAI - use DAI as proxy for price calculation (sushi pool)
  if (isAltStablecoin(singleToken.address)) 
    { singleToken.price = BigInt(Math.round(Math.pow(10, singleToken.decimals) / GLOBAL.price.ohmusd)) }
  else if (singleToken.address == address.gOHM) {singleToken.price = olympusStaking.index }
  else if (singleToken.address == address.WETH) 
    { singleToken.price = BigInt(Math.round(1e18 / (GLOBAL.price.usdeth * GLOBAL.price.ohmusd))) }
  else if (singleToken.address == address.OHM || singleToken.address == address.sOHM) 
    { singleToken.price = BigInt(1e9) } 
  else {
    let maxReserve = 0;
    let reserve = 0;
    // find the best Pair token
    for (let i = 0; i < singleToken.pairToken.length; i++) {
      let lpToken = GLOBAL.tokens.find(tk => tk.address == singleToken.pairToken[i]);
      if (lpToken.token0 == singleToken.address) { reserve = lpToken.reserve0 }
      if (lpToken.token1 == singleToken.address) { reserve = lpToken.reserve1 }
      if (reserve > maxReserve) { maxReserve = reserve }
    }
    // delete all Pair tokens, except for the largest pool. calculate price based on largest pool
    for (let i = 0; i < singleToken.pairToken.length; i++) {
      lpToken = GLOBAL.tokens.find(tk => tk.address == singleToken.pairToken[i]);
      if (lpToken.token0 == singleToken.address) reserve = lpToken.reserve0;
      if (lpToken.token1 == singleToken.address) reserve = lpToken.reserve1;
      if (reserve < maxReserve) { singleToken.pairToken.splice(i--, 1) } // cleanup to avoid API calls
      if (reserve == maxReserve) { singleToken.price = reserve * BigInt(2) * lpToken.price / lpToken.totalSupply}
    }
  }
}

async function updatePrice() {
  try {
    const queryResult = await Promise.all([eth_call(address.OHMDAI, "getReserves()"), eth_call(address.USDCWETH, "getReserves()")]);
    let qr = utilsSplitQueryResult(queryResult[0]);
    let reserve0 = BigInt(qr[0]);
    let reserve1 = BigInt(qr[1]);
    GLOBAL.price.ohmusd = Number(BigInt(1e18) * reserve0 / reserve1) / 1e9;
    qr = utilsSplitQueryResult(queryResult[1]);
    reserve0 = BigInt(qr[0]);
    reserve1 = BigInt(qr[1]);      
    GLOBAL.price.usdeth = Number(BigInt(1e18) * reserve0 / reserve1) / 1e6;
    GLOBAL.lastRefresh.prices = Date.now()/1000;
  } catch (e) {
    showWarning('PRICES');
  }
}

async function sendCash(asset) {
  let _sendgOHM = asset == 'gOHM' ? 1 : 0;
  asset = asset == 'sOHM' ? 'gOHM' : asset;

  let addr = (GLOBAL.tokens.find(tk => tk.symbol == asset)).address;
  let maturedNotes = GLOBAL.note.filter(nt => nt.tokenAddress == addr && nt.matured < Date.now()/1000);

  let notesToRedeem = [];
  for (let i = 0; i < maturedNotes.length && !maturedNotes[i].pro; i++)
    notesToRedeem.push(maturedNotes[i].ID);

  let proNotesToRedeem = [];
  for (let i = 0; i < maturedNotes.length && maturedNotes[i].pro; i++)
    proNotesToRedeem.push(maturedNotes[i].ID);

  if (notesToRedeem.length > 0) { sendRedeem(notesToRedeem, _sendgOHM) } 
  else if (proNotesToRedeem.length > 0) { sendRedeem(proNotesToRedeem) } 
  else { alert(`You have no cashable ${asset}.`) }
}

async function sendExchange(marketPair) {
  marketPair = marketPair.toLowerCase();
  // find available balance of quoteToken in the wallet (cash)
  let qT = GLOBAL.tokens.find(tk => tk.symbol.toLowerCase() == marketPair.slice(marketPair.indexOf('/')+1));
  let bT = GLOBAL.tokens.find(tk => tk.symbol.toLowerCase() == marketPair.slice(0, marketPair.indexOf('/')));
  let bal = GLOBAL.balance.find(bal => bal.tokenAddress == qT.address)
  let qty, price, marketID, depositTokenAddress;
  let max = utilsFormatUnits(bal.quantity, qT.decimals, qT.decimals);
  let marketPairCount = 0;

  for (let i = 0; i < GLOBAL.market.length; i++ )
    if (marketPair == GLOBAL.market[i].market.toLowerCase())
      marketPairCount++;

  if (marketPair == 'ohm/sohm' || marketPair == 'sohm/ohm' || marketPair == 'sohm/gohm' 
    ||  marketPair == 'gohm/sohm') {
    if (marketPairCount > 0) {
      alert("Sorry, too many markets with same marketPair. Visit olympusDAO site to trade this pair.");
      return; //fix this
    }
  } else {
    if (marketPairCount > 1) {
      alert("Sorry, too many markets with same marketPair. Visit olympusDAO site to trade this pair.");
      return; //fix this
    } else  if (marketPair != 'gohm/ohm' && !marketPair == 'ohm/gohm'){
      for (let i = 0; i < GLOBAL.market.length; i++ ) {
        if (marketPair == GLOBAL.market[i].market.toLowerCase()) {
          max = Number(max) < Number(GLOBAL.market[i].capΩ) ? max : String(GLOBAL.market[i].capΩ);
          max = Number(max) < Number(GLOBAL.market[i].maxΩ) ? max : String(GLOBAL.market[i].maxΩ);
        }
      }  
    }
  }

  qty = prompt("Quantity:", max);
  if (qty === null) return;
  try {
    if (!Number(qty) > 0 || Number(qty) > Number(max)) {
      alert("Quantity must be greater than zero and less than available.");
      return;
    }
    qty = qty.includes('.') ? 
    qty.slice(0, qty.indexOf('.')) + qty.slice(qty.indexOf('.')+1).slice(0,qT.decimals).padEnd(qT.decimals, '0')
    : String(BigInt(qty) * BigInt(Math.pow(10,qT.decimals)));
  } catch (e) {
    console.log('Cancelled');
  }

  // check for unlisted sOHM markets
  if (marketPair == 'ohm/sohm') { await sendUnstake(qty, 1) }
  else if (marketPair == 'ohm/gohm') { await sendUnstake(qty, 0) }
  else if (marketPair == 'sohm/ohm') { await sendStake(qty, 1) }
  else if (marketPair == 'gohm/ohm') { await sendStake(qty, 0) }
  else if (marketPair == 'sohm/gohm') { await sendWrapUnwrap(qty, 0) }
  else if (marketPair == 'gohm/sohm') { await sendWrapUnwrap(qty, 1) }
  // deposit markets
  else {
    let mkt = GLOBAL.liveMarket.find(lm => lm.markets.quoteToken == qT.address 
      && lm.markets.baseToken == bT.address);
    let price = Math.round(1.002*mkt.marketPrice); // FIX slippage move to parameter

    sendDeposit(qty, price, mkt.ID, qT.address, mkt.pro);
  }
}

async function checkMetamask() {
  // Check if Metamask is installed
  if (typeof (window.ethereum) !== "undefined") { console.log("Metamask is installed"); 
  } else { alert("Metamask not installed, or page not opened through a web server"); }

  let chainId = await ethereum.request({ method: 'eth_chainId' });
  if (Number(chainId) != 1) {
    alert("Please ensure Metamask is connected to Ethereum network.");
    return;
  }
  ethereum.on('chainChanged', (_chainId) => { alert('Network change detected.'); window.location.reload() }); 
  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" }); //test list with all metamask account
    account.address = accounts[0];
  } catch (e) { alert("Failed to load Metamask account."); window.location.reload(true); }
}

async function checkAllowance(tokenAddress, spenderAddress, qty) {
  let allowance, args;
  args = utilsAddressToBytes32(account.address)
    + utilsAddressToBytes32(spenderAddress)

  try {
    allowance = await eth_call(tokenAddress, 'allowance(address,address)', args);   
  } catch (e) {
    alert('Unable to verify approved amount for this deposit token.');
    return false;
  }
  console.log('allowance qty', BigInt(allowance), qty);
  if (BigInt(allowance) < BigInt(qty)) {
    let allowQty = prompt(`Contract ${spenderAddress} needs permission to transfer deposit token out of your account.\n` +
      'Please enter allowance limit: ', qty);
    if (allowQty == null) return false;
    if (allowQty < qty) { alert('Allowance cannot be less than deposit amount.'); return false };
    await sendApprove(tokenAddress, spenderAddress, allowQty);
    return false;
  }
  return true;
}

async function sendStake(qty, _rebasing) {
  if (await checkAllowance(address.OHM, address.olympusStaking, qty)) {

    let data = utilsAddressToBytes32(account.address)
      + utilsDec2Hex(qty).padStart(GLOBAL.uintLength, '0')
      + String(_rebasing).padStart(GLOBAL.uintLength, '0')
      + '1'.padStart(GLOBAL.uintLength, '0');

    await eth_send(address.olympusStaking, 'stake(address,uint256,bool,bool)', data); // '0xd866c9d8'
  }
}

async function sendUnstake(qty, _rebasing) {
  let tokenAddress = Number(_rebasing) == 1 ? address.sOHM : address.gOHM;
  if (await checkAllowance(tokenAddress, address.olympusStaking, qty)) {
    let data = utilsAddressToBytes32(account.address)
      + utilsDec2Hex(qty).padStart(GLOBAL.uintLength, '0')
      + '1'.padStart(GLOBAL.uintLength, '0')
      + String(_rebasing).padStart(GLOBAL.uintLength, '0');

    await eth_send(address.olympusStaking, 'unstake(address,uint256,bool,bool)', data);
  }
}
async function sendWrapUnwrap(qty, _wrap) {
  let tokenAddress = _wrap == 0 ? address.gOHM : address.sOHM;
  if (await checkAllowance(tokenAddress, address.olympusStaking, qty)) {
    let function_name = _wrap == 0 ? 'unwrap(address,uint256)': 'wrap(address,uint256)';
    let data = utilsAddressToBytes32(account.address)
      + utilsDec2Hex(qty).padStart(GLOBAL.uintLength, '0');

    await eth_send(address.olympusStaking, function_name, data); // '0xbf376c7a'
  }
}

async function sendRedeem(_notes, _sendgOHM) {
  let pro = typeof(_sendgOHM) == "undefined";

  let data = utilsAddressToBytes32(account.address);
  data += pro ? '40'.padStart(GLOBAL.uintLength, 0) : '60'.padStart(GLOBAL.uintLength, 0);
  data += pro ? "" : String(_sendgOHM).padStart(GLOBAL.uintLength, 0); 
  data += String(_notes.length).padStart(GLOBAL.uintLength, 0);
  for (let i = 0; i < _notes.length; i++) 
    data += String(_notes[i]).padStart(GLOBAL.uintLength, 0);

  let func = pro ? 'redeem(address,uint256[])' : 'redeem(address,uint256[],bool)';
  let addr = pro ? address.olympusProDepository : address.olympusDepository;

  await eth_send(addr, func, data); 
}

async function sendDeposit(qty, price, marketID, tokenAddress, pro) {
  console.log(qty, price, marketID);
  if (await checkAllowance(tokenAddress, pro ? address.olympusProDepository : address.olympusDepository, qty)) {
    if (!pro) {
      let data = utilsDec2Hex(String(marketID)).padStart(GLOBAL.uintLength, '0')
      + utilsDec2Hex(qty).padStart(GLOBAL.uintLength, '0')
      + utilsDec2Hex(String(price)).padStart(GLOBAL.uintLength, '0')
      + utilsAddressToBytes32(account.address)
      + utilsAddressToBytes32(address.frontendRewards);
      await eth_send(address.olympusDepository, 'deposit(uint256,uint256,uint256,address,address)', data);
    } else {
  //    let data = utilsDec2Hex(String(marketID)).padStart(GLOBAL.uintLength, '0')
  // + _amounts [amount in, amount min out] ;
  // + _addresses [recipient, referrer] ...  
  //    await eth_send(address.olympusProDepository, 'deposit(uint48,uint256[2],address[2]', data);
    }
  }
}

async function sendApprove(tokenAddress, spenderAddress, amount) {
  let data = utilsAddressToBytes32(spenderAddress)
    + utilsDec2Hex(String(amount)).padStart(GLOBAL.uintLength, 0);
  await eth_send(tokenAddress, 'approve(address,uint256)', data); // 0x095ea7b3
}

function isAltStablecoin(_tokenAddress) {
  return typeof(GLOBAL.altStablecoin.find(coin => _tokenAddress == coin.tokenAddress)) != 'undefined' ? true : false;
}

function isTokenLp(tokenAddress) {
    let a = GLOBAL.tokens.find(token => token.address == tokenAddress);
    return (a && (a.name == 'SLP' || a.name == 'UNI-V2')) ? true : false;
}

/**
 * Formats a native blockchain amount to its human interpretable form
 * @param {*} _amount BigInt or Integer representing token amount on blockchain
 * @param {*} _tkDec Decimals of token smart contract setting (commonly 18)
 * @param {*} _outDec Round output to this number of decimals
 * @returns string
 */
 function utilsFormatUnits(_amount, _tkDec, _outDec, nr_format) {
    let a = String(_amount).padStart(_tkDec, "0");
    a = a.length > _tkDec ? (a / Math.pow(10, _tkDec)).toFixed(_outDec) : Number(`0.${a}`).toFixed(_outDec);
    if (nr_format) { return Number(a) }
    else { return a }
  }

function utilsDec2Hex(str){ // .toString(16) only works up to 2^53
  // credit: https://stackoverflow.com/questions/18626844/convert-a-large-integer-to-a-hex-string-in-javascript
  var dec = str.toString().split(''), sum = [], hex = [], i, s
  while(dec.length){
      s = 1 * dec.shift()
      for(i = 0; s || i < sum.length; i++){
          s += (sum[i] || 0) * 10
          sum[i] = s % 16
          s = (s - sum[i]) / 16
      }
  }
  while(sum.length){
      hex.push(sum.pop().toString(16))
  }
  return hex.join('')
}

function utilsToAddress(_address) { 
  if (_address.substr(0, 2) == "0x")
    _address = _address.substr(2, GLOBAL.uintLength);
  _address = _address.length <= 40 ? _address : _address.substr(GLOBAL.uintLength - 40, 40);
  return "0x" + _address.toLowerCase();
}

function utilsAddressToBytes32(_address) {
  return _address.substr(2, 40).padStart(GLOBAL.uintLength, "0");
}

function utilsToEString(raw) {
  const len = Number("0x" + raw.substr(129,1));
  const bytes32 = raw.substr(130, 63).padEnd("0", 64);
  const result = [];
  for (let i = 0; i < len * 2; i += 2) {
      result.push(parseInt(bytes32.substring(i, i + 2), 16));
  }
  return new TextDecoder().decode(new Uint8Array(result));
}

/**
 * Convert unix timestamp to readable duration 
 * @param {} tsPeriod 
 * @returns day:hour:minute format
 */
 function utilsTsPeriodToTime(tsPeriod) {
  var timeLeft = Math.max(0, tsPeriod);
  const dd = String(Math.floor(timeLeft / 86400)).padStart(3, "0");
  timeLeft %= 86400;
  const hh = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
  timeLeft %= 3600;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  var str = Number(dd) > 0 ? dd + "d" : "";
  str += Number(hh) > 0 || Number(dd) > 0 ? hh + "h" : "";
  str += mm + "m";
  return str;
}

function utilsUtf8ToHex(s) // Credit: https://stackoverflow.com/questions/60504945/javascript-encode-decode-utf8-to-hex-and-hex-to-utf8
{
  const utf8encoder = new TextEncoder();
  const rb = utf8encoder.encode(s);
  let r = '';
  for (const b of rb) {
    r += ('0' + b.toString(16)).slice(-2);
  }
  return r;
}

function utilsSetLowToLocalStorage(product, price) {
  let key = product + "-" + (new Date()).getHours();
  if (window.localStorage.getItem(key) == null || Number(price) < Number(window.localStorage.getItem(key)))
    window.localStorage.setItem(key, price);

}

function utilsSplitQueryResult(_qr) {
  let qr = [];
  _qr = _qr.slice(2);
  for (let i = 0; i*GLOBAL.uintLength < _qr.length; i++) 
    qr[i] = "0x" + _qr.slice(i*GLOBAL.uintLength, (i+1)*GLOBAL.uintLength);
  return qr;
}

function utilsGetLowFromLocalStorage(product) {
  let low;
  for (let i = 0; Number((new Date()).getHours()) + i <= 23; i++) {
    let key = product + "-" + (Number((new Date()).getHours()) + i);
    let val = window.localStorage.getItem(key);
    if (typeof(low) == 'undefined' || Number(val) < Number(low))
      low = val == null ? low : val; 
  }
  for (let i = 1; Number((new Date()).getHours()) - i >= 0; i++) {
    let key = product + "-" + (Number((new Date()).getHours()) - i);
    let val = window.localStorage.getItem(key);
    if (typeof(low) == 'undefined' || Number(val) < Number(low))
      low = val == null ? low : val; 
  }

  return low;
} 

function utilsSetCookie(cname, cvalue, exdays) {
  let expires = "max-age="+ Math.floor(exdays*24*60*60/1000)*1000;
  document.cookie = cname + "=" + cvalue + ";" + expires + ";samesite=strict";
}

function utilsGetCookie(cname) { //credit: https://www.w3schools.com/js/js_cookies.asp
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
