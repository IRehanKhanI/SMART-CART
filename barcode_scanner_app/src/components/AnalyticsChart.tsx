import React from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import { theme } from '../theme';

interface AnalyticsChartProps {
  scanCount: number;
}

const HOURLY_DATA = [
  { hour: '09:00', count: 14 },
  { hour: '11:00', count: 28 },
  { hour: '13:00', count: 36 },
  { hour: '15:00', count: 24 },
  { hour: '17:00', count: 48, isPeak: true },
  { hour: '19:00', count: 32 },
];

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ scanCount }) => {
  const maxVal = Math.max(...HOURLY_DATA.map((d) => d.count), 50);

  return (
    <View style={styles.card}>
      {/* Title & Context */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SCAN THROUGHPUT & TRAFFIC</Text>
          <Text style={styles.context}>Today · 09:00–20:00 · Retail Operations</Text>
        </View>
        <View style={styles.insightBadge}>
          <Text style={styles.insightText}>Peak: 17:00 (48 scans/hr)</Text>
        </View>
      </View>

      {/* Bar Chart Visualization */}
      <View style={styles.chartContainer}>
        {HOURLY_DATA.map((item, idx) => {
          const heightPercent: DimensionValue = `${Math.round((item.count / maxVal) * 100)}%`;
          return (
            <View key={idx} style={styles.barColumn}>
              <Text style={styles.barValue}>{item.count}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: heightPercent,
                      backgroundColor: item.isPeak
                        ? theme.colors.accent
                        : theme.colors.borderDark,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, item.isPeak && styles.barLabelPeak]}>
                {item.hour}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Metric Footer */}
      <View style={styles.footerRow}>
        <View style={styles.footerMetric}>
          <Text style={styles.footerLabel}>Total Scanned Today</Text>
          <Text style={styles.footerValue}>{scanCount + 182} units</Text>
        </View>
        <View style={styles.footerMetric}>
          <Text style={styles.footerLabel}>Scan Latency</Text>
          <Text style={styles.footerValue}>0.18s (Edge Cached)</Text>
        </View>
        <View style={styles.footerMetric}>
          <Text style={styles.footerLabel}>Match Accuracy</Text>
          <Text style={styles.footerValue}>99.4%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 16,
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  context: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
    marginTop: 2,
  },
  insightBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius,
  },
  insightText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: 14,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  barTrack: {
    width: 22,
    height: 75,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
  barLabelPeak: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerMetric: {
    flex: 1,
    minWidth: 100,
  },
  footerLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
});
