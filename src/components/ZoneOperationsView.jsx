import React from 'react';
import { MapPin, User, Clock, Droplets, Bug, Wheat, LayoutGrid, XCircle } from 'lucide-react';
import { ZONE_STAT_KEYS } from '../utils/zoneStats';

const STAT_ICONS = {
  placed: LayoutGrid,
  adopted: User,
  idle: Clock,
  paused: XCircle,
  water: Droplets,
  abnormal: Bug,
  harvest: Wheat
};

export function ZoneOperationsView({ zoneStats, selectedZone, onZoneSelect }) {
  const zones = Object.values(zoneStats);

  return (
    <div className="zoneOperationsContainer">
      {zones.map(({ zone, ...stats }) => {
        const isSelected = selectedZone === zone.id;
        return (
          <div
            key={zone.id}
            className={`zoneOperationCard ${isSelected ? 'selected' : ''}`}
            style={{ borderTop: `4px solid ${zone.color}` }}
          >
            <div
              className="zoneOperationHeader"
              onClick={() => onZoneSelect(isSelected ? null : zone.id)}
            >
              <div className="zoneOperationTitle">
                <MapPin size={16} style={{ color: zone.color }} />
                <h3>{zone.name}</h3>
                <span className="zoneOperationDesc">{zone.description}</span>
              </div>
              {isSelected && (
                <button
                  className="zoneClearFilterBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoneSelect(null);
                  }}
                >
                  清除筛选
                </button>
              )}
            </div>

            <div className="zoneOperationStats">
              {ZONE_STAT_KEYS.map(({ key, label, type }) => {
                const Icon = STAT_ICONS[type] || MapPin;
                const count = stats[key] || 0;
                const isClickable = count > 0;
                return (
                  <div
                    key={key}
                    className={`zoneStatItem type-${type} ${isClickable ? 'clickable' : 'disabled'} ${isSelected ? 'in-filter' : ''}`}
                    onClick={() => isClickable && onZoneSelect(isSelected ? null : zone.id)}
                  >
                    <Icon size={14} />
                    <span className="zoneStatLabel">{label}</span>
                    <span className="zoneStatCount">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
