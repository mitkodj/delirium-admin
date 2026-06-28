import React from 'react';
import { View, StyleSheet, useWindowDimensions, StyleProp, ViewStyle } from 'react-native';

const PHONE_WIDTH = 430;

function isTabletLandscape(width: number, height: number) {
    return width >= 768 && width > height;
}

/** For modals that already have their own full-screen overlay (e.g. ReservationDetailModal). */
export function useTabletModalStyle() {
    const { width, height } = useWindowDimensions();
    return isTabletLandscape(width, height) ? styles.content : undefined;
}

/** Drop-in replacement for the outermost container View inside a Modal. */
export function TabletModalWrapper({ style, children }: {
    style: StyleProp<ViewStyle>;
    children: React.ReactNode;
}) {
    const { width, height } = useWindowDimensions();
    if (!isTabletLandscape(width, height)) {
        return React.createElement(View, { style }, children);
    }
    return React.createElement(
        View, { style: styles.overlay },
        React.createElement(View, { style: [style, styles.content] }, children)
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(100,100,100,0.1)',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        maxWidth: PHONE_WIDTH,
        width: '100%',
        alignSelf: 'center' as const,
    },
});
