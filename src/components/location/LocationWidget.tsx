import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import styles from '../styles/reusableStyles';


type LocationWidgetType = {
    address: string,
    accentColor: string;
    openMaps: () => void;
};

export default function LocationWidget({
    address,
    accentColor,
    openMaps
}: LocationWidgetType) {
    return (
        <TouchableOpacity style={[styles.squareButton, styles.dateButton, { borderColor: accentColor }]} onPress={openMaps}>
            <View style={styles.locationContent}>
                <MaterialIcons name="location-pin" size={30} color={accentColor} style={{ marginBottom: 4 }} />
                <Text
                    style={styles.addressText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                >
                    {address}
                </Text>
            </View>
        </TouchableOpacity>
    );
};