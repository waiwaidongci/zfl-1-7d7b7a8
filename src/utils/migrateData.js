import { TASK_TYPE_INSPECTION, TASK_TYPE_REVIEW } from './statusSync';
import { normalizeHarvestDistribution, parseWeight, formatWeight, isValidWeightFormat } from './distribution';

const CURRENT_DATA_VERSION = 3;

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

const safeGet = (key, defaultValue) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
    return defaultValue;
  }
};

export const getDataVersion = () => {
  return safeGet('zfl-1-data-version', 0);
};

export const setDataVersion = (version) => {
  safeSet('zfl-1-data-version', version);
};

export const migrateInspections = (inspections) => {
  return inspections.map(inspection => {
    const migrated = { ...inspection };

    if (!migrated.syncStatus) {
      migrated.syncStatus = 'synced';
    }
    if (migrated.retryCount === undefined || migrated.retryCount === null) {
      migrated.retryCount = 0;
    }
    if (!migrated.followupTaskId) {
      migrated.followupTaskId = null;
    }
    if (!migrated.reviewCompletedAt) {
      migrated.reviewCompletedAt = null;
    }
    if (!migrated.reviewCompletedBy) {
      migrated.reviewCompletedBy = null;
    }
    if (!migrated.createdAt) {
      migrated.createdAt = new Date(`${migrated.date || '2025-01-01'}T${migrated.time || '00:00'}:00`).toISOString();
    }

    return migrated;
  });
};

export const migrateTasks = (tasks) => {
  return tasks.map(task => {
    const migrated = { ...task };

    if (!migrated.taskType) {
      if (migrated.title && migrated.title.includes('复查')) {
        migrated.taskType = TASK_TYPE_REVIEW;
      } else if (migrated.relatedInspectionId) {
        migrated.taskType = TASK_TYPE_INSPECTION;
      } else {
        migrated.taskType = 'general';
      }
    }

    if (!migrated.relatedInspectionId) {
      migrated.relatedInspectionId = null;
    }

    if (migrated.done && !migrated.completedAt) {
      migrated.completedAt = new Date().toISOString();
    }

    if (!migrated.createdAt) {
      migrated.createdAt = new Date().toISOString();
    }

    return migrated;
  });
};

export const migrateBeds = (beds) => {
  return beds.map(bed => {
    const migrated = { ...bed };

    if (migrated.warning === undefined || migrated.warning === null) {
      migrated.warning = '';
    }

    return migrated;
  });
};

export const migrateTransactions = (transactions) => {
  return transactions.map(transaction => {
    const migrated = { ...transaction };

    if (!migrated.relatedType) {
      migrated.relatedType = '';
    }
    if (!migrated.relatedId) {
      migrated.relatedId = '';
    }
    if (!migrated.relatedName) {
      migrated.relatedName = '';
    }
    if (!migrated.bedName) {
      migrated.bedName = '';
    }
    if (!migrated.crop) {
      migrated.crop = '';
    }
    if (migrated.materialDeleted === undefined) {
      migrated.materialDeleted = false;
    }

    return migrated;
  });
};

export const normalizeWeightFormat = (weightStr) => {
  if (!weightStr || typeof weightStr !== 'string') return weightStr;
  const trimmed = weightStr.trim();
  if (trimmed === '') return trimmed;

  const grams = parseWeight(trimmed);
  if (grams <= 0) return trimmed;

  return formatWeight(grams);
};

export const migrateHarvests = (harvests) => {
  return harvests.map(harvest => {
    let migrated = { ...harvest };

    if (migrated.distribution === undefined) {
      migrated.distribution = null;
    }

    if (migrated.archived === undefined) {
      migrated.archived = false;
    }

    if (migrated.weight && !isValidWeightFormat(migrated.weight)) {
      const normalized = normalizeWeightFormat(migrated.weight);
      if (normalized && isValidWeightFormat(normalized)) {
        migrated.weight = normalized;
      }
    }

    migrated = normalizeHarvestDistribution(migrated);

    if (migrated.distribution) {
      const dist = migrated.distribution;
      if (dist.selfPickup && !isValidWeightFormat(dist.selfPickup)) {
        const normalized = normalizeWeightFormat(dist.selfPickup);
        if (normalized && isValidWeightFormat(normalized)) {
          dist.selfPickup = normalized;
        }
      }
      if (dist.communityShare && !isValidWeightFormat(dist.communityShare)) {
        const normalized = normalizeWeightFormat(dist.communityShare);
        if (normalized && isValidWeightFormat(normalized)) {
          dist.communityShare = normalized;
        }
      }
      if (dist.volunteerSample && !isValidWeightFormat(dist.volunteerSample)) {
        const normalized = normalizeWeightFormat(dist.volunteerSample);
        if (normalized && isValidWeightFormat(normalized)) {
          dist.volunteerSample = normalized;
        }
      }
      if (dist.loss && !isValidWeightFormat(dist.loss)) {
        const normalized = normalizeWeightFormat(dist.loss);
        if (normalized && isValidWeightFormat(normalized)) {
          dist.loss = normalized;
        }
      }
      if (dist.selfPickupTaken && !isValidWeightFormat(dist.selfPickupTaken)) {
        const normalized = normalizeWeightFormat(dist.selfPickupTaken);
        if (normalized && isValidWeightFormat(normalized)) {
          dist.selfPickupTaken = normalized;
        }
      }
    }

    return migrated;
  });
};

export const migrateContacts = (contacts) => {
  return contacts.map(contact => {
    const migrated = { ...contact };

    if (migrated.pickupStatus === undefined) {
      if (migrated.type === '取菜通知') {
        migrated.pickupStatus = 'pending';
      }
    }

    if (migrated.relatedHarvestId === undefined) {
      migrated.relatedHarvestId = null;
    }

    if (migrated.expectedPickupDate === undefined) {
      migrated.expectedPickupDate = null;
    }

    return migrated;
  });
};

export const runAllMigrations = (data) => {
  const currentVersion = getDataVersion();

  if (currentVersion >= CURRENT_DATA_VERSION) {
    return data;
  }

  let { beds, tasks, inspections, transactions, harvests, contacts } = data;

  if (currentVersion < 1) {
    inspections = migrateInspections(inspections);
    tasks = migrateTasks(tasks);
    beds = migrateBeds(beds);
    transactions = migrateTransactions(transactions);
  }

  if (currentVersion < 2) {
    inspections = migrateInspections(inspections);
    tasks = migrateTasks(tasks);
    transactions = migrateTransactions(transactions);
  }

  if (currentVersion < 3) {
    if (harvests) {
      harvests = migrateHarvests(harvests);
    }
    if (contacts) {
      contacts = migrateContacts(contacts);
    }
    transactions = migrateTransactions(transactions);
  }

  setDataVersion(CURRENT_DATA_VERSION);

  return { ...data, beds, tasks, inspections, transactions, harvests, contacts };
};
