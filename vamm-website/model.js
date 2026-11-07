const simulationModel = (() => {
  const lessons = {
    Compounding: 'When gains stay in your savings, future growth can apply to the original money and the earlier gains. Losses can compound too.',
    Inflation: 'Inflation means prices rise over time. Inflation-adjusted value estimates what your future balance could buy in today’s prices.',
    Diversification: 'Spreading money across different assets reduces how much one asset can affect the whole portfolio. Several assets can still fall together.',
    Risk: 'Risk is the possibility that the result differs from what you expected. Money you need soon may have less time to recover from a drop.',
    'Emergency savings': 'An emergency fund is money you keep accessible for unexpected expenses, such as replacing a broken device.',
  };
  const assets = ['Cash', 'Bonds', 'Broad equities'];
  const annualRates = [.02, .04, .07];
  const inflation = .03;
  const stages = ['Student years', 'First job', 'Independent living', 'Long-term planning'];
  const events = [
    { month: 12, name: 'Device repair', amount: -60 },
    { month: 24, name: 'Weekend project payment', amount: 90 },
    { month: 36, name: 'Moving supplies', amount: -80 },
  ];
  const scenarios = [
    { name: 'Positive earnings', event: 'Simulated company earnings improved', change: .03, cause: 'In this scenario, the company reported stronger earnings than expected.' },
    { name: 'Inflation concerns', event: 'Simulated inflation concerns', change: -.04, cause: 'In this scenario, investors expected inflation to raise costs and interest rates.' },
    { name: 'Market downturn', event: 'Simulated broad market downturn', change: -.08, cause: 'In this scenario, confidence fell across the sample market.' },
  ];
  const watchlist = [
    { name: 'Fern Labs', price: 100, exposure: 1 },
    { name: 'Harbor Foods', price: 60, exposure: .75 },
    { name: 'Meadow Market Index', price: 200, exposure: .5 },
  ];
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const sum = values => values.reduce((total, value) => total + value, 0);
  const stageAt = month => stages[Math.min(Math.floor(month / 12), stages.length - 1)];

  function advance(sim, months) {
    const balances = [...sim.balances];
    const impacts = [];
    let contributions = 0;
    for (let month = sim.month + 1; month <= sim.month + months; month++) {
      balances.forEach((balance, index) => {
        balances[index] = balance * (1 + annualRates[index]) ** (1 / 12) + sim.allowance * sim.weights[index] / 100;
      });
      contributions += sim.allowance;
      const event = events.find(item => item.month === month);
      if (!event) continue;
      const impact = event.amount < 0 ? Math.max(event.amount, -sum(balances)) : event.amount;
      if (impact < 0) {
        let remaining = -impact;
        balances.forEach((balance, index) => {
          const payment = Math.min(remaining, balance);
          balances[index] -= payment;
          remaining -= payment;
        });
      } else {
        balances[0] += impact;
      }
      impacts.push({ ...event, impact: round(impact) });
    }
    const month = sim.month + months;
    const nominal = round(sum(balances));
    const real = round(sum(balances) / (1 + inflation) ** (month / 12));
    const growth = round(nominal - sum(sim.balances) - contributions - sum(impacts.map(event => event.impact)));
    return { month, balances, nominal, real, impacts, contributions, growth };
  }

  function market(assetIndex, scenarioIndex, range) {
    const asset = watchlist[assetIndex];
    const scenario = scenarios[scenarioIndex];
    const change = scenario.change * (scenarioIndex === 2 ? 1 : asset.exposure);
    const end = round(asset.price * (1 + change));
    const shares = 10;
    const startingFunds = 10000;
    const cash = startingFunds - asset.price * shares;
    return {
      asset, scenario, change, end, shares, startingFunds, cash,
      total: round(cash + end * shares),
      impact: round((end - asset.price) * shares),
      eventDay: Math.ceil(range * .6),
    };
  }


  const startingCash = 10_000_000;
  const startingDay = 6;
  const stocks = [
    { ticker: 'FERN', name: 'Fern Labs', sector: 'Technology', description: 'Builds classroom software and digital tools for small businesses.', eps: 155, dividend: 0, prices: [2260, 2290, 2230, 2310, 2390, 2360, 2450, 2510, 2430, 2560, 2610, 2490, 2540, 2630, 2690] },
    { ticker: 'HBRF', name: 'Harbor Foods', sector: 'Consumer goods', description: 'Makes packaged foods and supplies neighborhood grocery stores.', eps: 140, dividend: 45, prices: [1840, 1810, 1825, 1850, 1835, 1880, 1840, 1810, 1860, 1900, 1885, 1910, 1865, 1900, 1940] },
    { ticker: 'BAYE', name: 'Bayline Energy', sector: 'Energy', description: 'Operates small renewable energy projects and sells electricity to utilities.', eps: 215, dividend: 75, prices: [3290, 3330, 3240, 3280, 3210, 3150, 3210, 3060, 3120, 3090, 3170, 3250, 3190, 3160, 3250] },
    { ticker: 'MDSA', name: 'Meadow Transit', sector: 'Industrials', description: 'Provides delivery and maintenance services for regional transit operators.', eps: 175, dividend: 60, prices: [2630, 2680, 2700, 2670, 2740, 2780, 2760, 2810, 2870, 2820, 2790, 2840, 2910, 2880, 2950] },
  ];
  const lastMarketDay = stocks[0].prices.length - 1;

  function newAccount() {
    return {
      cash: startingCash, day: startingDay, holdings: {}, trades: [], quoteTick: 0, quoteUpdatedAt: null,
      quotes: Object.fromEntries(stocks.map(stock => [stock.ticker, stock.prices[startingDay]])),
      quoteHistory: Object.fromEntries(stocks.map(stock => [stock.ticker, stock.prices.slice(0, startingDay + 1)])),
    };
  }

  function quotePrice(account, stock) {
    if (!stock || !Number.isInteger(account?.day) || account.day < 0 || account.day > lastMarketDay) return null;
    if (account.quotes !== undefined && (!account.quotes || typeof account.quotes !== 'object' || Array.isArray(account.quotes))) return null;
    const price = account.quotes === undefined ? stock.prices?.[account.day] : account.quotes[stock.ticker];
    return Number.isSafeInteger(price) && price > 0 ? price : null;
  }

  function quoteSeries(account, stock) {
    if (!stock || !Number.isInteger(account?.day) || account.day < 0 || account.day > lastMarketDay) return [];
    if (account.quoteHistory !== undefined && (!account.quoteHistory || typeof account.quoteHistory !== 'object' || Array.isArray(account.quoteHistory))) return [];
    const history = account.quoteHistory === undefined
      ? Array.isArray(stock.prices) ? stock.prices.slice(0, account.day + 1) : []
      : account.quoteHistory[stock.ticker];
    return Array.isArray(history) && history.every(price => Number.isSafeInteger(price) && price > 0) ? history.slice(-60) : [];
  }

  function advanceDemoQuotes(account, now) {
    if (!account || typeof account !== 'object') return account;
    const previousTick = account.quoteTick === undefined ? 0 : account.quoteTick;
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(previousTick) || previousTick < 0 || previousTick === Number.MAX_SAFE_INTEGER) return account;
    if (account.quoteUpdatedAt != null && (!Number.isSafeInteger(account.quoteUpdatedAt) || account.quoteUpdatedAt < 0 || now < account.quoteUpdatedAt)) return account;
    const quoteTick = previousTick + 1;
    const quotes = {};
    const quoteHistory = {};
    for (const [index, stock] of stocks.entries()) {
      const previous = quotePrice(account, stock);
      const history = quoteSeries(account, stock);
      if (previous === null || history.length === 0) return account;
      // Generated demo movements use steps from -0.9% to +0.9%; they are not market observations.
      const movement = ((quoteTick % 19) * 7 + index * 5) % 19 - 9;
      const price = Math.max(1, Math.round(previous * (1 + movement / 1000)));
      if (!Number.isSafeInteger(price)) return account;
      quotes[stock.ticker] = price;
      quoteHistory[stock.ticker] = [...history, price].slice(-60);
    }
    return { ...account, quoteTick, quoteUpdatedAt: now, quotes, quoteHistory };
  }

  function portfolio(account) {
    const positions = stocks.flatMap(stock => {
      const holding = account.holdings[stock.ticker];
      if (!holding?.quantity) return [];
      const price = quotePrice(account, stock);
      const markedValue = price === null ? null : holding.quantity * price;
      const value = Number.isSafeInteger(holding.quantity) && holding.quantity > 0 && Number.isSafeInteger(holding.basis) && holding.basis >= 0
        && Number.isSafeInteger(markedValue) && markedValue >= 0 ? markedValue : null;
      return [{ stock, ...holding, value, gain: value === null ? null : value - holding.basis }];
    });
    const markedInvested = positions.some(position => position.value === null) ? null : sum(positions.map(position => position.value));
    const invested = Number.isSafeInteger(markedInvested) && markedInvested >= 0 ? markedInvested : null;
    const markedTotal = invested === null ? null : account.cash + invested;
    const total = Number.isSafeInteger(account.cash) && account.cash >= 0 && Number.isSafeInteger(markedTotal) ? markedTotal : null;
    return { positions, invested, total, gain: total === null ? null : total - startingCash, sectors: new Set(positions.map(position => position.stock.sector)).size };
  }

  function executeTrade(account, ticker, side, quantity, timestamp) {
    const stock = stocks.find(item => item.ticker === ticker);
    if (!stock || !['buy', 'sell'].includes(side)) return { error: 'Choose a stock and order type.' };
    if (!Number.isSafeInteger(quantity) || quantity < 1) return { error: 'Enter a whole number of shares greater than zero.' };

    const price = quotePrice(account, stock);
    const quoteTick = account?.quoteTick === undefined ? 0 : account.quoteTick;
    if (price === null || !Number.isSafeInteger(quoteTick) || quoteTick < 0) return { error: 'The simulated quote is unavailable. Review the market before trading.' };
    if (!Number.isSafeInteger(timestamp) || timestamp < 0 || !Number.isSafeInteger(account.cash) || account.cash < 0 || !account.holdings || !Array.isArray(account.trades)) return { error: 'The practice account could not be validated.' };
    const value = quantity * price;
    const held = account.holdings[ticker] ?? { quantity: 0, basis: 0 };
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(held.quantity) || held.quantity < 0 || !Number.isSafeInteger(held.basis) || held.basis < 0) return { error: 'This order exceeds the supported practice amounts.' };
    if (side === 'buy' && value > account.cash) return { error: 'This order exceeds your virtual cash balance.' };
    if (side === 'sell' && quantity > held.quantity) return { error: 'This order exceeds the shares you own.' };

    const holdings = { ...account.holdings };
    const remaining = held.quantity + (side === 'buy' ? quantity : -quantity);
    const cash = account.cash + (side === 'buy' ? -value : value);
    if (!Number.isSafeInteger(remaining) || !Number.isSafeInteger(cash) || (side === 'sell' && !Number.isSafeInteger(held.basis * remaining))) return { error: 'This order exceeds the supported practice amounts.' };
    if (remaining === 0) delete holdings[ticker];
    else {
      const basis = side === 'buy' ? held.basis + value : Math.round(held.basis * remaining / held.quantity);
      if (!Number.isSafeInteger(basis)) return { error: 'This order exceeds the supported practice amounts.' };
      holdings[ticker] = { quantity: remaining, basis };
    }
    const trade = { ticker, side, quantity, price, value, timestamp, day: account.day, quoteTick };
    return {
      account: {
        ...account,
        cash,
        holdings,
        trades: [trade, ...account.trades],
      },
      trade,
    };
  }

  const courses = [
    {
      id: 'stocks', title: 'Introduction to Stocks', level: 'Beginner', group: 'Start with the basics', minutes: 4,
      description: 'Understand what a share represents and what owning one can mean.',
      objectives: ['Explain ownership in shares', 'Calculate a simple ownership percentage', 'Recognize that returns are uncertain'],
      takeaways: ['A share is a claim on part of a business.', 'Ownership percentage depends on total shares outstanding.', 'Share prices and dividend payments can change.'],
      watchout: 'A familiar company can still be a risky investment. A low share price alone does not make it cheap.',
      reflection: { prompt: 'A fictional business has 200 equal shares. You own 5. What percentage do you own?', answer: '5 ÷ 200 × 100 = 2.5%. This describes your ownership, not a guaranteed share-price return.' },
      visual: { kind: 'stocks', title: 'See what one share means', caption: 'A fictional company split into 100 equal shares. Each square is one share; the highlighted square is your 1% ownership.' },
      sections: [
        ['A small piece of a business', 'A stock is a unit of ownership in a company. If a company had 100 equal shares and you owned one, your share would represent 1% of the company.'],
        ['What ownership can change', 'A shareholder can benefit when the share price rises or the company pays a dividend. The share can also lose value if expectations change.'],
      ],
      example: { title: 'One share out of 100', caption: 'Your share represents 1% ownership in this simplified example.', bars: [['Your share', 1, '1 share'], ['Other shareholders', 99, '99 shares']] },
      questions: [
        { prompt: 'What does one share of stock represent?', choices: ['A small ownership stake', 'A guaranteed payment', 'A loan from a bank'], answer: 0, why: 'A share is a unit of ownership in a business.' },
        { prompt: 'Owning a share guarantees that its price will rise.', choices: ['True', 'False'], answer: 1, why: 'Share prices can rise or fall as expectations and demand change.' },
      ],
    },
    {
      id: 'prices', title: 'Stock Prices and Market Mechanics', level: 'Beginner', group: 'Start with the basics', minutes: 5,
      description: 'See how buyers and sellers arrive at a traded price.',
      objectives: ['Read a bid and an ask', 'Explain the spread', 'Distinguish a quote from a filled trade'],
      takeaways: ['The bid is a quoted buying price; the ask is a quoted selling price.', 'Ask minus bid is the spread.', 'A displayed quote can change before your order fills.'],
      watchout: 'A market order does not guarantee a particular execution price. A limit order controls price but may not fill.',
      reflection: { prompt: 'The displayed ask is Rp1,010. Is your next market buy guaranteed to fill at Rp1,010?', answer: 'No. Available shares and prices may change before execution. Review the order type, available liquidity, and final fill.' },
      visual: { kind: 'prices', title: 'Two sides of a quote', caption: 'Hypothetical bid Rp990 and ask Rp1,010: a Rp20 spread per share. These are example quotes, not live orders.' },
      sections: [
        ['How a trade gets a price', 'A trade happens when a buyer and seller agree on a price. A price on a chart usually reflects a transaction or a recorded quote at a point in time.'],
        ['Why the next trade may differ', 'New information, changing expectations, and the number of buyers and sellers can affect the next trade. Our simulator generates changing example prices for practice.'],
      ],
      example: { title: 'Two practice trades', caption: 'The second trade happened at a higher price. One trade alone tells us little about the next one.', bars: [['First trade', 1000, 'Rp1,000'], ['Second trade', 1050, 'Rp1,050']] },
      questions: [
        { prompt: 'What can change the price of the next trade?', choices: ['The previous price guarantees it', 'A change in supply and demand', 'The company name alone'], answer: 1, why: 'Prices can move as buyers and sellers adjust what they will pay or accept.' },
        { prompt: 'A price chart tells you exactly why each trade occurred.', choices: ['True', 'False'], answer: 1, why: 'The chart records prices. An explanation of causes needs evidence from other sources.' },
      ],
    },
    {
      id: 'returns', title: 'Dividends and Capital Gains', level: 'Beginner', group: 'Start with the basics', minutes: 5,
      description: 'Separate a company payment from a change in the value of a share.',
      objectives: ['Separate dividends from price gains', 'Distinguish realized and unrealized gains', 'Include costs in a return calculation'],
      takeaways: ['Selling above the purchase price realizes a capital gain.', 'A paid cash dividend is separate from the sale proceeds.', 'Fees and taxes can reduce the amount you keep.'],
      watchout: 'Dividends are not guaranteed and do not create free money. The share price may adjust around a distribution.',
      reflection: { prompt: 'Buy one share for Rp2,000, receive Rp50, then sell for Rp1,900 with Rp20 total costs. What is the result before tax?', answer: 'Rp1,900 − Rp2,000 + Rp50 − Rp20 = −Rp70. Receiving a dividend did not prevent an overall loss.' },
      visual: { kind: 'returns', title: 'Follow every part of the return', caption: 'Hypothetical one-share example: Rp2,200 sale − Rp2,000 purchase + Rp50 dividend − Rp20 total costs = Rp230 net gain before tax.' },
      sections: [
        ['Two ways a holding can change in value', 'A dividend is a payment that a company may make to shareholders. A capital gain occurs when a share is sold above its purchase price.'],
        ['Unrealized gains and losses', 'An increase in the value of a share you still hold is an unrealized gain. It can change before you sell. A company may also reduce or stop a dividend.'],
      ],
      example: { title: 'A sale above the purchase price', caption: 'The difference is Rp200 before any fees. If you still own the share, the gain is unrealized.', bars: [['Purchase price', 2000, 'Rp2,000'], ['Sale price', 2200, 'Rp2,200']] },
      questions: [
        { prompt: 'You buy a share for Rp2,000 and sell it for Rp2,200. What is the gain before fees?', choices: ['Rp2,200', 'Rp2,000', 'Rp200'], answer: 2, why: 'Subtract the purchase price from the sale price.' },
        { prompt: 'A company can change or stop its dividend.', choices: ['True', 'False'], answer: 0, why: 'Dividend decisions can change with the company’s finances and plans.' },
      ],
    },
    {
      id: 'risk', title: 'Investment Risks', level: 'Beginner', group: 'Build a portfolio', minutes: 6,
      description: 'Spot common risks before you interpret a price or build a portfolio.',
      objectives: ['Identify different sources of risk', 'Connect risk with when you need cash', 'Recognize that losses can be permanent'],
      takeaways: ['Volatility describes fluctuations, not every possible risk.', 'Selling to meet a near-term expense can lock in a loss.', 'A longer time horizon does not guarantee recovery.'],
      watchout: 'A past recovery is not a promise. A business can fail, and investments can lose their entire value.',
      reflection: { prompt: 'You need tuition money next month. Your shares fall 20%. What makes that deadline relevant?', answer: 'You may have to sell while the price is down to pay the bill. Review how much money must remain accessible and how much loss you could absorb.' },
      visual: { kind: 'risk', title: 'A deadline can change the decision', caption: 'Illustrative price decline, not historical market data. Needing cash during the drop can force a sale; a later recovery is not assumed.' },
      sections: [
        ['Risk takes several forms', 'A company can disappoint, an entire market can fall, inflation can erode buying power, and a share may be hard to sell quickly. Concentration adds exposure to one company or sector.'],
        ['Consider when you need the money', 'The same price drop can matter more when you need the money soon. A practice portfolio lets you explore that trade-off with virtual funds.'],
      ],
      example: { title: 'One company can move the whole portfolio', caption: 'Compare how much of each sample portfolio depends on the largest holding.', bars: [['Concentrated portfolio', 90, '90%'], ['More spread out', 30, '30%']] },
      questions: [
        { prompt: 'What risk rises when almost all of a portfolio is in one company?', choices: ['Concentration risk', 'The chance of a guaranteed gain', 'The dividend rate'], answer: 0, why: 'One company’s performance affects most of the portfolio.' },
        { prompt: 'What does liquidity risk mean?', choices: ['Prices are always falling', 'You may struggle to sell at a reasonable price when needed', 'A stock pays dividends'], answer: 1, why: 'A lack of willing buyers can make a quick sale difficult.' },
        { prompt: 'Inflation can reduce the buying power of an unchanged balance.', choices: ['True', 'False'], answer: 0, why: 'The same balance buys less when prices rise.' },
        { prompt: 'What kind of risk can affect many companies at once?', choices: ['Market risk', 'The risk of a typing error', 'A single product recall'], answer: 0, why: 'A broad downturn can affect many sectors together.' },
        { prompt: 'A product recall at one company is mainly an example of what?', choices: ['Company-specific risk', 'Guaranteed market growth', 'A dividend policy'], answer: 0, why: 'The problem directly affects that company and may hurt its business.' },
      ],
    },
    {
      id: 'diversification', title: 'Portfolio Diversification', level: 'Beginner', group: 'Build a portfolio', minutes: 5,
      description: 'Explore how spreading holdings can change where your risk comes from.',
      objectives: ['Read portfolio weights', 'Spot overlapping exposures', 'Distinguish sector spread from asset allocation'],
      takeaways: ['Count position sizes as well as the number of holdings.', 'Different stock names may depend on the same industry.', 'Diversified investments can still decline together.'],
      watchout: 'The sample 50/30/20 mix illustrates weights. It is not a recommended allocation or protection from loss.',
      reflection: { prompt: 'You own three funds, but all have the same technology companies as their largest holdings. Are you broadly diversified?', answer: 'Not necessarily. Look through each fund to its underlying holdings and weights, then check sector, asset-class, and geographic overlap.' },
      visual: { kind: 'diversification', title: 'Look inside the portfolio', caption: 'A hypothetical equity portfolio: Technology 50%, Consumer goods 30%, Energy 20%. Three sectors still leave half the investment in Technology.' },
      sections: [
        ['Spread exposure across different businesses', 'Diversification spreads holdings across investments that depend on different factors. Owning several companies in the same sector can still leave you exposed to one industry.'],
        ['Check the weights', 'A portfolio can have many holdings and still depend heavily on its largest one. Broad market drops can affect diversified portfolios too.'],
      ],
      example: { title: 'Three sectors, different weights', caption: 'This example spreads exposure, though Technology still represents half of the investment.', bars: [['Technology', 50, '50%'], ['Consumer goods', 30, '30%'], ['Energy', 20, '20%']] },
      questions: [
        { prompt: 'Which choice spreads sector exposure the most?', choices: ['Three software companies', 'One large technology stock', 'One company in each of three sectors'], answer: 2, why: 'Holding companies across sectors spreads industry-specific exposure.' },
        { prompt: 'Diversification prevents all losses.', choices: ['True', 'False'], answer: 1, why: 'Many investments can fall together, especially during a broad market decline.' },
      ],
    },
    {
      id: 'fundamentals', title: 'Fundamental Analysis', level: 'Intermediate', group: 'Read the market', minutes: 7,
      description: 'Look at a business’s revenue, earnings, and valuation.',
      objectives: ['Separate revenue from earnings', 'Calculate a simple P/E ratio', 'Compare businesses using context'],
      takeaways: ['Revenue is sales before expenses; earnings remain after expenses.', 'P/E divides share price by earnings per share.', 'Compare the same reporting period and similar businesses.'],
      watchout: 'A low P/E does not prove a bargain. Negative or unusually high one-off earnings can make the ratio misleading.',
      reflection: { prompt: 'Two companies have P/E ratios of 10× and 20×. Can you conclude that the first is the better investment?', answer: 'No. Check the industry, earnings quality, growth, debt, cash flow, and reporting period. A single ratio cannot resolve the whole decision.' },
      visual: { kind: 'fundamentals', title: 'From sales to earnings', caption: 'Simplified fictional figures for one period. Rp1,000,000 revenue − Rp800,000 total expenses = Rp200,000 earnings. Separately, Rp2,000 price ÷ Rp100 EPS = 20× P/E.' },
      sections: [
        ['Start with the business', 'Revenue is money a business earns from sales before expenses. Earnings are what remains after expenses. Comparing those figures over time helps you ask better questions about performance.'],
        ['Use ratios as context', 'The price-to-earnings ratio divides share price by earnings per share. It can be a useful comparison within an industry. Growth, debt, and how earnings were measured also matter.'],
      ],
      example: { title: 'Calculate a P/E ratio', caption: 'A Rp2,000 share price divided by Rp100 earnings per share gives a P/E of 20×.', bars: [['Share price', 2000, 'Rp2,000'], ['Earnings per share', 100, 'Rp100']] },
      questions: [
        { prompt: 'Which two inputs produce the P/E ratio?', choices: ['Share price and earnings per share', 'Revenue and share count', 'Dividends and cash'], answer: 0, why: 'P/E equals share price divided by earnings per share.' },
        { prompt: 'A low P/E by itself proves a share is undervalued.', choices: ['True', 'False'], answer: 1, why: 'A low ratio can reflect weaker expectations, risk, or a temporary jump in earnings.' },
      ],
    },
    {
      id: 'technical', title: 'Technical Analysis Basics', level: 'Intermediate', group: 'Read the market', minutes: 6,
      description: 'Read trends, volume, and volatility in a price chart.',
      objectives: ['Read the chart’s time window and axes', 'Separate price from trading volume', 'Describe a pattern without predicting a return'],
      takeaways: ['A price line and volume bars measure different things.', 'Changing the time window changes the pattern you see.', 'Indicators summarize past data and can disagree.'],
      watchout: 'A rising line or high volume is not a buy signal by itself. Chart patterns do not guarantee future results.',
      reflection: { prompt: 'A sample price rises while volume falls. What can you state confidently?', answer: 'Describe the observations: price rose in that period and fewer shares traded. The chart alone cannot establish the cause or guarantee the next price move.' },
      visual: { kind: 'technical', title: 'Read price and volume separately', caption: 'Generated illustration with separate price and volume panels. The horizontal axis is time; volume counts shares, not money. No future movement is predicted.' },
      sections: [
        ['Look at the time window', 'A trend describes the overall direction of prices in the period you selected. A chart may look different when you change the time window.'],
        ['Understand volume and volatility', 'Volume counts how many units traded. Volatility describes how much prices move. A chart can help you describe a pattern and ask a question about it.'],
      ],
      example: { title: 'Volume across three days', caption: 'Day 3 had the most trading in this example. Volume alone cannot tell you the next price.', bars: [['Day 1', 150, '150 shares'], ['Day 2', 120, '120 shares'], ['Day 3', 260, '260 shares']] },
      questions: [
        { prompt: 'What does trading volume measure?', choices: ['Number of units traded', 'Next day’s return', 'Total company debt'], answer: 0, why: 'Volume measures units traded during a period.' },
        { prompt: 'A pattern on a past chart guarantees it will repeat.', choices: ['True', 'False'], answer: 1, why: 'Market conditions and the reasons for trades change.' },
      ],
    },
    {
      id: 'compounding', title: 'Compounding Over Time', level: 'Beginner', group: 'Plan for the long term', minutes: 5,
      description: 'Follow how earlier gains can change the amount that earns a return next year.',
      objectives: ['Distinguish simple and compound growth', 'Calculate two years of hypothetical growth', 'Identify the assumptions behind a projection'],
      sections: [
        ['Start with the amount you have', 'In a simplified example, Rp1,000,000 growing by 5% adds Rp50,000 in the first year. If you keep that gain invested, the next year starts from Rp1,050,000.'],
        ['Let the base change', 'A second 5% gain adds Rp52,500 because it applies to the larger balance. That extra Rp2,500 is the gain on the first year’s gain. The same arithmetic applies when returns are negative.'],
        ['Check the assumptions', 'Actual investments can have uneven returns, losses, fees, and withdrawals. Use a compound calculator to compare assumptions, then describe the result as a scenario.'],
      ],
      example: { bars: [['After year 1', 50000, 'Rp50,000'], ['After year 2', 102500, 'Rp102,500'], ['After year 3', 157625, 'Rp157,625']] },
      visual: { kind: 'compounding', title: 'Growth above the starting amount', caption: 'At a hypothetical 5% annual return on Rp1,000,000, cumulative gains are Rp50,000 after one year, Rp102,500 after two, and Rp157,625 after three. No deposits, withdrawals, taxes, or costs.' },
      takeaways: ['Reinvested gains can add to next year’s starting balance.', 'Changing the time or rate changes the outcome.', 'A projected balance depends on its assumptions.'],
      watchout: 'The fixed rate is an example. It does not promise a stock market return.',
      reflection: { prompt: 'If you withdraw the Rp50,000 first-year gain, how much would a 5% gain add in year two?', answer: 'Rp50,000. Year two would start at Rp1,000,000 again, so the first year’s gain would not earn a return.' },
      questions: [
        { prompt: 'What makes a gain compound?', choices: ['A previous gain remains in the amount earning a return', 'The rate must rise every year', 'Every gain is withdrawn'], answer: 0, why: 'Compounding applies a rate to the updated balance, which can include earlier gains.' },
        { prompt: 'Rp1,000,000 grows 5% per year for two years. What is the ending amount before costs?', choices: ['Rp1,102,500', 'Rp1,100,000', 'Rp1,052,500'], answer: 0, why: 'Multiply Rp1,000,000 by 1.05 twice to get Rp1,102,500.' },
      ],
    },
    {
      id: 'inflation', title: 'Inflation and Buying Power', level: 'Beginner', group: 'Plan for the long term', minutes: 5,
      description: 'Compare a balance in rupiah with what it can buy.',
      objectives: ['Explain inflation in everyday terms', 'Separate nominal value from purchasing power', 'Compare a growth rate with rising prices'],
      sections: [
        ['Look at the price of a basket', 'Inflation measures a broad increase in prices over a period. One item can rise faster, stay flat, or fall while an overall price index rises.'],
        ['Compare the same basket over time', 'If the same items cost Rp1,000,000 last year and Rp1,050,000 now, their price increased 5%. An unchanged balance cannot buy the whole basket this year.'],
        ['Translate balances into earlier prices', 'For the simplified 5% price increase, divide today’s Rp1,000,000 by 1.05. Its buying power is about Rp952,381 in last year’s prices.'],
      ],
      example: { bars: [['Earlier basket cost', 1000000, 'Rp1,000,000'], ['Later basket cost', 1050000, 'Rp1,050,000']] },
      visual: { kind: 'inflation', title: 'The same basket costs more', caption: 'The example basket rises from Rp1,000,000 to Rp1,050,000, a 5% increase. Check Bank Indonesia for published inflation data.' },
      takeaways: ['The number on a balance and its buying power can move differently.', 'Inflation measures a basket, so personal spending can differ.', 'Use comparable periods when comparing returns with inflation.'],
      watchout: 'Do not substitute one product’s price change for a published inflation rate.',
      reflection: { prompt: 'Your balance grows 5% while the same basket also costs 5% more. Did your basket buying power increase?', answer: 'It stayed the same in this simplified example: both the amount available and the basket cost grew at the same rate.' },
      questions: [
        { prompt: 'A balance is unchanged while the same basket costs more. What happens to its buying power?', choices: ['It falls', 'It rises', 'It always stays the same'], answer: 0, why: 'The same amount of money can buy less of the basket at higher prices.' },
        { prompt: 'Does inflation require every individual price to rise?', choices: ['No', 'Yes'], answer: 0, why: 'Inflation describes the overall change in a basket, not every individual price.' },
      ],
    },
    {
      id: 'costs', title: 'Fees and Net Returns', level: 'Beginner', group: 'Plan for the long term', minutes: 5,
      description: 'Compare what an investment earns with what remains after costs.',
      objectives: ['Distinguish gross and net gains', 'Identify one-time and ongoing costs', 'Compare two hypothetical fee schedules'],
      sections: [
        ['Separate earnings and costs', 'A gross gain is measured before the costs in the comparison. A net gain subtracts those costs. Check whether a reported result also includes taxes.'],
        ['Read when costs apply', 'Some fees are charged when you trade. Others are ongoing and may depend on the account or fund value. Compare the costs over the same period and for the same amount.'],
        ['Connect costs to compounding', 'Money deducted in fees is no longer part of the invested balance. Over several years, compare both the fees paid and the growth those amounts could have earned.'],
      ],
      example: { bars: [['Before fees', 50000, 'Rp50,000'], ['After Rp10,000 fee', 40000, 'Rp40,000'], ['After Rp20,000 fee', 30000, 'Rp30,000']] },
      visual: { kind: 'costs', title: 'Same gross gain, different net gain', caption: 'Two hypothetical accounts each gain Rp50,000 in one year before fees. With total costs of Rp10,000 and Rp20,000, the net gains are Rp40,000 and Rp30,000 before tax.' },
      takeaways: ['Read the fee schedule and what a quoted return includes.', 'Compare the same time period and starting amount.', 'Small ongoing fees can add up and reduce future compounding.'],
      watchout: 'Lower fees are one comparison factor. Compare the risk and services as well.',
      reflection: { prompt: 'Two comparable products both show Rp50,000 of gross gain. One costs Rp10,000 and the other Rp20,000. How much more net gain does the lower-cost example retain?', answer: 'Rp10,000 more before taxes: Rp40,000 instead of Rp30,000. This isolates costs, assuming the same gain.' },
      questions: [
        { prompt: 'What is the net gain before tax if gross gain is Rp50,000 and total fees are Rp10,000?', choices: ['Rp40,000', 'Rp60,000', 'Rp10,000'], answer: 0, why: 'Subtract the stated fees from the gross gain.' },
        { prompt: 'Why can an ongoing fee affect later growth?', choices: ['Less money remains invested to earn a return', 'Fees guarantee a larger balance', 'Fees are always paid by someone else'], answer: 0, why: 'A fee reduces the amount available to compound.' },
      ],
    },
  ];

  const academyTracks = [
    { id: 'stock-essentials', title: 'Stock Market Essentials', description: 'Understand shares, follow a trade from quote to fill, and calculate what a holding earned.', level: 'Beginner', art: 'academy', lessons: ['stocks', 'prices', 'returns'] },
    { id: 'portfolio-risk', title: 'Portfolio & Risk', description: 'Identify the risks you take and read where a portfolio is concentrated.', level: 'Beginner', art: 'market', lessons: ['risk', 'diversification'] },
    { id: 'market-research', title: 'Company Research & Charts', description: 'Read earnings and valuation figures, then interpret price and volume without jumping to a forecast.', level: 'Intermediate', art: 'news', lessons: ['fundamentals', 'technical'] },
    { id: 'long-term', title: 'Long-Term Investing', description: 'See how growth, rising prices, and fees change what an investment can buy over time.', level: 'Beginner', art: 'missions', lessons: ['compounding', 'inflation', 'costs'] },
  ];
  const academyPointsPerLesson = 10;
  const academyMilestones = [
    { points: 20, title: 'First Steps', xp: 20 },
    { points: 50, title: 'Building Knowledge', xp: 30 },
    { points: 80, title: 'Market Reader', xp: 40 },
    { points: 100, title: 'Well-Rounded Learner', xp: 50 },
  ];

  const quizzes = [
    ...courses,
    {
      id: 'sentiment', title: 'News Sentiment', level: 'Beginner',
      description: 'Classify the direction of news and explain what the label can tell you.',
      questions: [
        { prompt: 'A central bank holds its policy rate steady while noting uncertainty. Which label fits the decision itself?', choices: ['Positive', 'Neutral', 'Negative'], answer: 1, why: 'The rate decision is unchanged. The surrounding economic risks can be discussed separately.' },
        { prompt: 'A positive headline guarantees that a related stock will rise.', choices: ['True', 'False'], answer: 1, why: 'The headline is one input. Expectations and other information can also affect prices.' },
      ],
    },
    {
      id: 'market-analyst', title: 'Fact vs. Opinion', level: 'Beginner',
      description: 'Separate a verifiable report from a prediction.',
      questions: [
        { prompt: 'Which statement can be checked against a published rate decision?', choices: ['Investors will definitely be happier tomorrow', 'The central bank kept its policy rate unchanged', 'Every related share is a bargain'], answer: 1, why: 'An official release can verify the rate decision. The other choices are judgments or predictions.' },
        { prompt: 'An economic forecast describes a possible outcome under stated assumptions.', choices: ['True', 'False'], answer: 0, why: 'A forecast is an estimate. It can change when its assumptions or data change.' },
      ],
    },
  ];

  const quizCounts = [5, 10, 15];
  const quizPacks = [
    {
      id: 'stocks-101', title: 'Stock Basics', icon: 'academy',
      description: 'Understand stock ownership, dividends, and changes in value.',
      concepts: [
        'A share represents part ownership in a company.',
        'Companies can issue new shares to raise money for the business.',
        'Share prices can rise or fall, and dividends are not guaranteed.',
      ],
      questions: [
        { prompt: 'What do you own when you buy a share of a company?', choices: ['A guaranteed payment from the company', 'Part ownership in the company', 'The right to take company property', 'A savings balance with fixed interest'], answer: 1, why: 'A share represents part ownership in a company. It does not guarantee a fixed payment.', tag: 'Ownership' },
        { prompt: 'Why might a company issue new shares?', choices: ['To keep its share price fixed', 'To guarantee a profit for shareholders', 'To raise money for the business', 'To stop selling products'], answer: 2, why: 'Selling new shares can raise capital, for example to expand the business.', tag: 'Raising capital' },
        { prompt: 'What is a payment a company may distribute to its shareholders called?', choices: ['A dividend', 'Inflation', 'Personal debt', 'The purchase price'], answer: 0, why: 'A dividend is a distribution to shareholders. Payment policies vary by company.', tag: 'Dividends' },
        { prompt: 'Every stock pays a dividend each month.', choices: ['True', 'False'], answer: 1, why: 'Some companies do not pay dividends. Those that do can follow different payment schedules.', tag: 'Dividends' },
        { prompt: 'In a fictional trade, a share bought for Rp10,000 is sold for Rp12,000. What is the change before fees and taxes?', choices: ['Rp2,000 loss', 'No change', 'Rp12,000 gain', 'Rp2,000 gain'], answer: 3, why: 'Subtract the purchase price from the sale price: Rp12,000 − Rp10,000 = Rp2,000.', tag: 'Change in value' },
      ],
    },
    {
      id: 'risk-and-return', title: 'Risk Detective', icon: 'missions',
      description: 'Spot losses, uncertainty, and concentration in a portfolio.',
      concepts: [
        'Investment values can change, and returns are uncertain.',
        'Putting all your money into one company increases your exposure to that company.',
        'Diversification spreads exposure, but losses remain possible.',
      ],
      questions: [
        { prompt: 'A virtual investment falls from Rp100,000 to Rp80,000 without any deposits or withdrawals. What happened?', choices: ['It fell by Rp80,000', 'It rose by Rp20,000', 'It fell by Rp20,000', 'It stayed at Rp100,000'], answer: 2, why: 'Rp100,000 minus Rp80,000 is Rp20,000. An investment can lose value without a withdrawal.', tag: 'Investment losses' },
        { prompt: 'Rani puts all her virtual money into one company. What risk stands out?', choices: ['Her result depends heavily on one company', 'She owns too many types of investment', 'She has removed market risk', 'Her result is the same as holding many companies'], answer: 0, why: 'A portfolio concentrated in one company is more exposed to problems at that company.', tag: 'Concentration' },
        { prompt: 'Which statement about diversification is correct?', choices: ['It guarantees there are no losses', 'It makes all investments rise together', 'It means holding one famous company', 'It spreads exposure while some risk remains'], answer: 3, why: 'Diversification can reduce dependence on any single investment. It cannot prevent all losses.', tag: 'Diversification' },
        { prompt: 'A riskier investment always delivers a bigger gain.', choices: ['True', 'False'], answer: 1, why: 'A higher potential return is not a guarantee. Taking more risk can also lead to a larger loss.', tag: 'Uncertainty' },
        { prompt: 'A chart that rose for several days proves the price will rise tomorrow.', choices: ['True', 'False'], answer: 1, why: 'Past price changes do not settle future outcomes. New information and market conditions can change prices.', tag: 'Past performance' },
      ],
    },
    {
      id: 'facts-and-news', title: 'Facts, Opinions & News', icon: 'news',
      description: 'Separate verifiable claims, opinions, and predictions in market stories.',
      concepts: [
        'A factual claim can be checked against evidence.',
        'An opinion expresses a judgment. A prediction describes something that has not happened.',
        'A positive headline cannot establish how a share price will move.',
      ],
      questions: [
        { prompt: 'Which statement is a factual claim you could check against a source?', choices: ['I find this company the most interesting', 'The company reported Rp20 billion in annual revenue', 'This stock will definitely be the best choice next year', 'I prefer this brand to its competitors'], answer: 1, why: 'You can compare reported revenue with an annual report. Being checkable does not make the claim proven.', tag: 'Factual claims' },
        { prompt: 'Which statement expresses a personal opinion?', choices: ['The invitation says the meeting starts at 10 a.m.', 'The report lists 120 stores at year-end', 'The recorded closing price was Rp1,500', 'I think this company has the most attractive product design'], answer: 3, why: 'The final statement expresses someone’s judgment. The other claims could be checked against records.', tag: 'Opinion' },
        { prompt: 'A positive headline is enough to guarantee that a stock will rise.', choices: ['True', 'False'], answer: 1, why: 'A headline’s tone does not determine a stock price. Other information and market expectations matter.', tag: 'Headlines and prices' },
        { prompt: 'Fictional news: “A company opened new stores, but costs rose and profit fell.” How would you describe the news?', choices: ['Mixed: expansion alongside pressure on profit', 'Only positive: nothing else changed', 'Only negative: no positive development', 'Neutral: the excerpt describes no changes'], answer: 0, why: 'Opening stores and falling profit point in different directions. Reading both gives a more complete picture.', tag: 'Context' },
        { prompt: 'A screenshot claims “the price will rise tomorrow” without a date or source. What should you check first?', choices: ['Whether it was shared many times', 'Whether you like the company', 'The original source, date, and evidence', 'Whether sharing it will make others agree'], answer: 2, why: 'The original source, timing, and evidence help you assess the claim. Popularity is not verification.', tag: 'Checking sources' },
      ],
    },
  ];

  function validateQuizQuestions(questions, count) {
    if (!quizCounts.includes(count) || !Array.isArray(questions) || questions.length !== count) return null;
    const cleanText = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit ? value.trim() : null;
    const comparable = value => value.toLowerCase().replace(/\s+/g, ' ');
    const seen = new Set();
    const clean = [];
    for (const item of questions) {
      const prompt = cleanText(item?.prompt, 500);
      const why = cleanText(item?.why, 600);
      const tag = cleanText(item?.tag, 64);
      if (!prompt || !why || !tag || seen.has(comparable(prompt)) || !Array.isArray(item.choices) || ![2, 4].includes(item.choices.length)) return null;
      const choices = item.choices.map(choice => cleanText(choice, 240));
      if (choices.some(choice => !choice) || new Set(choices.map(comparable)).size !== choices.length) return null;
      if (choices.length === 2 && choices.map(comparable).sort().join('|') !== 'false|true') return null;
      if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer >= choices.length) return null;
      seen.add(comparable(prompt));
      clean.push({ prompt, choices, answer: item.answer, why, tag });
    }
    return clean;
  }

  function scoreQuiz(questions, answers) {
    if (!Array.isArray(questions) || !quizCounts.includes(questions.length) || !Array.isArray(answers) || answers.length !== questions.length) return null;
    let correct = 0;
    for (const [index, question] of questions.entries()) {
      const answer = answers[index];
      if (!Array.isArray(question?.choices) || !Number.isInteger(answer) || answer < 0 || answer >= question.choices.length) return null;
      if (answer === question.answer) correct++;
    }
    const total = questions.length;
    return { correct, total, score: Math.round(correct * 100 / total), passed: correct * 5 >= total * 4 };
  }

  const news = [
    {
      id: 'rates', publisher: 'Bank Indonesia', date: '2026-01-21', topic: 'Interest rates', sentiment: 'Neutral',
      title: 'Bank Indonesia keeps its policy rate at 4.75%',
      summary: 'Bank Indonesia held its main policy rate steady in January 2026. The release describes a balance between supporting economic growth and keeping the rupiah stable.',
      reasoning: 'The policy rate itself stayed the same. That supports a neutral reading of the decision, even though the release also describes economic risks and goals.',
      url: 'https://www.bi.go.id/id/publikasi/ruang-media/news-release/pages/sp_281326.aspx',
    },
    {
      id: 'indonesia-growth', publisher: 'World Bank', date: '2025-12-17', topic: 'Indonesia economy', sentiment: 'Positive',
      title: 'World Bank reports resilient growth in Indonesia',
      summary: 'The report put Indonesian growth at 5% over the first nine months of 2025. Investment and net exports helped support the outlook, while the report also noted challenges in the job market.',
      reasoning: 'The growth and investment figures support a positive reading of economic resilience. The labor-market findings add context to that reading.',
      url: 'https://www.worldbank.org/en/news/press-release/2025/12/16/indonesia-s-economy-maintains-resilience-amid-global-uncertainty',
    },
    {
      id: 'global-growth', publisher: 'International Monetary Fund', date: '2025-04-22', topic: 'Global economy', sentiment: 'Negative',
      title: 'IMF lowers its global growth outlook',
      summary: 'The April 2025 report lowered global growth forecasts from its January update amid higher tariffs and uncertainty about trade policy.',
      reasoning: 'The downgrade and the increased risks support a negative reading of the outlook in this report. The forecast was an estimate at the time of publication.',
      url: 'https://www.imf.org/en/publications/weo/issues/2025/04/22/world-economic-outlook-april-2025',
    },
  ];


  const academySources = {
  "stocks": [
    {
      "title": "Stocks: Ownership, Benefits, and Risks",
      "publisher": "SEC · Investor.gov",
      "description": "Ownership, share classes, potential benefits, and risks.",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks"
    }
  ],
  "prices": [
    {
      "title": "Executing an Order",
      "publisher": "SEC · Investor.gov",
      "description": "How an order reaches the market and why execution prices can change.",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/executing-order"
    },
    {
      "title": "Types of Orders",
      "publisher": "SEC · Investor.gov",
      "description": "Compare market orders, limit orders, and stop orders.",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders"
    }
  ],
  "returns": [
    {
      "title": "Dividends",
      "publisher": "SEC · Investor.gov",
      "description": "The meaning of a distribution to shareholders.",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/glossary/dividend"
    },
    {
      "title": "Capital Gains",
      "publisher": "SEC · Investor.gov",
      "description": "Understand the difference between purchase and sale prices.",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/glossary/capital-gain"
    }
  ],
  "risk": [
    {
      "title": "What Is Investment Risk?",
      "publisher": "SEC · Investor.gov",
      "description": "Business, volatility, inflation, liquidity, and other investment risks.",
      "url": "https://www.investor.gov/introduction-investing/investing-basics/what-risk"
    }
  ],
  "diversification": [
    {
      "title": "Asset Allocation and Diversification",
      "publisher": "SEC · Investor.gov",
      "description": "Time horizon, position weights, and the spread across and within asset classes.",
      "url": "https://www.investor.gov/introduction-investing/getting-started/asset-allocation"
    }
  ],
  "fundamentals": [
    {
      "title": "Evaluating Stocks",
      "publisher": "FINRA",
      "description": "Financial statements, valuation ratios, and research questions.",
      "url": "https://www.finra.org/investors/investing/investment-products/stocks/evaluating-stocks"
    },
    {
      "title": "Beginners’ Guide to Financial Statements",
      "publisher": "U.S. Securities and Exchange Commission",
      "description": "A foundational guide to revenue, expenses, cash flow, and balance sheets.",
      "url": "https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide"
    }
  ],
  "technical": [
    {
      "title": "What Is Technical Analysis?",
      "publisher": "Fidelity Learn",
      "description": "Price, volume, common indicators, and the limits of chart interpretation.",
      "url": "https://www.fidelity.com/learning-center/trading-investing/technical-analysis/what-is-technical-analysis"
    },
    {
      "title": "Technical Indicator Guide",
      "publisher": "Fidelity Learn",
      "description": "An illustrated reference for indicators and chart overlays.",
      "url": "https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide"
    }
  ],
  "compounding": [
    { title: 'Introduction to Investing', publisher: 'SEC · Investor.gov', description: 'Explains compound growth and how time changes the illustration.', url: 'https://www.investor.gov/introduction-investing' },
    { title: 'Compound Interest Calculator', publisher: 'SEC · Investor.gov', description: 'Try a different starting balance, rate, or time period.', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' },
  ],
  "inflation": [
    { title: 'Inflation: Definition and Indicators', publisher: 'Bank Indonesia', description: 'How Indonesia measures inflation and where to find published indicators.', url: 'https://www.bi.go.id/en/fungsi-utama/moneter/inflasi/default.aspx' },
  ],
  "costs": [
    { title: 'How Fees and Expenses Affect Your Investment Portfolio', publisher: 'SEC · Investor.gov', description: 'Compare fee types and their effect over time.', url: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated' },
  ]
};

  const academyResources = [
    { title: 'Investor Alerts & Bulletins', publisher: 'SEC · Investor.gov', description: 'New investor education and alerts, with publication dates.', url: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins' },
    { title: 'Investor Insights', publisher: 'FINRA', description: 'Continue with articles on markets, investing, and financial decisions.', url: 'https://www.finra.org/investors/insights' },
    { title: 'Fidelity Learn', publisher: 'Fidelity', description: 'Browse financial articles, visual guides, videos, and webinars.', url: 'https://www.fidelity.com/learning-center/overview' },
  ];

  const learningNotes = {
  "stocks": [
    "Common and preferred shares",
    "Different kinds of shares can have different rights. Common shareholders may be able to vote at shareholder meetings. Preferred shares often have priority for dividend payments and claims on assets. The specific rights depend on the share class."
  ],
  "prices": [
    "A quote is a snapshot",
    "In a real market, the price displayed when you decide to trade may differ from the eventual execution price. Orders take time to reach a trading venue, and prices can move during that time. Our virtual market uses generated example quotes, rather than real market data."
  ],
  "returns": [
    "Follow the money",
    "Imagine you own 10 shares and the company pays a dividend of Rp50 per share. That payment adds Rp500 to cash. Separately, your remaining shares can rise or fall in price. A cash payment and a change in share value are different parts of the total result."
  ],
  "risk": [
    "Recognize five common risks",
    "Company-specific risk comes from one business. Market risk can affect many businesses together. Liquidity risk concerns how easily you can sell. Inflation risk affects buying power. Concentration risk grows when too much depends on one holding or industry. A practice decision can involve several at once."
  ],
  "diversification": [
    "Allocation and diversification work together",
    "Asset allocation describes the split between broad types of investments, such as cash, bonds, and stocks. Diversification also considers the spread within each category. Review both the number of holdings and the size of each position when describing a portfolio."
  ],
  "fundamentals": [
    "Compare like with like",
    "A ratio is more meaningful when you know the industry and the period used in its calculation. Compare earnings, debt, and sales alongside valuation. A single low ratio can leave out an important part of the business story."
  ],
  "technical": [
    "Describe the chart before interpreting it",
    "First identify the time window, price direction, and size of the swings. Then look at trading volume. A moving average can smooth past prices, but it responds to data that has already happened. Indicators can disagree, so a pattern is a starting point for a question."
  ]
};
  courses.forEach(course => {
    if (learningNotes[course.id]) course.sections.push(learningNotes[course.id]);
    course.reviewedOn = '2026-11-07';
  });

  return {
    lessons, assets, annualRates, inflation, stageAt, scenarios, watchlist, advance, market, sum,
    startingCash, lastMarketDay, stocks, newAccount, quotePrice, quoteSeries, advanceDemoQuotes, portfolio, executeTrade, courses, quizzes, quizPacks, quizCounts, validateQuizQuestions, scoreQuiz, news, academySources, academyResources, academyTracks, academyMilestones, academyPointsPerLesson,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = simulationModel;
