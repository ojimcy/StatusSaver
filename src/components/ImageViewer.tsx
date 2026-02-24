import React, {useRef, useState} from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

interface ImageViewerProps {
  uri: string;
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const ImageViewer: React.FC<ImageViewerProps> = ({uri}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [scale, setScale] = useState(1);

  const handleDoublePress = () => {
    if (scale > 1) {
      scrollViewRef.current?.scrollTo({x: 0, y: 0, animated: true});
      // Reset zoom handled by ScrollView
    }
  };

  const onScrollEndDrag = (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Scroll view handles zoom state
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom={true}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={() => {}}
        centerContent={true}>
        <Image
          source={{uri}}
          style={styles.image}
          resizeMode="contain"
          onLoad={() => setScale(1)}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

export default ImageViewer;
