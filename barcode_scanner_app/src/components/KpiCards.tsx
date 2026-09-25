import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface KpiCardsProps {
  productCount: number;
  alertCount: number;
  scanCount: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  productCount,
  alertCount,
  scanCount,
}) => {
  return (
    <View style={styles.grid}>
      {/* Footfall Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>FOOTFALL</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
            <Text style={styles.statusText}>NORMAL</Text>
          </View>
        </View>
        <Text style={styles.metricValue}>248</Text>
        <Text style={styles.contextText}>↑ 12% vs hourly avg</Text>
      </View>

      {/* Stock Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>STOCK</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
            <Text style={styles.statusText}>TRACKED</Text>
          </View>
        </View>
        <Text style={styles.metricValue}>{productCount}</Text>
        <Text style={styles.contextText}>Active registered SKUs</Text>
      </View>

      {/* Queue Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>QUEUE</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
            <Text style={styles.statusText}>1.2 MIN</Text>
          </View>
        </View>
        <Text style={styles.metricValue}>Station 01</Text>
        <Text style={styles.contextText}>Active scanner checkout</Text>
      </View>

      {/* Alerts Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>ALERTS</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    alertCount > 0 ? theme.colors.statusAttention : theme.colors.statusNormal,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {alertCount > 0 ? 'ATTN REQ' : 'CLEAR'}
            </Text>
          </View>
        </View>
        <Text style={styles.metricValue}>{alertCount}</Text>
        <Text style={styles.contextText}>
          {alertCount > 0 ? 'Requires attention' : 'All systems normal'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 14,
    ...theme.shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
    fontFamily: theme.fontFamily,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
    marginBottom: 2,
  },
  contextText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
});
