export interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

export interface LinkedBankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
}

interface ProfilePreferences {
  addresses: SavedAddress[];
  banks: LinkedBankAccount[];
}

const STORAGE_PREFIX = 'cook_profile_preferences';

function getStorageKey(email?: string | null) {
  return `${STORAGE_PREFIX}:${email || 'guest'}`;
}

function normalizeDefaults<T extends { id: string; isDefault: boolean }>(items: T[]) {
  if (items.length === 0) return items;
  const firstDefault = items.findIndex((item) => item.isDefault);
  if (firstDefault === -1) return items.map((item, index) => ({ ...item, isDefault: index === 0 }));
  return items.map((item, index) => ({ ...item, isDefault: index === firstDefault }));
}

export function loadProfilePreferences(email?: string | null): ProfilePreferences {
  if (typeof window === 'undefined') return { addresses: [], banks: [] };
  try {
    const raw = window.localStorage.getItem(getStorageKey(email));
    if (!raw) return { addresses: [], banks: [] };
    const parsed = JSON.parse(raw) as Partial<ProfilePreferences>;
    return {
      addresses: normalizeDefaults(Array.isArray(parsed.addresses) ? parsed.addresses : []),
      banks: normalizeDefaults(Array.isArray(parsed.banks) ? parsed.banks : []),
    };
  } catch {
    return { addresses: [], banks: [] };
  }
}

export function saveProfilePreferences(email: string | null | undefined, preferences: ProfilePreferences) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    getStorageKey(email),
    JSON.stringify({
      addresses: normalizeDefaults(preferences.addresses),
      banks: normalizeDefaults(preferences.banks),
    })
  );
}

