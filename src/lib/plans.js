// Plan limits. The server is the source of truth for which plan an account has
// (profiles.plan in Supabase); this file only says what each plan unlocks.

export const PLANS = {
  free: {
    id: 'free',
    label: 'Grátis',
    price: 'R$ 0',
    maxBatch: 5,
    qualities: ['balanced', 'economy'],
    branding: true,
  },
  creator: {
    id: 'creator',
    label: 'Criador',
    price: 'R$ 29/mês',
    maxBatch: Infinity,
    qualities: ['ultra', 'high', 'balanced', 'economy'],
    branding: false,
  },
  agency: {
    id: 'agency',
    label: 'Agência',
    price: 'R$ 79/mês',
    maxBatch: Infinity,
    qualities: ['ultra', 'high', 'balanced', 'economy'],
    branding: false,
  },
  founder: {
    id: 'founder',
    label: 'Fundador',
    price: 'R$ 397 único',
    maxBatch: Infinity,
    qualities: ['ultra', 'high', 'balanced', 'economy'],
    branding: false,
  },
};

export function getPlan(id) {
  return PLANS[id] || PLANS.free;
}

export function allowsQuality(plan, qualityId) {
  return plan.qualities.includes(qualityId);
}

// Best quality the plan allows, used when the picked one is locked
export function fallbackQuality(plan, qualityId) {
  return allowsQuality(plan, qualityId) ? qualityId : plan.qualities[0];
}

// Checkout links come from the payment provider (Kiwify, Hotmart, Stripe Payment Links)
export const CHECKOUT_URLS = {
  creator: import.meta.env.VITE_CHECKOUT_CREATOR_URL || '',
  agency: import.meta.env.VITE_CHECKOUT_AGENCY_URL || '',
  founder: import.meta.env.VITE_CHECKOUT_FOUNDER_URL || '',
};
