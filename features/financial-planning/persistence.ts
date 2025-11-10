import type { FinancialPlanPayload } from '@/app/api/financial-plan/route';
import type { ProjectionSettings, GraphDisplayOptions } from './store';

const STORAGE_KEYS = {
  FINANCIAL_PLAN: 'financial-plan-data',
  PROJECTION_SETTINGS: 'financial-plan-projection-settings',
  DISPLAY_OPTIONS: 'financial-plan-display-options',
  CACHE_TIMESTAMP: 'financial-plan-cache-timestamp',
} as const;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface PersistenceHelpers {
  saveFinancialPlan: (data: FinancialPlanPayload) => void;
  loadFinancialPlan: () => FinancialPlanPayload | null;
  saveProjectionSettings: (settings: ProjectionSettings) => void;
  loadProjectionSettings: () => ProjectionSettings | null;
  saveDisplayOptions: (options: GraphDisplayOptions) => void;
  loadDisplayOptions: () => GraphDisplayOptions | null;
  clearAllData: () => void;
  isCacheValid: () => boolean;
  exportData: () => string;
  importData: (jsonString: string) => boolean;
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function safeStringify(data: any): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('Failed to stringify data for storage:', error);
    return '';
  }
}

function safeParse<T>(jsonString: string | null): T | null {
  if (!jsonString) return null;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('Failed to parse data from storage:', error);
    return null;
  }
}

function saveToStorage(key: string, data: any): void {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return;
  }

  try {
    const serialized = safeStringify(data);
    if (serialized) {
      localStorage.setItem(key, serialized);
      localStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    }
  } catch (error) {
    console.warn(`Failed to save data to localStorage for key ${key}:`, error);
  }
}

function loadFromStorage<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const item = localStorage.getItem(key);
    return safeParse<T>(item);
  } catch (error) {
    console.warn(`Failed to load data from localStorage for key ${key}:`, error);
    return null;
  }
}

function removeFromStorage(key: string): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove data from localStorage for key ${key}:`, error);
  }
}

export const persistenceHelpers: PersistenceHelpers = {
  saveFinancialPlan: (data: FinancialPlanPayload) => {
    saveToStorage(STORAGE_KEYS.FINANCIAL_PLAN, data);
  },

  loadFinancialPlan: () => {
    return loadFromStorage<FinancialPlanPayload>(STORAGE_KEYS.FINANCIAL_PLAN);
  },

  saveProjectionSettings: (settings: ProjectionSettings) => {
    saveToStorage(STORAGE_KEYS.PROJECTION_SETTINGS, settings);
  },

  loadProjectionSettings: () => {
    return loadFromStorage<ProjectionSettings>(STORAGE_KEYS.PROJECTION_SETTINGS);
  },

  saveDisplayOptions: (options: GraphDisplayOptions) => {
    saveToStorage(STORAGE_KEYS.DISPLAY_OPTIONS, options);
  },

  loadDisplayOptions: () => {
    return loadFromStorage<GraphDisplayOptions>(STORAGE_KEYS.DISPLAY_OPTIONS);
  },

  clearAllData: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      removeFromStorage(key);
    });
  },

  isCacheValid: () => {
    const timestamp = loadFromStorage<string>(STORAGE_KEYS.CACHE_TIMESTAMP);
    if (!timestamp) return false;

    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();

    return (now - cacheTime) < CACHE_TTL;
  },

  exportData: () => {
    const data = {
      financialPlan: loadFromStorage(STORAGE_KEYS.FINANCIAL_PLAN),
      projectionSettings: loadFromStorage(STORAGE_KEYS.PROJECTION_SETTINGS),
      displayOptions: loadFromStorage(STORAGE_KEYS.DISPLAY_OPTIONS),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return safeStringify(data);
  },

  importData: (jsonString: string) => {
    try {
      const data = safeParse(jsonString);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      const typedData = data as any;

      // Validate and import financial plan
      if (typedData.financialPlan) {
        saveToStorage(STORAGE_KEYS.FINANCIAL_PLAN, typedData.financialPlan);
      }

      // Validate and import projection settings
      if (typedData.projectionSettings) {
        saveToStorage(STORAGE_KEYS.PROJECTION_SETTINGS, typedData.projectionSettings);
      }

      // Validate and import display options
      if (typedData.displayOptions) {
        saveToStorage(STORAGE_KEYS.DISPLAY_OPTIONS, typedData.displayOptions);
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  },
};

// Hook for using persistence helpers in React components
export function usePersistence() {
  return persistenceHelpers;
}

// Utility to automatically sync store with localStorage
export function createStorageSync() {
  return {
    onFinancialPlanChange: (data: FinancialPlanPayload | null) => {
      if (data) {
        persistenceHelpers.saveFinancialPlan(data);
      }
    },

    onProjectionSettingsChange: (settings: ProjectionSettings) => {
      persistenceHelpers.saveProjectionSettings(settings);
    },

    onDisplayOptionsChange: (options: GraphDisplayOptions) => {
      persistenceHelpers.saveDisplayOptions(options);
    },

    loadInitialData: () => {
      return {
        financialPlan: persistenceHelpers.loadFinancialPlan(),
        projectionSettings: persistenceHelpers.loadProjectionSettings(),
        displayOptions: persistenceHelpers.loadDisplayOptions(),
      };
    },

    isCacheValid: persistenceHelpers.isCacheValid,
  };
}