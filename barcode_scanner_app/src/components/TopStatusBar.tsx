import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface TopStatusBarProps {
  onToggleAlerts: () => void;
  onToggleSidebar?: () => void;
  alertCount: number;
  isWideScreen?: boolean;
  pairedCartId?: string;
  onPressCart?: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  onToggleAlerts,
  onToggleSidebar,
  alertCount,
  isWideScreen = false,
  pairedCartId = 'CART-01',
  onPressCart,
}) => {
  return (
    <View style={styles.statusBar}>
      {/* Left: Mobile Menu Toggle + Store Selector */}
      <View style={styles.leftSection}>
        {!isWideScreen && onToggleSidebar && (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={onToggleSidebar}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu-outline" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}

        <View style={styles.storeBadge}>
          <Text style={styles.storeText}>STORE 01</Text>
          <Text style={styles.storeDivider}>/</Text>
          <Text style={styles.locationText}>BANGALORE</Text>
        </View>

        {pairedCartId && (
          <TouchableOpacity style={styles.cartBadge} onPress={onPressCart} activeOpacity={0.8}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
            <Text style={styles.cartBadgeText}>{pairedCartId}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Center: System Status Indicators */}
      <View style={styles.centerSection}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
          <Text style={styles.statusLabel}>ESP32 SYNC</Text>
        </View>

        {isWideScreen && (
          <>
            <View style={styles.statusDivider} />
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
              <Text style={styles.statusSubLabel}>EDGE SYNC: ACTIVE</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusIndicator}>
              <Text style={styles.statusSubLabel}>OPTICAL ENGINE: V1.0</Text>
            </View>
          </>
        )}
      </View>


      {/* Right: Operational Alert Trigger & Time */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={[styles.alertTriggerBtn, alertCount > 0 && styles.alertTriggerBtnActive]}
          onPress={onToggleAlerts}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  alertCount > 0 ? theme.colors.statusAttention : theme.colors.statusNormal,
              },
            ]}
          />
          <Text style={styles.alertTriggerText}>ALERTS ({alertCount})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    height: 48,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 30,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuBtn: {
    padding: 6,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  storeDivider: {
    fontSize: 12,
    color: theme.colors.borderDark,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
    fontFamily: theme.fontFamily,
  },
  statusSubLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  statusDivider: {
    width: 1,
    height: 14,
    backgroundColor: theme.colors.border,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  alertTriggerBtnActive: {
    borderColor: theme.colors.borderDark,
    backgroundColor: theme.colors.surface,
  },
  alertTriggerText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    letterSpacing: 0.3,
    fontFamily: theme.fontFamily,
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.statusNormalBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.statusNormal,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.statusNormal,
    fontFamily: theme.fontFamily,
  },
});

