import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import themeConfig from '../../theme/themeConfig';

type Props = { text: string; x: number; y: number };

export default function TableDragTooltip({ text, x, y }: Props) {
    return (
        <View pointerEvents="none" style={[styles.anchor, { left: x, top: y - 56 }]}>
            <View style={styles.pill}>
                <Text style={styles.text} numberOfLines={1}>{text}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    anchor: {
        position: 'absolute',
        width: 0,
        alignItems: 'center',
        zIndex: 20,
    },
    pill: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: themeConfig.background.secondary,
        borderWidth: 1,
        borderColor: themeConfig.accent.primary,
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
        color: themeConfig.text.primary,
    },
});
