import React from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import StatusCard, {ITEM_SPACING, NUM_COLUMNS} from './StatusCard';
import {spacing} from '../theme/spacing';
import type {StatusFile} from '../types';

interface StatusGridProps {
  statuses: StatusFile[];
  onItemPress: (file: StatusFile) => void;
  onItemLongPress: (file: StatusFile) => void;
  selectedIds: string[];
  selectionMode: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const StatusGrid: React.FC<StatusGridProps> = ({
  statuses,
  onItemPress,
  onItemLongPress,
  selectedIds,
  selectionMode,
  refreshing,
  onRefresh,
  ListHeaderComponent,
  ListFooterComponent,
}) => {
  const renderItem = ({item}: {item: StatusFile}) => (
    <StatusCard
      file={item}
      onPress={() => onItemPress(item)}
      onLongPress={() => onItemLongPress(item)}
      selected={selectedIds.includes(item.id)}
      selectionMode={selectionMode}
    />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <FlatList
      data={statuses}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={renderSeparator}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
    />
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  row: {
    gap: ITEM_SPACING,
  },
  separator: {
    height: 0,
  },
});

export default StatusGrid;
