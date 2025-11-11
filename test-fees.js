"use strict";
/**
 * Direct Aster API test script
 * Fetches trades to check if commission fees are returned
 *
 * Run with: npx ts-node test-fees.ts
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var fs = require("fs");
var path = require("path");
var DirectAsterClient = /** @class */ (function () {
    function DirectAsterClient(apiKey, apiSecret) {
        this.baseUrl = "https://fapi.asterdex.com";
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }
    DirectAsterClient.prototype.getTimestamp = function () {
        return Date.now();
    };
    DirectAsterClient.prototype.generateSignature = function (params) {
        var sortedKeys = Object.keys(params).sort();
        var totalParams = sortedKeys.map(function (key) { return "".concat(key, "=").concat(params[key]); }).join("&");
        return (0, crypto_1.createHmac)("sha256", this.apiSecret).update(totalParams).digest("hex");
    };
    DirectAsterClient.prototype.getTrades = function (symbol_1) {
        return __awaiter(this, arguments, void 0, function (symbol, limit) {
            var timestamp, allParams, signature, sortedKeys, queryString, url, response, text;
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        timestamp = this.getTimestamp();
                        allParams = {
                            symbol: symbol,
                            limit: limit,
                            timestamp: timestamp,
                            recvWindow: 10000,
                        };
                        signature = this.generateSignature(allParams);
                        sortedKeys = Object.keys(allParams).sort();
                        queryString = sortedKeys.map(function (key) { return "".concat(key, "=").concat(encodeURIComponent(allParams[key])); }).join("&");
                        url = "".concat(this.baseUrl, "/fapi/v1/trades?").concat(queryString, "&signature=").concat(signature);
                        console.log("\n\uD83D\uDCE1 Fetching trades from: ".concat(this.baseUrl, "/fapi/v1/trades"));
                        console.log("   Limit: ".concat(limit));
                        console.log("   Symbol: ".concat(symbol || "all"));
                        return [4 /*yield*/, fetch(url, {
                                method: "GET",
                                headers: {
                                    "X-MBX-APIKEY": this.apiKey,
                                    "Content-Type": "application/x-www-form-urlencoded",
                                    "User-Agent": "NOF1-Test/1.0",
                                },
                                signal: AbortSignal.timeout(8000),
                            })];
                    case 1:
                        response = _a.sent();
                        return [4 /*yield*/, response.text()];
                    case 2:
                        text = _a.sent();
                        if (!response.ok) {
                            console.error("\u274C API Error (".concat(response.status, "): ").concat(text.substring(0, 300)));
                            throw new Error("API Error: ".concat(text));
                        }
                        try {
                            return [2 /*return*/, JSON.parse(text)];
                        }
                        catch (e) {
                            console.error("\u274C Failed to parse JSON: ".concat(text.substring(0, 300)));
                            throw e;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return DirectAsterClient;
}());
function loadEnv() {
    var envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
        var content = fs.readFileSync(envPath, "utf-8");
        content.split("\n").forEach(function (line) {
            var match = line.match(/^([^=]+)=(.*)$/);
            if (match && !line.startsWith("#")) {
                process.env[match[1].trim()] = match[2].trim();
            }
        });
    }
}
/**
 * Aster Exchange Fee Structure:
 * - Maker Fee: 0.01% (providing liquidity)
 * - Taker Fee: 0.035% (taking liquidity)
 *
 * Fee = Trade Amount × Fee Rate
 * Where Trade Amount = qty × price
 */
var ASTER_FEE_RATES = {
    maker: 0.0001, // 0.01%
    taker: 0.00035, // 0.035%
};
var COMMISSION_ASSET = "USDT";
function calculateFee(trade) {
    var price = parseFloat(trade.price);
    var qty = parseFloat(trade.qty);
    var tradeAmount = price * qty;
    // Determine if maker or taker
    var isMaker = trade.isBuyerMaker;
    var feeRate = isMaker ? ASTER_FEE_RATES.maker : ASTER_FEE_RATES.taker;
    var commission = tradeAmount * feeRate;
    var feeType = isMaker ? "maker" : "taker";
    return __assign(__assign({}, trade), { commission: commission, commissionAsset: COMMISSION_ASSET, feeType: feeType });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var symbol, agent1ApiKey, agent1ApiSecret, client, trades, firstTrade, enrichedTrades, firstEnriched, feeRate, totalFees, makerFees, takerFees, makerCount, takerCount, _i, enrichedTrades_1, trade, i, t, tradeAmount, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🔍 Aster API Fees Test\n");
                    console.log("=".repeat(60));
                    loadEnv();
                    symbol = process.argv[2] || "ASTERUSDT";
                    agent1ApiKey = process.env.AGENT_1_API_KEY || "";
                    agent1ApiSecret = process.env.AGENT_1_API_SECRET || "";
                    if (!agent1ApiKey || !agent1ApiSecret) {
                        console.error("❌ Missing AGENT_1_API_KEY or AGENT_1_API_SECRET in environment");
                        console.error("   Tried to load from .env.local");
                        process.exit(1);
                    }
                    client = new DirectAsterClient(agent1ApiKey, agent1ApiSecret);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log("\n🤖 Testing Agent 1 (Claude Arbitrage)\n");
                    return [4 /*yield*/, client.getTrades(symbol, 50)];
                case 2:
                    trades = _a.sent();
                    console.log("\n\u2705 Received ".concat(trades.length, " trades\n"));
                    if (trades.length === 0) {
                        console.log("⚠️  No trades found for this agent yet.");
                        console.log("   This could mean:");
                        console.log("   - The agent hasn't made any trades yet");
                        console.log("   - API credentials are not for a trading account");
                    }
                    else {
                        firstTrade = trades[0];
                        console.log("📋 ASTER API RESPONSE (Raw Trade):");
                        console.log("─".repeat(60));
                        console.log(JSON.stringify(firstTrade, null, 2));
                        console.log("─".repeat(60));
                        // Calculate fees for all trades
                        console.log("\n💰 CALCULATING FEES BASED ON ASTER FEE STRUCTURE...");
                        console.log("   Maker Fee: ".concat((ASTER_FEE_RATES.maker * 100).toFixed(2), "%"));
                        console.log("   Taker Fee: ".concat((ASTER_FEE_RATES.taker * 100).toFixed(2), "%"));
                        enrichedTrades = trades.map(calculateFee);
                        firstEnriched = enrichedTrades[0];
                        console.log("\n📋 FIRST TRADE WITH CALCULATED FEE:");
                        console.log("─".repeat(60));
                        console.log("   ID: ".concat(firstEnriched.id));
                        console.log("   Price: ".concat(firstEnriched.price));
                        console.log("   Quantity: ".concat(firstEnriched.qty));
                        console.log("   Trade Amount: ".concat((parseFloat(firstEnriched.price) * parseFloat(firstEnriched.qty)).toFixed(6), " USDT"));
                        feeRate = ASTER_FEE_RATES[firstEnriched.feeType];
                        console.log("   Fee Type: ".concat(firstEnriched.feeType.toUpperCase(), " (").concat((feeRate * 100).toFixed(3), "%)"));
                        console.log("   Calculated Commission: ".concat(firstEnriched.commission.toFixed(6), " ").concat(firstEnriched.commissionAsset));
                        console.log("   Time: ".concat(new Date(firstEnriched.time).toISOString()));
                        totalFees = 0;
                        makerFees = 0;
                        takerFees = 0;
                        makerCount = 0;
                        takerCount = 0;
                        for (_i = 0, enrichedTrades_1 = enrichedTrades; _i < enrichedTrades_1.length; _i++) {
                            trade = enrichedTrades_1[_i];
                            totalFees += trade.commission;
                            if (trade.feeType === "maker") {
                                makerFees += trade.commission;
                                makerCount++;
                            }
                            else {
                                takerFees += trade.commission;
                                takerCount++;
                            }
                        }
                        console.log("\n\uFFFD FEE SUMMARY (across all ".concat(trades.length, " trades)"));
                        console.log("─".repeat(60));
                        console.log("   Total Fees: ".concat(totalFees.toFixed(6), " USDT"));
                        console.log("   Maker Trades: ".concat(makerCount, " (").concat(makerFees.toFixed(6), " USDT)"));
                        console.log("   Taker Trades: ".concat(takerCount, " (").concat(takerFees.toFixed(6), " USDT)"));
                        console.log("   Average Fee per Trade: ".concat((totalFees / trades.length).toFixed(6), " USDT"));
                        // Show a few more trades for verification
                        if (trades.length > 1) {
                            console.log("\n\uFFFD SAMPLE OF CALCULATED FEES:");
                            console.log("─".repeat(60));
                            for (i = 0; i < Math.min(5, trades.length); i++) {
                                t = enrichedTrades[i];
                                tradeAmount = (parseFloat(t.price) * parseFloat(t.qty)).toFixed(2);
                                console.log("   Trade ".concat(i + 1, ": ").concat(t.feeType.padEnd(6), " | ") +
                                    "Amount: ".concat(tradeAmount.padStart(10), " USDT | ") +
                                    "Fee: ".concat(t.commission.toFixed(6).padStart(10), " USDT"));
                            }
                        }
                    }
                    console.log("\n" + "=".repeat(60));
                    console.log("✅ Test completed successfully\n");
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error("\n❌ Test failed:");
                    console.error(error_1);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
main();
