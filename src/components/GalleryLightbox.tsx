import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildAssetUrl } from '../helpers/utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type DiscoImage = {
  id: string;
  imageName: string;
};

type Props = {
  images: DiscoImage[];
  index: number;
  onClose: () => void;
};

export default function GalleryLightbox({ images, index, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(index);
  const [isLandscape, setIsLandscape] = useState(true);

  const image = images[currentIndex];
  const imageUrl = buildAssetUrl(image.imageName);

  useEffect(() => {
    Image.getSize(imageUrl, (w, h) => {
      setIsLandscape(w >= h);
    });
  }, [imageUrl]);

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        {/* CLOSE */}
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* IMAGE */}
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            isLandscape
              ? { width: SCREEN_WIDTH, height: undefined, aspectRatio: undefined }
              : { height: SCREEN_HEIGHT, width: undefined },
          ]}
          resizeMode="contain"
        />

        {/* LEFT ARROW */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.arrow, styles.left]}
            onPress={() => setCurrentIndex(i => i - 1)}
          >
            <Ionicons name="chevron-back" size={36} color="#fff" />
          </TouchableOpacity>
        )}

        {/* RIGHT ARROW */}
        {currentIndex < images.length - 1 && (
          <TouchableOpacity
            style={[styles.arrow, styles.right]}
            onPress={() => setCurrentIndex(i => i + 1)}
          >
            <Ionicons name="chevron-forward" size={36} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  image: {
    minWidth: 300,
    minHeight: 300,
    maxWidth: SCREEN_WIDTH,
    maxHeight: SCREEN_HEIGHT,
  },

  arrow: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    padding: 12,
  },

  left: {
    left: 16,
  },

  right: {
    right: 16,
  },

  close: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
  },
});
