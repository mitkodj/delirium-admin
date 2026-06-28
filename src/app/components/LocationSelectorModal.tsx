import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useState } from "react";


type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
};

export default function MapPickerModal({
  visible,
  onClose,
  onSelect,
}: Props) {
  const [marker, setMarker] = useState<any>(null);
  const [address, setAddress] = useState("");

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    setMarker({ latitude, longitude });

    const geo = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (geo.length > 0) {
      const g = geo[0];

      const readable = `${g.street ?? ""} ${g.name ?? ""}, ${
        g.city ?? g.region ?? ""
      }`;

      setAddress(readable);
    }
  };

  const confirm = () => {
    if (!marker) return;

    onSelect({
      address,
      latitude: marker.latitude,
      longitude: marker.longitude,
    });

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          onPress={handleMapPress}
        >
          {marker && <Marker coordinate={marker} />}
        </MapView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirm} onPress={confirm}>
            <Text style={{ color: "white" }}>Use location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancel: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#ddd",
  },
  confirm: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#000",
  },
});