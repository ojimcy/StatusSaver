import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import ImageViewingLib from 'react-native-image-viewing';

interface ImageViewerProps {
  uri: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({uri}) => {
  const images = useMemo(() => [{uri}], [uri]);

  return (
    <View style={styles.container}>
      <ImageViewingLib
        images={images}
        imageIndex={0}
        visible={true}
        onRequestClose={() => {}}
        presentationStyle="overFullScreen"
        backgroundColor="#000000"
        swipeToCloseEnabled={false}
        doubleTapToZoomEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default ImageViewer;
