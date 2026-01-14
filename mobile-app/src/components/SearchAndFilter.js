import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import theme from '../styles/theme';

const SearchAndFilter = ({
  searchValue,
  onSearchChange,
  filters = [],
  selectedFilter,
  onFilterChange,
  placeholder = "Search...",
  showFilterCount = true,
  style,
}) => {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const filterAnimation = new Animated.Value(0);

  const toggleFilters = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  // Removed animation logic to prevent CSS errors

  const getFilterCount = (filterKey) => {
    const filter = filters.find(f => f.key === filterKey);
    return filter?.count || 0;
  };

  return (
    <View style={{...styles.container, ...style}}>
      {/* Modern Search Bar */}
      <View style={styles.modernSearchContainer}>
        <View style={styles.modernSearchInputContainer}>
          <View style={styles.searchIconContainer}>
            <Text style={styles.modernSearchIcon}>🔍</Text>
          </View>
          <TextInput
            style={styles.modernSearchInput}
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text.muted}
          />
          {searchValue ? (
            <TouchableOpacity
              style={styles.modernClearButton}
              onPress={() => onSearchChange('')}
            >
              <Text style={styles.modernClearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {filters.length > 0 && (
          <TouchableOpacity
            style={{
              ...styles.modernFilterToggle,
              ...(isFilterExpanded && styles.modernFilterToggleActive)
            }}
            onPress={toggleFilters}
          >
            <Text style={styles.modernFilterIcon}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modern Filter Pills */}
      {filters.length > 0 && (
        <View style={styles.modernFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modernFiltersList}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={{
                  ...styles.modernFilterPill,
                  ...(selectedFilter === filter.key && styles.modernFilterPillActive)
                }}
                onPress={() => onFilterChange(filter.key)}
              >
                {filter.icon && (
                  <Text style={styles.filterEmoji}>{filter.icon}</Text>
                )}
                <Text
                  style={{
                    ...styles.modernFilterText,
                    ...(selectedFilter === filter.key && styles.modernFilterTextActive)
                  }}
                >
                  {filter.label}
                </Text>
                {showFilterCount && filter.count !== undefined && (
                  <View style={{
                    ...styles.modernCountBadge,
                    ...(selectedFilter === filter.key && styles.modernCountBadgeActive)
                  }}>
                    <Text style={{
                      ...styles.modernCountText,
                      ...(selectedFilter === filter.key && styles.modernCountTextActive)
                    }}>
                      {filter.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// Quick Filter Component for common use cases
export const QuickFilters = ({ filters, selectedFilter, onFilterChange, style }) => (
  <View style={{...styles.quickFiltersContainer, ...style}}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickFiltersList}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={{
            ...styles.quickFilterChip,
            ...(selectedFilter === filter.key && styles.quickFilterChipActive)
          }}
          onPress={() => onFilterChange(filter.key)}
        >
          {filter.icon && (
            <Text style={{
              ...styles.quickFilterIcon,
              ...(selectedFilter === filter.key && styles.quickFilterIconActive)
            }}>
              {filter.icon}
            </Text>
          )}
          <Text
            style={{
              ...styles.quickFilterText,
              ...(selectedFilter === filter.key && styles.quickFilterTextActive)
            }}
          >
            {filter.label}
          </Text>
          {filter.count !== undefined && (
            <View style={{
              ...styles.quickCountBadge,
              ...(selectedFilter === filter.key && styles.quickCountBadgeActive)
            }}>
              <Text style={{
                ...styles.quickCountText,
                ...(selectedFilter === filter.key && styles.quickCountTextActive)
              }}>
                {filter.count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// Search Bar Only Component
export const SearchBar = ({ value, onChangeText, placeholder, style, onFocus, onBlur }) => (
  <View style={{...styles.searchBarContainer, ...style}}>
    <Text style={styles.searchBarIcon}>🔍</Text>
    <TextInput
      style={styles.searchBarInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.text.muted}
      onFocus={onFocus}
      onBlur={onBlur}
    />
    {value ? (
      <TouchableOpacity
        style={styles.searchBarClear}
        onPress={() => onChangeText('')}
      >
        <Text style={styles.searchBarClearIcon}>✕</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  // Modern Search Container
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernSearchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernSearchIcon: {
    fontSize: 16,
    color: theme.colors.text.muted,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    paddingVertical: 0,
    fontWeight: '400',
  },
  modernClearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  modernClearIcon: {
    fontSize: 12,
    color: theme.colors.text.muted,
    fontWeight: 'bold',
  },
  modernFilterToggle: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernFilterToggleActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  modernFilterIcon: {
    fontSize: 18,
    color: theme.colors.text.muted,
  },

  // Modern Filter Pills
  modernFiltersContainer: {
    marginTop: 16,
  },
  modernFiltersList: {
    paddingHorizontal: 4,
    gap: 8,
  },
  modernFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modernFilterPillActive: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  filterEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  modernFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginRight: 8,
  },
  modernFilterTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modernCountBadge: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  modernCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modernCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  modernCountTextActive: {
    color: '#ffffff',
  },
  
  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
    color: theme.colors.text.muted,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: theme.colors.text.muted,
  },
  
  // Filter Toggle
  filterToggle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  filterToggleActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  filterIcon: {
    fontSize: 18,
  },
  
  // Filters Container
  filtersContainer: {
    overflow: 'hidden',
    marginTop: 12,
  },
  filtersList: {
    paddingVertical: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.medium,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  countBadge: {
    backgroundColor: theme.colors.border.medium,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  countTextActive: {
    color: '#ffffff',
  },
  
  // Quick Filters
  quickFiltersContainer: {
    backgroundColor: theme.colors.background.secondary,
    paddingVertical: 12,
  },
  quickFiltersList: {
    paddingHorizontal: 20,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  quickFilterChipActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  quickFilterIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  quickFilterIconActive: {
    // Icon color changes handled by emoji
  },
  quickFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  quickFilterTextActive: {
    color: '#ffffff',
  },
  quickCountBadge: {
    backgroundColor: theme.colors.border.medium,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  quickCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.secondary,
  },
  quickCountTextActive: {
    color: '#ffffff',
  },
  
  // Search Bar Only
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  searchBarIcon: {
    fontSize: 18,
    marginRight: 12,
    color: theme.colors.text.muted,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    paddingVertical: 0,
  },
  searchBarClear: {
    padding: 4,
  },
  searchBarClearIcon: {
    fontSize: 16,
    color: theme.colors.text.muted,
  },
});

export default SearchAndFilter;
