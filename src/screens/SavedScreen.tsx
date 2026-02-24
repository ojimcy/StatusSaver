import React, {useState, useCallback, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import StatusGrid from '../components/StatusGrid';
import EmptyState from '../components/EmptyState';
import useTheme from '../hooks/useTheme';
import type {StatusFile} from '../types';

const SavedScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {theme} = useTheme();
  const [savedStatuses, setSavedStatuses] = useState<StatusFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    try {
      const result = await CameraRoll.getPhotos({
        first: 100,
        assetType: 'All',
        groupName: 'StatusSaver',
      });

      const files: StatusFile[] = result.edges.map((edge, index) => {
        const node = edge.node;
        const isVideo =
          node.type?.startsWith('video') ||
          node.image.uri.includes('.mp4') ||
          node.image.uri.includes('.3gp');
        return {
          id: `saved-${index}-${node.timestamp}`,
          path: node.image.uri,
          name: node.image.filename || `status-${index}`,
          type: isVideo ? 'video' : 'image',
          size: node.image.fileSize || 0,
          lastModified: (node.timestamp || 0) * 1000,
          uri: node.image.uri,
        };
      });

      setSavedStatuses(files);
    } catch (error) {
      // If album doesn't exist yet, just show empty
      setSavedStatuses([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const handleItemPress = useCallback(
    (file: StatusFile) => {
      navigation.navigate('Viewer', {file});
    },
    [navigation],
  );

  const handleItemLongPress = useCallback((_file: StatusFile) => {
    // No selection mode for saved screen
  }, []);

  if (!loading && savedStatuses.length === 0) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <EmptyState
          icon={'\u2B07'}
          title="No Saved Statuses Yet"
          subtitle="Statuses you save will appear here. Tap a status and press the save button to get started."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <StatusGrid
        statuses={savedStatuses}
        onItemPress={handleItemPress}
        onItemLongPress={handleItemLongPress}
        selectedIds={[]}
        selectionMode={false}
        refreshing={loading}
        onRefresh={loadSaved}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SavedScreen;
