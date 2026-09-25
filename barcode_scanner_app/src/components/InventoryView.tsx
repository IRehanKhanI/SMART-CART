import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductItem } from '../types';
import { theme } from '../theme';

interface InventoryViewProps {
  products: ProductItem[];
  onEditProduct: (product: ProductItem) => void;
  onDeleteProduct: (barcode: string) => void;
  onAddCustomProduct: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onEditProduct,
  onDeleteProduct,
  onAddCustomProduct,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    if (selectedFilter === 'All') return matchSearch;
    if (selectedFilter === 'Under ₹50') return matchSearch && p.price < 50;
    if (selectedFilter === '₹50 - ₹200') return matchSearch && p.price >= 50 && p.price <= 200;
    if (selectedFilter === 'Over ₹200') return matchSearch && p.price > 200;
    return matchSearch;
  });

  const confirmDelete = (product: ProductItem) => {
    Alert.alert(
      'Remove Product',
      `Delete "${product.name}" from inventory database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteProduct(product.barcode),
        },
      ]
    );
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.columnHeader, styles.colProduct]}>PRODUCT / ITEM</Text>
      <Text style={[styles.columnHeader, styles.colSku]}>BARCODE (SKU)</Text>
      <Text style={[styles.columnHeader, styles.colPrice]}>PRICE</Text>
      <Text style={[styles.columnHeader, styles.colStatus]}>STATUS</Text>
      <Text style={[styles.columnHeader, styles.colActions]}>ACTIONS</Text>
    </View>
  );

  const renderTableRow = ({ item }: { item: ProductItem }) => (
    <View style={styles.tableRow}>
      {/* Product & Thumbnail */}
      <View style={[styles.cell, styles.colProduct, styles.productCell]}>
        <Image
          source={{ uri: item.imageUri }}
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={styles.productNameBlock}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.createdDate}>
            Reg: {new Date(item.createdAt || Date.now()).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* SKU / Barcode */}
      <View style={[styles.cell, styles.colSku]}>
        <Text style={styles.skuText} numberOfLines={1}>
          {item.barcode}
        </Text>
      </View>

      {/* Price */}
      <View style={[styles.cell, styles.colPrice]}>
        <Text style={styles.priceText}>₹{item.price.toFixed(2)}</Text>
      </View>

      {/* Status */}
      <View style={[styles.cell, styles.colStatus]}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: theme.colors.statusNormal }]} />
          <Text style={styles.statusLabel}>IN STOCK</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.cell, styles.colActions, styles.actionsCell]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onEditProduct(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="pencil-outline" size={15} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => confirmDelete(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="trash-outline" size={15} color={theme.colors.statusCritical} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Controls Header */}
      <View style={styles.topSection}>
        <View>
          <Text style={styles.heading}>INVENTORY MASTER TABLE</Text>
          <Text style={styles.subheading}>
            {products.length} registered products synced with local & edge database
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={onAddCustomProduct}>
          <Ionicons name="add" size={16} color={theme.colors.textInverse} />
          <Text style={styles.addButtonText}>Add New Product</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product name or barcode..."
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

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['All', 'Under ₹50', '₹50 - ₹200', 'Over ₹200'].map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[
                styles.filterChip,
                selectedFilter === chip && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(chip)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === chip && styles.filterChipTextActive,
                ]}
              >
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Inventory Table Container */}
      <View style={styles.tableCard}>
        {renderTableHeader()}

        {filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={40} color={theme.colors.borderDark} />
            <Text style={styles.emptyTitle}>
              {products.length === 0 ? 'No Products Registered' : 'No Matching Records'}
            </Text>
            <Text style={styles.emptySub}>
              {products.length === 0
                ? 'Scan a barcode or tap "Add New Product" to populate your inventory.'
                : 'Try adjusting your search query or filter tags.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.barcode}
            renderItem={renderTableRow}
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
    fontFamily: theme.fontFamily,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginLeft: 8,
    fontFamily: theme.fontFamily,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.borderDark,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily,
  },
  filterChipTextActive: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
  colProduct: {
    flex: 2.2,
  },
  colSku: {
    flex: 1.5,
  },
  colPrice: {
    flex: 1,
  },
  colStatus: {
    flex: 1.2,
  },
  colActions: {
    width: 64,
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
  productCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  productNameBlock: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily,
  },
  createdDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: theme.fontFamily,
    marginTop: 1,
  },
  skuText: {
    fontSize: 12,
    fontFamily: theme.fontFamily,
    color: theme.colors.textSecondary,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  actionBtn: {
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
