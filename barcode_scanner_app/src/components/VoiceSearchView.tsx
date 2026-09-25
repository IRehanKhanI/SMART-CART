import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { productDb } from '../services/productDb';
import { SearchResultItem } from '../types';

interface VoiceSearchViewProps {
  pairedCartId: string;
  onItemAddedToCart?: (name: string) => void;
}

export const VoiceSearchView: React.FC<VoiceSearchViewProps> = ({
  pairedCartId,
  onItemAddedToCart,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [isSimulatingMic, setIsSimulatingMic] = useState(false);

  const performSearch = async (searchTerm: string, showAlert = false) => {
    const q = searchTerm.trim();

    setLoading(true);
    try {
      const res = await productDb.voiceSearch(pairedCartId, q);
      if (res && res.items && res.items.length > 0) {
        setResults(res.items);
        setTranscript(res.transcript || q);
        setSelectedItem((prev) => {
          if (prev && res.items.some((i) => i.id === prev.id)) return prev;
          return res.items[0];
        });
      } else {
        setResults([]);
        setSelectedItem(null);
        if (showAlert && q) {
          Alert.alert('No Items Found', `No matching in-stock items found for "${q}".`);
        }
      }
    } catch (e) {
      if (showAlert) {
        Alert.alert('Search Error', 'Could not query product database.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load available items on initial mount
  useEffect(() => {
    performSearch('', false);
  }, []);

  // Real-time live search as the user types
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleQuickChip = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const handleSimulateMic = () => {
    setIsSimulatingMic(true);
    const sampleQueries = ['Amul Milk', 'Parle-G Biscuits', 'Coca-Cola', 'Amul Butter', 'Cadbury Chocolate', 'Tata Tea'];
    const chosen = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];

    setTimeout(() => {
      setIsSimulatingMic(false);
      setQuery(chosen);
      performSearch(chosen);
    }, 1200);
  };

  const handleAddToCart = async (item: SearchResultItem) => {
    try {
      const res = await productDb.scanToCart(pairedCartId, item.barcode || item.sku);
      if (res) {
        Alert.alert('Item Added to Cart!', `${item.name} (₹${item.price.toFixed(2)}) has been added to your smart cart session.`);
        if (onItemAddedToCart) onItemAddedToCart(item.name);
      }
    } catch (e) {
      Alert.alert('Cart Error', 'Failed to add item to cart.');
    }
  };

  const getArrowIcon = (arrow: string) => {
    switch (arrow) {
      case 'RIGHT':
        return 'arrow-forward-circle';
      case 'LEFT':
        return 'arrow-back-circle';
      case 'FRONT':
        return 'arrow-up-circle';
      default:
        return 'navigate-circle';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.title}>VOICE & ITEM SEARCH</Text>
        <Text style={styles.subtitle}>
          Search for any product in store. View available inventory in rows and get step-by-step directions to where each item is placed!
        </Text>
      </View>

      {/* Search Input Bar + Search Button + Mic Button */}
      <View style={styles.searchBarContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Search items (e.g. Milk, Biscuits, Coke)..."
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => performSearch(query, true)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.searchSubmitBtn}
          onPress={() => performSearch(query, true)}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={16} color="#fff" />
          <Text style={styles.searchSubmitBtnText}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.micBtn, isSimulatingMic && styles.micBtnActive]}
          onPress={handleSimulateMic}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSimulatingMic ? 'mic' : 'mic-outline'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Popular Indian Retail Quick Search Chips */}
      <View style={styles.chipsContainer}>
        <Text style={styles.chipsLabel}>POPULAR SEARCHES:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {['Milk', 'Parle-G', 'Biscuits', 'Coca-Cola', 'Butter', 'Chocolate', 'Tea', 'Honey'].map((chip) => (
            <TouchableOpacity
              key={chip}
              style={styles.chip}
              onPress={() => handleQuickChip(chip)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Searching store catalog & computing directions...</Text>
        </View>
      )}

      {/* Selected Item Direction Banner (Highlighted when an item is selected) */}
      {selectedItem && !loading && (
        <View style={styles.directionCard}>
          <View style={styles.directionHeader}>
            <View style={styles.directionIconBox}>
              <Ionicons
                name={getArrowIcon(selectedItem.arrow) as any}
                size={36}
                color={theme.colors.accent}
              />
            </View>
            <View style={styles.directionHeaderInfo}>
              <Text style={styles.directionBadge}>ITEM DIRECTION</Text>
              <Text style={styles.directionItemName}>{selectedItem.name}</Text>
              <Text style={styles.directionLocationTag}>{selectedItem.shelfLocation}</Text>
            </View>
          </View>

          <View style={styles.directionStepBox}>
            <Ionicons name="compass-outline" size={18} color={theme.colors.accent} style={{ marginTop: 2 }} />
            <Text style={styles.directionText}>{selectedItem.direction}</Text>
          </View>

          <View style={styles.directionFooter}>
            <View>
              <Text style={styles.directionPrice}>₹{selectedItem.price.toFixed(2)}</Text>
              <Text style={styles.directionStock}>Stock: {selectedItem.stock} in aisle</Text>
            </View>
            <TouchableOpacity
              style={styles.directionAddBtn}
              onPress={() => handleAddToCart(selectedItem)}
              activeOpacity={0.85}
            >
              <Ionicons name="cart" size={16} color="#fff" />
              <Text style={styles.directionAddBtnText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Results List in Rows */}
      {results.length > 0 && !loading && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>
            AVAILABLE ITEMS ({results.length}) {transcript ? `FOR "${transcript.toUpperCase()}"` : ''}
          </Text>
          <Text style={styles.resultsSubtitle}>Tap any row to view its exact shelf direction:</Text>

          {results.map((item, index) => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <TouchableOpacity
                key={item.id || index}
                style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                onPress={() => setSelectedItem(item)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIndexBadge, isSelected && styles.rowIndexBadgeSelected]}>
                    <Text style={[styles.rowIndexText, isSelected && styles.rowIndexTextSelected]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.rowDetails}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <View style={styles.rowMeta}>
                      <Text style={styles.rowCategory}>{item.category || 'Grocery'}</Text>
                      <Text style={styles.rowLocation}>{item.shelfLocation}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <Text style={styles.rowPrice}>₹{item.price.toFixed(2)}</Text>
                  <Ionicons
                    name={isSelected ? 'chevron-down' : 'chevron-forward'}
                    size={16}
                    color={isSelected ? theme.colors.accent : theme.colors.textMuted}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.typography.sans,
    color: theme.colors.textPrimary,
  },
  clearBtn: {
    padding: 4,
  },
  searchSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.statusNormal,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
  },
  searchSubmitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.typography.mono,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtnActive: {
    backgroundColor: theme.colors.statusDanger,
  },
  chipsContainer: {
    marginBottom: 16,
  },
  chipsLabel: {
    fontSize: 10,
    fontFamily: theme.typography.mono,
    color: theme.colors.textMuted,
    fontWeight: '700',
    marginBottom: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    marginRight: 6,
  },
  chipText: {
    fontSize: 11,
    fontFamily: theme.typography.sans,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
  },
  directionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.lg,
    padding: 14,
    marginBottom: 20,
    ...theme.shadows.card,
  },
  directionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  directionIconBox: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionHeaderInfo: {
    flex: 1,
  },
  directionBadge: {
    fontSize: 9,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
  directionItemName: {
    fontSize: 15,
    fontFamily: theme.typography.sans,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  directionLocationTag: {
    fontSize: 11,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
  },
  directionStepBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  directionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.typography.sans,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  directionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  directionPrice: {
    fontSize: 16,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  directionStock: {
    fontSize: 11,
    fontFamily: theme.typography.sans,
    color: theme.colors.statusNormal,
  },
  directionAddBtn: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
    gap: 6,
  },
  directionAddBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
  },
  resultsSection: {
    marginTop: 4,
  },
  resultsTitle: {
    fontSize: 11,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  resultsSubtitle: {
    fontSize: 11,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 8,
  },
  itemRowSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  rowIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIndexBadgeSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  rowIndexText: {
    fontSize: 11,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  rowIndexTextSelected: {
    color: '#fff',
  },
  rowDetails: {
    flex: 1,
  },
  rowName: {
    fontSize: 13,
    fontFamily: theme.typography.sans,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  rowCategory: {
    fontSize: 10,
    fontFamily: theme.typography.sans,
    color: theme.colors.textSecondary,
  },
  rowLocation: {
    fontSize: 10,
    fontFamily: theme.typography.mono,
    color: theme.colors.accent,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowPrice: {
    fontSize: 13,
    fontFamily: theme.typography.mono,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
