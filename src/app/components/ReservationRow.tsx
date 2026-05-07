import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import { Reservation, ReservationStatus } from '../../types/Disco';
import { useClubData } from '../../providers/ClubDataContext';

export const STATUS_STYLE: Partial<Record<ReservationStatus, object>> = {
    [ReservationStatus.OPEN]:      { backgroundColor: 'rgba(234, 179, 8, 0.08)',   borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.4)' },
    [ReservationStatus.APPROVED]:  { backgroundColor: 'rgba(99, 102, 241, 0.08)',  borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.4)' },
    [ReservationStatus.SEATED]:    { backgroundColor: 'rgba(34, 197, 94, 0.08)',   borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)' },
    [ReservationStatus.GONE]:      { backgroundColor: 'rgba(148, 163, 184, 0.08)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)', opacity: 0.6 },
    [ReservationStatus.CANCELLED]: { backgroundColor: 'rgba(239, 68, 68, 0.08)',   borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)', opacity: 0.6 },
};

export function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ReservationRow({ item, onPress, onEdit, onSeat, onCall, onStatusChange, expandComment, truncateTableLabel }: {
    item: Reservation;
    onPress: () => void;
    onEdit?: () => void;
    onSeat?: () => void;
    onCall?: () => void;
    onStatusChange?: () => void;
    expandComment?: boolean;
    truncateTableLabel?: boolean;
}) {
    const { floors } = useClubData();
    const allObjects = floors.flatMap(f => f.objects);
    const firstTableLabel = item.tables?.[0]
        ? allObjects.find(o => o.id === item.tables![0])?.label ?? item.tables[0]
        : undefined;
    const extraCount = (item.tables?.length ?? 0) - 1;
    const rawTableLabel = firstTableLabel
        ? extraCount > 0 ? `${firstTableLabel} +${extraCount}` : firstTableLabel
        : undefined;
    const tableLabel = truncateTableLabel && rawTableLabel && rawTableLabel.length > 10
        ? rawTableLabel.slice(0, 10) + '…'
        : rawTableLabel;

    return (
        <TouchableOpacity
            style={[
                rowStyles.row,
                item.status !== undefined && STATUS_STYLE[item.status],
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={rowStyles.infoCol}>
                <Text style={rowStyles.nameText} numberOfLines={1}>
                    {item.firstName} {item.lastName}
                </Text>

                <View style={rowStyles.metaRow}>
                    <Ionicons name="person-outline" size={13} color={themeConfig.text.muted} />
                    <Text style={rowStyles.metaText}>{item.clientsCount}</Text>
                    {item.reservationDate && (
                        <>
                            <View style={rowStyles.metaSpacer} />
                            <MaterialIcons name="table-bar" size={13} color={themeConfig.text.muted} />
                            <Text style={rowStyles.metaText}>{tableLabel}</Text>
                        </>
                    )}
                    <View style={rowStyles.metaSpacer} />
                    <Ionicons name="time" size={13} color={themeConfig.text.muted} />
                    <Text style={rowStyles.metaText}>{formatTime(item.reservationDate)}</Text>
                </View>

                {item.comment ? (
                    <View style={rowStyles.metaRow}>
                        <Ionicons name="chatbubble-outline" size={13} color={themeConfig.text.muted} />
                        <Text style={rowStyles.commentText} numberOfLines={expandComment ? undefined : 1}>{item.comment}</Text>
                    </View>
                ) : (
                    <View style={rowStyles.metaRow}>
                        <Ionicons name="chatbubble-outline" size={13} color={themeConfig.background.secondary} />
                        <Text style={[rowStyles.commentText, { color: themeConfig.text.muted, opacity: 0.4 }]}>—</Text>
                    </View>
                )}
            </View>

            {onSeat && item.status !== ReservationStatus.SEATED && item.status !== ReservationStatus.GONE && item.status !== ReservationStatus.CANCELLED && (
                <TouchableOpacity style={rowStyles.rowSeatBtn} onPress={onSeat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="seat" size={18} color="#22c55e" />
                </TouchableOpacity>
            )}
            {onCall && (
                <TouchableOpacity style={rowStyles.rowCallBtn} onPress={onCall} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <Ionicons name="call" size={18} color="#22c55e" />
                </TouchableOpacity>
            )}
            {onStatusChange && (
                <TouchableOpacity style={rowStyles.rowStatusBtn} onPress={onStatusChange} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <Ionicons name="swap-vertical" size={18} color={themeConfig.text.muted} />
                </TouchableOpacity>
            )}
            {onEdit && (
                <TouchableOpacity style={rowStyles.rowEditBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <Ionicons name="pencil" size={18} color={themeConfig.accent.primary} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

export const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 8,
        alignItems: 'stretch',
        borderRadius: 12,
    },
    infoCol: {
        flex: 1,
        justifyContent: 'center',
        gap: 5,
    },
    rowSeatBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        alignSelf: 'center',
        marginRight: 4,
    },
    rowCallBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        alignSelf: 'center',
        marginRight: 4,
    },
    rowStatusBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: themeConfig.background.primary,
        alignSelf: 'center',
        marginRight: 4,
    },
    rowEditBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: themeConfig.background.primary,
        alignSelf: 'center',
    },
    nameText: {
        fontSize: 14,
        fontWeight: '700',
        color: themeConfig.text.primary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaSpacer: {
        width: 10,
    },
    metaText: {
        fontSize: 12,
        color: themeConfig.text.primary,
    },
    commentText: {
        fontSize: 12,
        color: themeConfig.text.primary,
        fontWeight: '600',
        flex: 1,
    },
});
