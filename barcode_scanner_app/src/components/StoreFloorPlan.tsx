import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface StoreFloorPlanProps {
  lastScannedCode?: string;
  onZoneSelect?: (zoneName: string) => void;
}

export const StoreFloorPlan: React.FC<StoreFloorPlanProps> = ({
  lastScannedCode,
  onZoneSelect,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('Station 01');

  const handleSelect = (zone: string) => {
    setSelectedZone(zone);
    if (onZoneSelect) onZoneSelect(zone);
  };

  return (
    <View style={styles.container}>
      {/* Floor Plan Card Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.title}>LIVE STORE FLOOR PLAN</Text>
          <Text style={styles.subtitle}>Store 01 · Level 1 Retail Floor</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
          <Text style={styles.liveText}>LIVE MONITOR</Text>
        </View>
      </View>

      {/* Architectural Floor Plan Grid */}
      <View style={styles.mapContainer}>
        {/* Entrance & Lobby Area */}
        <View style={styles.topArea}>
          <View style={styles.entranceBlock}>
            <Text style={styles.entranceLabel}>MAIN ENTRANCE / EXIT</Text>
            <View style={styles.turnstileRow}>
              <View style={styles.turnstile} />
              <View style={styles.turnstile} />
              <View style={styles.turnstile} />
            </View>
          </View>

          <View style={styles.customerServiceBlock}>
            <Text style={styles.zoneMiniLabel}>HELP DESK</Text>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
          </View>
        </View>

        {/* Central Aisles Layout */}
        <View style={styles.aislesContainer}>
          {/* Aisle A1 */}
          <TouchableOpacity
            style={[
              styles.aisleCard,
              selectedZone === 'Aisle A1' && styles.aisleCardSelected,
            ]}
            onPress={() => handleSelect('Aisle A1')}
            activeOpacity={0.8}
          >
            <View style={styles.aisleHeader}>
              <Text style={styles.aisleId}>AISLE A1</Text>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
            </View>
            <Text style={styles.aisleCategory}>Produce & Fresh</Text>
            <View style={styles.shelfRepresentation}>
              <View style={styles.shelfLine} />
              <View style={styles.shelfLine} />
            </View>
            <Text style={styles.aisleMetric}>Cap: 94% · 18 SKUs</Text>
          </TouchableOpacity>

          {/* Aisle A2 (Attention: Low stock) */}
          <TouchableOpacity
            style={[
              styles.aisleCard,
              selectedZone === 'Aisle A2' && styles.aisleCardSelected,
            ]}
            onPress={() => handleSelect('Aisle A2')}
            activeOpacity={0.8}
          >
            <View style={styles.aisleHeader}>
              <Text style={styles.aisleId}>AISLE A2</Text>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.statusAttention }]} />
            </View>
            <Text style={styles.aisleCategory}>Dairy & Chilled</Text>
            <View style={styles.shelfRepresentation}>
              <View style={styles.shelfLine} />
              <View style={styles.shelfLine} />
            </View>
            <Text style={[styles.aisleMetric, { color: theme.colors.statusAttention }]}>
              Attention: 1 SKU Low
            </Text>
          </TouchableOpacity>

          {/* Aisle A3 */}
          <TouchableOpacity
            style={[
              styles.aisleCard,
              selectedZone === 'Aisle A3' && styles.aisleCardSelected,
            ]}
            onPress={() => handleSelect('Aisle A3')}
            activeOpacity={0.8}
          >
            <View style={styles.aisleHeader}>
              <Text style={styles.aisleId}>AISLE A3</Text>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
            </View>
            <Text style={styles.aisleCategory}>Snacks & Drinks</Text>
            <View style={styles.shelfRepresentation}>
              <View style={styles.shelfLine} />
              <View style={styles.shelfLine} />
            </View>
            <Text style={styles.aisleMetric}>Cap: 88% · 26 SKUs</Text>
          </TouchableOpacity>

          {/* Aisle A4 */}
          <TouchableOpacity
            style={[
              styles.aisleCard,
              selectedZone === 'Aisle A4' && styles.aisleCardSelected,
            ]}
            onPress={() => handleSelect('Aisle A4')}
            activeOpacity={0.8}
          >
            <View style={styles.aisleHeader}>
              <Text style={styles.aisleId}>AISLE A4</Text>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
            </View>
            <Text style={styles.aisleCategory}>Household & Dry</Text>
            <View style={styles.shelfRepresentation}>
              <View style={styles.shelfLine} />
              <View style={styles.shelfLine} />
            </View>
            <Text style={styles.aisleMetric}>Cap: 96% · 14 SKUs</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Checkout & Active Scanner Station Zone */}
        <View style={styles.checkoutZone}>
          <Text style={styles.checkoutZoneTitle}>CHECKOUT & SCANNING CORRIDOR</Text>

          <View style={styles.checkoutCountersRow}>
            {/* Active Scanner Station 01 */}
            <TouchableOpacity
              style={[
                styles.stationBlock,
                styles.stationBlockActive,
                selectedZone === 'Station 01' && styles.aisleCardSelected,
              ]}
              onPress={() => handleSelect('Station 01')}
              activeOpacity={0.8}
            >
              <View style={styles.stationBadgeRow}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
                <Text style={styles.stationTitle}>STATION 01 (EDGE SCANNER)</Text>
              </View>
              <Text style={styles.stationSub}>
                {lastScannedCode ? `Last: ${lastScannedCode}` : 'Optical feed ready · Idle'}
              </Text>
            </TouchableOpacity>

            {/* POS Counter 02 */}
            <TouchableOpacity
              style={styles.stationBlock}
              onPress={() => handleSelect('Counter 02')}
              activeOpacity={0.8}
            >
              <View style={styles.stationBadgeRow}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
                <Text style={styles.stationNormalTitle}>COUNTER 02</Text>
              </View>
              <Text style={styles.stationSub}>Queue: 2 pers</Text>
            </TouchableOpacity>

            {/* POS Counter 03 */}
            <TouchableOpacity
              style={styles.stationBlock}
              onPress={() => handleSelect('Counter 03')}
              activeOpacity={0.8}
            >
              <View style={styles.stationBadgeRow}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
                <Text style={styles.stationNormalTitle}>COUNTER 03</Text>
              </View>
              <Text style={styles.stationSub}>Queue: 1 pers</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Architectural Map Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.statusDot, { backgroundColor: theme.colors.statusAttention }]} />
          <Text style={styles.legendText}>Attention Required</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: theme.colors.accent, borderWidth: 1, borderColor: '#FFFFFF' },
            ]}
          />
          <Text style={styles.legendText}>Active Scanner Station</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 16,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  mapContainer: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 12,
    gap: 12,
  },
  topArea: {
    flexDirection: 'row',
    gap: 10,
  },
  entranceBlock: {
    flex: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius,
    padding: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  entranceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
    marginBottom: 4,
  },
  turnstileRow: {
    flexDirection: 'row',
    gap: 12,
  },
  turnstile: {
    width: 14,
    height: 3,
    backgroundColor: theme.colors.borderDark,
    borderRadius: 1,
  },
  customerServiceBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  zoneMiniLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  aislesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  aisleCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 10,
  },
  aisleCardSelected: {
    borderColor: theme.colors.accent,
    borderWidth: 1.5,
    backgroundColor: theme.colors.accentSubtle,
  },
  aisleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aisleId: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  aisleCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
    marginBottom: 6,
  },
  shelfRepresentation: {
    height: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginBottom: 6,
  },
  shelfLine: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  aisleMetric: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
  checkoutZone: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  checkoutZoneTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
    marginBottom: 8,
  },
  checkoutCountersRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  stationBlock: {
    flex: 1,
    minWidth: 110,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 8,
  },
  stationBlockActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSubtle,
  },
  stationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  stationTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accent,
    fontFamily: theme.fontFamily,
  },
  stationNormalTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  stationSub: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
});
