import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTab } from '../types';
import { theme } from '../theme';

interface SidebarNavProps {
  activeTab: AppTab;
  scannerType?: 'cart' | 'catalog';
  onSelectTab: (tab: AppTab, scannerType?: 'cart' | 'catalog') => void;
  onClose?: () => void;
  isDrawer?: boolean;
  historyCount?: number;
  productCount?: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  scannerType = 'cart',
  onSelectTab,
  onClose,
  isDrawer = false,
  historyCount = 0,
  productCount = 0,
}) => {
  const handleNav = (tab: AppTab, type?: 'cart' | 'catalog') => {
    onSelectTab(tab, type);
    if (onClose) onClose();
  };

  const navItems: {
    group: string;
    items: {
      id: AppTab;
      subType?: 'cart' | 'catalog';
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      badge?: number;
    }[];
  }[] = [
    {
      group: 'COMMAND',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: 'grid-outline',
        },
      ],
    },
    {
      group: 'OPERATIONS',
      items: [
        {
          id: 'scanner',
          subType: 'cart',
          label: '🛒 Scan to Cart',
          icon: 'cart-outline',
        },
        {
          id: 'scanner',
          subType: 'catalog',
          label: '📦 Add / Edit SKU',
          icon: 'barcode-outline',
        },
        {
          id: 'cart',
          label: 'Smart Cart View',
          icon: 'basket-outline',
        },
        {
          id: 'search',
          label: 'Voice & Item Search',
          icon: 'search-outline',
        },
        {
          id: 'products',
          label: 'Inventory Tables',
          icon: 'cube-outline',
          badge: productCount,
        },
        {
          id: 'history',
          label: 'Scan History',
          icon: 'time-outline',
          badge: historyCount,
        },
      ],
    },

    {
      group: 'SYSTEM',
      items: [
        {
          id: 'settings',
          label: 'Settings & Config',
          icon: 'options-outline',
        },
      ],
    },
  ];

  return (
    <View style={[styles.sidebar, isDrawer && styles.drawer]}>
      {/* Brand & Station Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandIconBlock}>
          <Ionicons name="hardware-chip-outline" size={18} color={theme.colors.textPrimary} />
        </View>
        <View style={styles.brandTextContainer}>
          <Text style={styles.brandTitle}>RETAIL COMMAND</Text>
          <Text style={styles.brandSub}>Operations Station 01</Text>
        </View>

        {isDrawer && onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Sections */}
      <View style={styles.navContainer}>
        {navItems.map((section, sIdx) => (
          <View key={sIdx} style={styles.navGroup}>
            <Text style={styles.groupLabel}>{section.group}</Text>

            {section.items.map((item, itemIdx) => {
              const isActive =
                activeTab === item.id &&
                (!item.subType || item.subType === scannerType);
              return (
                <TouchableOpacity
                  key={`${item.id}-${item.subType || itemIdx}`}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => handleNav(item.id, item.subType)}
                  activeOpacity={0.75}
                >
                  {/* Subtle active left accent indicator */}
                  {isActive && <View style={styles.activeBar} />}

                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={isActive ? theme.colors.accent : theme.colors.textSecondary}
                    style={styles.navIcon}
                  />

                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>

                  {item.badge !== undefined && item.badge > 0 && (
                    <View style={[styles.badge, isActive && styles.badgeActive]}>
                      <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Sidebar Footer Status */}
      <View style={styles.footer}>
        <View style={styles.footerStatusRow}>
          <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
          <Text style={styles.footerText}>Ready for barcode intake</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 230,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    zIndex: 100,
    ...theme.shadow.modal,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: 16,
  },
  brandIconBlock: {
    width: 32,
    height: 32,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  brandSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  navContainer: {
    flex: 1,
    gap: 16,
  },
  navGroup: {
    gap: 4,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    marginBottom: 4,
    fontFamily: theme.fontFamily,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: theme.radius,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  navIcon: {
    marginRight: 10,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    flex: 1,
    fontFamily: theme.fontFamily,
  },
  navLabelActive: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  badge: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.border,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  badgeTextActive: {
    color: theme.colors.accent,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingHorizontal: 6,
  },
  footerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
  },
});
