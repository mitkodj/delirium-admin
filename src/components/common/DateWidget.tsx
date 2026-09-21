import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles/reusableStyles';

type DateWidgetPropType = {
    day: number;
    month: string;
    accentColor: string;
    style?: object;
    scale?: number;
};

export default function DateWidget({
    day,
    month,
    accentColor,
    style = {},
    scale
}: DateWidgetPropType) {

    const scaledDayTextSizeStyle = scale ? {
        fontSize: (styles.dateDay.fontSize ?? 30) * scale
    } : {};
    const scaledMonthTextSizeStyle = scale ? {
        fontSize: (styles.dateMonth.fontSize ?? 22) * scale
    } : {};

    return (
        <View style={[styles.squareButton, styles.dateButton, { borderColor: accentColor }, style]}>
            <Text style={[styles.dateDay, { color: accentColor }, scaledDayTextSizeStyle]}>{day}</Text>
            <Text style={[styles.dateMonth, scaledMonthTextSizeStyle]}>{month}</Text>
        </View>
    );
};