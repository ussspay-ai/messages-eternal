/**
 * Supabase Client Wrapper (.js)
 * Bridges CommonJS parent module with ESM trading-bots
 * 
 * Handles circular dependencies gracefully by deferring module load
 * and returning no-op functions if loading fails
 */

let moduleLoaded = false;
let moduleFailed = false;
let loadPromise = null;

async function ensureModuleLoaded() {
  if (moduleLoaded || moduleFailed) return;
  if (!loadPromise) {
    loadPromise = import('../../lib/supabase-client.ts')
      .then(m => {
        const exports = m.default || m;
        for (const [key, value] of Object.entries(exports)) {
          globalThis[`__supabase_${key}`] = value;
        }
        moduleLoaded = true;
      })
      .catch(err => {
        // Circular dependency or other module load error - continue without Supabase
        if (err.code === 'ERR_REQUIRE_CYCLE_MODULE') {
          console.warn('[Supabase Wrapper] Circular dependency detected. Supabase functions will be skipped.');
        } else {
          console.warn('[Supabase Wrapper] Failed to load supabase module:', err.message);
        }
        moduleFailed = true;
      });
  }
  
  try {
    await loadPromise;
  } catch (err) {
    // Already handled above
  }
}

// Pre-load the module but don't block
ensureModuleLoaded();

function getExport(name) {
  if (moduleFailed || !moduleLoaded) {
    return undefined;
  }
  return globalThis[`__supabase_${name}`];
}

// Export functions
export async function supabase() {
  await ensureModuleLoaded();
  return getExport('supabase');
}

export async function saveAgentSnapshots(snapshots) {
  await ensureModuleLoaded();
  const fn = getExport('saveAgentSnapshots');
  return fn ? fn(snapshots) : false;
}

export async function getAgentSnapshots(agentId, startTime, endTime) {
  await ensureModuleLoaded();
  const fn = getExport('getAgentSnapshots');
  return fn ? fn(agentId, startTime, endTime) : [];
}

export async function getLatestSnapshots(agentIds) {
  await ensureModuleLoaded();
  const fn = getExport('getLatestSnapshots');
  return fn ? fn(agentIds) : {};
}

export async function saveFundingHistory(record) {
  await ensureModuleLoaded();
  const fn = getExport('saveFundingHistory');
  return fn ? fn(record) : false;
}

export async function getAgentFundingHistory(agentId) {
  await ensureModuleLoaded();
  const fn = getExport('getAgentFundingHistory');
  return fn ? fn(agentId) : [];
}

export async function getAllFundingHistory() {
  await ensureModuleLoaded();
  const fn = getExport('getAllFundingHistory');
  return fn ? fn() : [];
}

export async function getFundingStats(agentId) {
  await ensureModuleLoaded();
  const fn = getExport('getFundingStats');
  return fn ? fn(agentId) : {};
}

export async function isPickabooAdminWhitelisted(address) {
  await ensureModuleLoaded();
  const fn = getExport('isPickabooAdminWhitelisted');
  return fn ? fn(address) : false;
}

export async function getPickabooAdmins() {
  await ensureModuleLoaded();
  const fn = getExport('getPickabooAdmins');
  return fn ? fn() : [];
}

export async function addPickabooAdmin(address, name) {
  await ensureModuleLoaded();
  const fn = getExport('addPickabooAdmin');
  return fn ? fn(address, name) : false;
}

export async function removePickabooAdmin(address) {
  await ensureModuleLoaded();
  const fn = getExport('removePickabooAdmin');
  return fn ? fn(address) : false;
}

export async function getCurrentTradingSymbol() {
  await ensureModuleLoaded();
  const fn = getExport('getCurrentTradingSymbol');
  return fn ? fn() : 'ASTERUSDT';
}

export async function getAllTradingSymbols() {
  await ensureModuleLoaded();
  const fn = getExport('getAllTradingSymbols');
  return fn ? fn() : {};
}

export async function saveAgentTrade(trade) {
  await ensureModuleLoaded();
  const fn = getExport('saveAgentTrade');
  return fn ? fn(trade) : false;
}

export async function getAgentTrades(agentId) {
  await ensureModuleLoaded();
  const fn = getExport('getAgentTrades');
  return fn ? fn(agentId) : [];
}

export async function saveAgentSignal(signal) {
  await ensureModuleLoaded();
  const fn = getExport('saveAgentSignal');
  return fn ? fn(signal) : false;
}

export async function getAgentSignals(agentId) {
  await ensureModuleLoaded();
  const fn = getExport('getAgentSignals');
  return fn ? fn(agentId) : [];
}

export async function saveAgentThinking(thinking) {
  await ensureModuleLoaded();
  const fn = getExport('saveAgentThinking');
  return fn ? fn(thinking) : false;
}

export async function getAgentThinking(agentId) {
  await ensureModuleLoaded();
  const fn = getExport('getAgentThinking');
  return fn ? fn(agentId) : [];
}

export async function updateAgentStatus(status) {
  await ensureModuleLoaded();
  const fn = getExport('updateAgentStatus');
  return fn ? fn(status) : false;
}

export async function getAgentStatus(agentId) {
  await ensureModuleLoaded();
  const fn = getExport('getAgentStatus');
  return fn ? fn(agentId) : null;
}

export async function getAllAgentStatuses() {
  await ensureModuleLoaded();
  const fn = getExport('getAllAgentStatuses');
  return fn ? fn() : [];
}

export async function saveAgentDecision(decision) {
  await ensureModuleLoaded();
  const fn = getExport('saveAgentDecision');
  return fn ? fn(decision) : false;
}

export async function saveExitPlan(plan) {
  await ensureModuleLoaded();
  const fn = getExport('saveExitPlan');
  return fn ? fn(plan) : false;
}

export async function getActiveExitPlans(agentId) {
  await ensureModuleLoaded();
  const fn = getExport('getActiveExitPlans');
  return fn ? fn(agentId) : [];
}

export async function getLatestExitPlan(agentId) {
  await ensureModuleLoaded();
  const fn = getExport('getLatestExitPlan');
  return fn ? fn(agentId) : null;
}

export async function closeExitPlan(planId, exitPrice, exitTime) {
  await ensureModuleLoaded();
  const fn = getExport('closeExitPlan');
  return fn ? fn(planId, exitPrice, exitTime) : false;
}

export async function saveAgentChatMessage(message) {
  await ensureModuleLoaded();
  const fn = getExport('saveAgentChatMessage');
  return fn ? fn(message) : false;
}