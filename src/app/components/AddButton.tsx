import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import themeConfig from '../../themes/themeConfig';

type Props = {
    onPress: () => void;
};

export default function AddButton({ onPress }: Props) {
    return (
        <TouchableOpacity
            style={styles.btn}
            onPress={onPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
        >
            <Text style={styles.label}>+</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: themeConfig.accent.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    label: {
        fontSize: 22,
        fontWeight: '400',
        color: themeConfig.text.inverse,
        lineHeight: 22,
    },
});
