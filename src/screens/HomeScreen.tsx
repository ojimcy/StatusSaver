import React, {useCallback} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import useStatuses from '../hooks/useStatuses';
import useStatusStore from '../store/useStatusStore';
import useSAFPermission from '../hooks/useSAFPermission';
import StatusGrid from '../components/StatusGrid';
import SelectionBar from '../components/SelectionBar';
import AdBanner from '../components/AdBanner';
import EmptyState from '../components/EmptyState';
import useTheme from '../hooks/useTheme';
import {saveBatch, shareFile} from '../services/FileService';
import type {StatusFile} from '../types';

const HomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {theme} = useTheme();
  const {images, loading, refresh} = useStatuses();
  const {selectedIds, toggleSelection, clearSelection} = useStatusStore();
  const selectionMode = selectedIds.length > 0;
  const {needsPermission, grantAccess} = useSAFPermission(
    !loading && images.length === 0,
  );

  const handleGrantAccess = useCallback(async () => {
    const granted = await grantAccess();
    if (granted) {
      refresh();
    }
  }, [grantAccess, refresh]);

  const handleItemPress = useCallback(
    (file: StatusFile) => {
      if (selectionMode) {
        toggleSelection(file.id);
      } else {
        navigation.navigate('Viewer', {file});
      }
    },
    [selectionMode, toggleSelection, navigation],
  );

  const handleItemLongPress = useCallback(
    (file: StatusFile) => {
      if (!selectionMode) {
        toggleSelection(file.id);
      }
    },
    [selectionMode, toggleSelection],
  );

  const handleSaveSelected = useCallback(async () => {
    const filesToSave = images.filter(img => selectedIds.includes(img.id));
    const result = await saveBatch(filesToSave);
    clearSelection();
    Alert.alert(
      'Save Complete',
      `Saved ${result.saved} item${result.saved !== 1 ? 's' : ''}${
        result.failed > 0 ? `. ${result.failed} failed.` : ''
      }`,
    );
  }, [images, selectedIds, clearSelection]);

  const handleShareSelected = useCallback(async () => {
    const filesToShare = images.filter(img => selectedIds.includes(img.id));
    if (filesToShare.length === 1) {
      await shareFile(filesToShare[0]);
    } else {
      Alert.alert('Share', 'Please select only one item to share.');
    }
    clearSelection();
  }, [images, selectedIds, clearSelection]);

  const renderContent = () => {
    if (!loading && images.length === 0) {
      return (
        <EmptyState
          icon={needsPermission ? '\u{1F512}' : '\u{1F5BC}'}
          title={
            needsPermission
              ? 'Storage Access Required'
              : 'No Image Statuses Found'
          }
          subtitle={
            needsPermission
              ? 'Grant access to the WhatsApp status folder to view and save statuses.'
              : 'Make sure WhatsApp is installed and you have viewed some statuses.'
          }
          actionLabel={needsPermission ? 'Grant Access' : undefined}
          onAction={needsPermission ? handleGrantAccess : undefined}
        />
      );
    }

    return (
      <StatusGrid
        statuses={images}
        onItemPress={handleItemPress}
        onItemLongPress={handleItemLongPress}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        refreshing={loading}
        onRefresh={refresh}
      />
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {renderContent()}
      {selectionMode && (
        <SelectionBar
          count={selectedIds.length}
          onSave={handleSaveSelected}
          onShare={handleShareSelected}
          onCancel={clearSelection}
        />
      )}
      <AdBanner />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HomeScreen;
