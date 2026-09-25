import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export interface AlertItem {
  id: string;
  level: 'critical' | 'warning' | 'info' | 'resolved';
  title: string;
  description: string;
  timestamp: string;
}

interface AlertPanelProps {
  onClose?: () => void;
  isFloating?: boolean;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ onClose, isFloating = false }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: '1',
      level: 'warning',
      title: 'Shelf A2 (Dairy & Chilled)',
      description: 'Stock level below 20%. Replenishment recommended.',
      timestamp: '4 min ago',
    },
    {
      id: '2',
      level: 'warning',
      title: 'Counter 03 Queue',
      description: 'Queue length exceeded threshold. Cashier requested.',
      timestamp: '11 min ago',
    },
    {
      id: '3',
      level: 'info',
      title: 'Station 01 Optical Edge',
      description: 'Barcode camera engine operational & synced.',
      timestamp: '25 min ago',
    },
    {
      id: '4',
      level: 'resolved',
      title: 'Store Sync Resolved',
      description: 'Django REST local cache synchronised with backend.',
      timestamp: '42 min ago',
    },
  ]);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const getStatusColor = (level: AlertItem['level']) => {
    switch (level) {
      case 'critical':
        return theme.colors.statusCritical;
      case 'warning':
        return theme.colors.statusAttention;
      case 'resolved':
        return theme.colors.statusNormal;
      case 'info':
      default:
        return theme.colors.statusInfo;
    }
  };

  return (
    <View style={[styles.container, isFloating && styles.containerFloating]}>
      {/* Panel Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>OPERATIONAL ALERTS</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{alerts.length}</Text>
          </View>
        </View>

        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Alert List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={32} color={theme.colors.statusNormal} />
            <Text style={styles.emptyTitle}>All Clear</Text>
            <Text style={styles.emptySubtitle}>No operational alerts requiring attention.</Text>
          </View>
        ) : (
          alerts.map((item) => {
            const dotColor = getStatusColor(item.level);
            return (
              <View key={item.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertTitleRow}>
                    <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => dismissAlert(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="checkmark" size={14} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.alertDesc}>{item.description}</Text>
                <Text style={styles.alertTime}>{item.timestamp}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Footer System Status */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
          <Text style={styles.footerText}>Edge Node: Online (10.1.9.166)</Text>
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
    width: 280,
    ...theme.shadow.card,
  },
  containerFloating: {
    ...theme.shadow.modal,
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  countBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    gap: 10,
  },
  alertCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  alertDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    fontFamily: theme.fontFamily,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  emptySubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontFamily: theme.fontFamily,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
});
