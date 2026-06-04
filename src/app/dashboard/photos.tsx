import React, { useState } from "react";
import Gallery from "../../components/Gallery";
import { Club } from "../../types/Disco";
import themeConfig from "../../themes/themeConfig";
import { StyleSheet, Dimensions, ScrollView, RefreshControl } from "react-native";
import { fetchSuggestedClubs } from "../../utils/service";
import adminStyles from "./styles/adminStyles";

const SCREEN_WIDTH = Dimensions.get('window').width;
const galleryImageWidth = (SCREEN_WIDTH - 140) / 2;

export default function Photos() {

  const club: Club = (globalThis as any).myClubs?.[0];
  const [images, setImages] = useState(club?.images ?? []);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = (globalThis as any).authToken;
      if (token) {
        const response = await fetchSuggestedClubs();
        const clubs = response.data;
        if (clubs?.length) {
          (globalThis as any).myClubs = clubs.slice(0, 1);
          setImages(clubs[0]?.images ?? []);
        }
      } else {
        setImages((globalThis as any).myClubs?.[0]?.images ?? []);
      }
    } catch (e) {
      console.error('Failed to refresh photos', e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={[{ flex: 1 }, adminStyles.adminPage]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#fff"
          colors={['#fff']}
        />
      }
    >
      <Gallery
        images={images}
        isEditable={true}
        clubId={club?.id}
        accentColor={club?.accentColor}
        onSaved={(updated) => setImages(updated)}
        containerStyle={[styles.gallery, styles.detailsItem]}
        imageStyle={styles.galleryImage}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  detailsItem: {
    // marginHorizontal: 16,
  },

  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    flex: 1,
    paddingTop: 10
  },

  galleryImage: {
    width: galleryImageWidth,
    height: galleryImageWidth,
    aspectRatio: 1,
    backgroundColor: themeConfig.background.secondary,
  },

});