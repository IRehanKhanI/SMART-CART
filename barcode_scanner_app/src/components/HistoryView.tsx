import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanHistoryItem } from '../types';
import { theme } from '../theme';

interface HistoryViewProps {
  history: ScanHistoryItem[];
  onSelectItem: (item: ScanHistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectItem,
  onClearHistory,
  onDeleteItem,
}) => {
  const [search, setSearch] = useState('');

  const filteredHistory = history.filter(
    (item) =>
      item.data.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())
  );

  const confirmClear = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all scanned log records?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Log', style: 'destructive', onPress: onClearHistory },
      ]
    );
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.columnHeader, styles.colTime]}>TIME</Text>
      <Text style={[styles.columnHeader, styles.colData]}>SCANNED CODE</Text>
      <Text style={[styles.columnHeader, styles.colType]}>TYPE</Text>
      <Text style={[styles.columnHeader, styles.colMatch]}>STATUS</Text>
      <Text style={[styles.columnHeader, styles.colActions]}>ACTION</Text>
    </View>
  );

  const renderItem = ({ item }: { item: ScanHistoryItem }) => {
    const isMatched = !!item.product;

    return (
      <TouchableOpacity
        style={styles.tableRow}
        onPress={() => onSelectItem(item)}
        activeOpacity={0.7}
      >
        {/* Time */}
        <View style={[styles.cell, styles.colTime]}>
          <Text style={styles.timeText}>{item.timestamp}</Text>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>

        {/* Code Data */}
        <View style={[styles.cell, styles.colData]}>
          <Text style={styles.dataText} numberOfLines={1}>
            {item.data}
          </Text>
          {isMatched && (
            <Text style={styles.matchedTitle} numberOfLines={1}>
              {item.product?.name}
            </Text>
          )}
        </View>

        {/* Barcode Type */}
        <View style={[styles.cell, styles.colType]}>
          <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
        </View>

        {/* Match Status with Small Dot */}
        <View style={[styles.cell, styles.colMatch]}>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isMatched
                    ? theme.colors.statusNormal
                    : theme.colors.statusNeutral,
                },
              ]}
            />
            <Text style={styles.statusLabel}>
              {isMatched ? 'MATCHED' : 'UNREGISTERED'}
            </Text>
          </View>
        </View>

        {/* Delete Row Button */}
        <View style={[styles.cell, styles.colActions, styles.actionsCell]}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDeleteItem(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topSection}>
        <View>
          <Text style={styles.heading}>SCAN AUDIT LOG</Text>
          <Text style={styles.subheading}>
            {history.length} optical barcode scans recorded during active session
          </Text>
        </View>

        {history.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={confirmClear}>
            <Ionicons name="trash-outline" size={14} color={theme.colors.statusCritical} />
            <Text style={styles.clearBtnText}>Clear Log</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input */}
      {history.length > 0 && (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search log by barcode or format..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Log Table Container */}
      <View style={styles.tableCard}>
        {renderTableHeader()}

        {filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="barcode-outline" size={40} color={theme.colors.borderDark} />
            <Text style={styles.emptyTitle}>
              {history.length === 0 ? 'No Scans Recorded' : 'No Matching Log Entries'}
            </Text>
            <Text style={styles.emptySub}>
              {history.length === 0
                ? 'Barcodes and QR codes scanned at Station 01 will appear here with verification details.'
                : 'Try searching with a different barcode code or format.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 18,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  subheading: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.statusCritical,
    fontFamily: theme.fontFamily,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginLeft: 8,
    fontFamily: theme.fontFamily,
  },
  tableCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    fontFamily: theme.fontFamily,
  },
  colTime: {
    flex: 1.2,
  },
  colData: {
    flex: 2,
  },
  colType: {
    flex: 1,
  },
  colMatch: {
    flex: 1.3,
  },
  colActions: {
    width: 50,
    textAlign: 'right',
  },
  listContainer: {
    paddingBottom: 24,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  cell: {
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  dateText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
    marginTop: 1,
  },
  dataText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  matchedTitle: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '500',
    fontFamily: theme.fontFamily,
    marginTop: 1,
  },
  typeText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
    fontFamily: theme.fontFamily,
  },
  actionsCell: {
    alignItems: 'flex-end',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
    marginTop: 6,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
    fontFamily: theme.fontFamily,
  },
});
