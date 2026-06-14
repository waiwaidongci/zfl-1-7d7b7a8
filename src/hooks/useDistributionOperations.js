import {
  PICKUP_REISSUE_GRACE_DAYS,
  checkPickupNoticeExists,
  generatePickupNoticeContact,
  generateReissueNoticeContact,
  confirmPickupContact,
  recordNoticeSent,
  confirmFullPickup,
  recordPartialPickup,
  addDistributionHistory,
  canReissuePickupNotice,
  isValidWeightFormat,
  hasCompleteContactInfo,
  iso
} from '../utils/distribution';

export function useDistributionOperations({
  harvests,
  setHarvests,
  contacts,
  setContacts,
  beds
}) {
  const updateHarvestDistribution = (harvestId, updater) => {
    setHarvests(harvests.map((h) => {
      if (h.id !== harvestId || !h.distribution) return h;
      return {
        ...h,
        distribution: updater(h.distribution)
      };
    }));
  };

  const addContact = (contact) => {
    setContacts([contact, ...contacts]);
  };

  const canSendPickupNotice = (harvest) => {
    if (!harvest || !harvest.distribution?.selfPickup) return false;
    if (harvest.archived) return false;
    if (checkPickupNoticeExists(contacts, harvest.id)) return false;
    if (!hasCompleteContactInfo(harvest, beds)) return false;
    return true;
  };

  const canReissuePickupNoticeOp = (harvest) => {
    if (!harvest || !harvest.distribution?.selfPickup) return false;
    if (harvest.archived) return false;
    if (!checkPickupNoticeExists(contacts, harvest.id)) return false;
    if (!hasCompleteContactInfo(harvest, beds)) return false;
    return canReissuePickupNotice(contacts, harvest.id, PICKUP_REISSUE_GRACE_DAYS);
  };

  const canConfirmPickup = (harvest) => {
    if (!harvest || !harvest.distribution?.selfPickup || harvest.archived) return false;
    return true;
  };

  const canRecordPartialPickup = (harvest, weightStr) => {
    if (!harvest || !harvest.distribution || harvest.archived) return false;
    if (!isValidWeightFormat(weightStr)) return false;
    return true;
  };

  const sendPickupNotice = (harvestId) => {
    const harvest = harvests.find(h => h.id === harvestId);
    if (!harvest || !harvest.distribution?.selfPickup) return false;
    if (checkPickupNoticeExists(contacts, harvestId)) return false;

    const contact = generatePickupNoticeContact(harvest, beds);
    if (!contact) return false;

    addContact(contact);
    updateHarvestDistribution(harvestId, (dist) =>
      recordNoticeSent(dist, 'initial')
    );
    return true;
  };

  const reissuePickupNotice = (harvestId) => {
    const harvest = harvests.find(h => h.id === harvestId);
    if (!harvest) return false;
    if (!canReissuePickupNotice(contacts, harvestId, PICKUP_REISSUE_GRACE_DAYS)) return false;

    const contact = generateReissueNoticeContact(harvest, beds, contacts);
    if (!contact || contact.error) return false;

    addContact(contact);
    updateHarvestDistribution(harvestId, (dist) =>
      recordNoticeSent(dist, 'reissue')
    );
    return true;
  };

  const confirmPickup = (harvestId) => {
    const harvest = harvests.find(h => h.id === harvestId);
    if (!harvest || !harvest.distribution?.selfPickup) return false;

    updateHarvestDistribution(harvestId, (dist) =>
      confirmFullPickup(dist)
    );

    if (checkPickupNoticeExists(contacts, harvestId)) {
      setContacts(confirmPickupContact(contacts, harvestId));
    }
    return true;
  };

  const recordPartialPickupOp = (harvestId, takenWeightStr) => {
    if (!isValidWeightFormat(takenWeightStr)) return false;
    const harvest = harvests.find(h => h.id === harvestId);
    if (!harvest || !harvest.distribution) return false;

    setHarvests(harvests.map((h) => {
      if (h.id !== harvestId || !h.distribution) return h;
      const updatedDist = recordPartialPickup(h.distribution, takenWeightStr);
      const distWithHistory = addDistributionHistory(updatedDist, 'partial_pickup', {
        takenWeight: takenWeightStr,
        timestamp: iso(0)
      });
      return {
        ...h,
        distribution: distWithHistory
      };
    }));
    return true;
  };

  const saveDistribution = (harvestId, distribution) => {
    const harvest = harvests.find((h) => h.id === harvestId);
    let nextDistribution = distribution ? { ...distribution, distributionUpdatedAt: iso(0) } : null;

    if (harvest && nextDistribution?.selfPickup && !checkPickupNoticeExists(contacts, harvestId)) {
      const contact = generatePickupNoticeContact(
        { ...harvest, distribution: nextDistribution },
        beds
      );
      if (contact) {
        addContact(contact);
        nextDistribution = recordNoticeSent(nextDistribution, 'initial');
      }
    }

    setHarvests(harvests.map((h) =>
      h.id === harvestId ? {
        ...h,
        distribution: nextDistribution
      } : h
    ));
    return true;
  };

  return {
    sendPickupNotice,
    reissuePickupNotice,
    confirmPickup,
    recordPartialPickup: recordPartialPickupOp,
    saveDistribution,
    canSendPickupNotice,
    canReissuePickupNotice: canReissuePickupNoticeOp,
    canConfirmPickup,
    canRecordPartialPickup
  };
}
