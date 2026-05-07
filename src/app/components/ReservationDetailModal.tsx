import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Modal, Pressable, Animated, PanResponder, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import { Reservation, ReservationStatus } from '../../types/Disco';
import { useClubData } from '../../providers/ClubDataContext';
import FloorCanvas from './floorMap/FloorCanvas';
import { ReservationRow } from './ReservationRow';

const CANVAS_W = 900;
const CANVAS_H = 600;

const STATUS_LABELS: Record<number, string> = {
    [ReservationStatus.OPEN]:     'Open',
    [ReservationStatus.APPROVED]: 'Approved',
    [ReservationStatus.SEATED]:   'Seated',
    [ReservationStatus.GONE]:     'Gone',
};

const STATUS_OPTIONS = [
    ReservationStatus.OPEN,
    ReservationStatus.APPROVED,
    ReservationStatus.SEATED,
    ReservationStatus.GONE,
];

function StatusDropdown({ options, selected, onSelect }: {
    options: ReservationStatus[];
    selected: ReservationStatus;
    onSelect: (s: ReservationStatus) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <View style={ddStyles.wrapper}>
            <TouchableOpacity style={ddStyles.trigger} onPress={() => setOpen(p => !p)} activeOpacity={0.7}>
                <Text style={ddStyles.triggerText}>{STATUS_LABELS[selected]}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={themeConfig.text.muted} />
            </TouchableOpacity>
            {open && options.map(s => (
                <TouchableOpacity key={s} style={ddStyles.option} onPress={() => { onSelect(s); setOpen(false); }} activeOpacity={0.7}>
                    <Text style={ddStyles.optionText}>{STATUS_LABELS[s]}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

type Props = {
    reservation: Reservation | null;
    visible: boolean;
    tableColorOverrides: Record<string, string>;
    onClose: () => void;
    onEdit: () => void;
    onApprove: () => void;
    onSeat: () => void;
    onGone: () => void;
    onCancel: () => void;
    onUpdateStatus: (status: ReservationStatus) => void;
};

export default function ReservationDetailModal({
    reservation,
    visible,
    tableColorOverrides,
    onClose,
    onEdit,
    onApprove,
    onSeat,
    onGone,
    onCancel,
    onUpdateStatus,
}: Props) {
    const { floors } = useClubData();
    const insets = useSafeAreaInsets();
    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const [containerW, setContainerW] = useState(0);
    const [containerH, setContainerH] = useState(0);
    const [showStatusPanel, setShowStatusPanel] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<ReservationStatus>(ReservationStatus.OPEN);

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 6 && gs.dy > Math.abs(gs.dx),
        onPanResponderMove: (_, gs) => {
            if (gs.dy > 0) translateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_, gs) => {
            if (gs.dy > 100 || gs.vy > 0.8) {
                Animated.timing(translateY, { toValue: 900, duration: 220, useNativeDriver: true })
                    .start(() => { onCloseRef.current(); });
            } else {
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 } as any).start();
            }
        },
    })).current;

    useEffect(() => {
        if (visible) {
            translateY.setValue(0);
            scaleAnim.setValue(0.88);
            opacityAnim.setValue(0);
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 200, mass: 0.8 } as any),
                Animated.timing(opacityAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    useEffect(() => {
        setShowStatusPanel(false);
    }, [reservation?.id]);

    const availableStatuses = STATUS_OPTIONS.filter(s => s !== reservation?.status);

    const handleToggleStatusPanel = () => {
        if (!showStatusPanel) {
            const first = availableStatuses[0];
            if (first !== undefined) setSelectedStatus(first);
        }
        setShowStatusPanel(p => !p);
    };

    const reservationTableIds = new Set(reservation?.tables ?? []);
    const tableFloor = reservationTableIds.size > 0
        ? floors.find(f => f.objects.some(o => reservationTableIds.has(o.id)))
        : undefined;

    const canvasW = Math.max(tableFloor?.width ?? CANVAS_W, CANVAS_W);
    const canvasH = Math.max(tableFloor?.height ?? CANVAS_H, CANVAS_H);
    const screenIsPortrait = containerH > containerW;
    const shouldRotate = canvasW > canvasH && screenIsPortrait;
    const displayW = shouldRotate ? canvasH : canvasW;
    const displayH = shouldRotate ? canvasW : canvasH;
    const scale = containerW > 0 && containerH > 0
        ? Math.min(containerW / displayW, containerH / displayH)
        : 1;

    const primaryAction = (() => {
        switch (reservation?.status) {
            case ReservationStatus.OPEN:     return { label: 'Approve', renderIcon: () => <Ionicons name="checkmark" size={18} color="#fff" />, onPress: onApprove };
            case ReservationStatus.APPROVED: return { label: 'Seat',    renderIcon: () => <MaterialCommunityIcons name="seat" size={18} color="#fff" />, onPress: onSeat };
            case ReservationStatus.SEATED:   return { label: 'Gone',    renderIcon: () => <Ionicons name="walk" size={18} color="#fff" />, onPress: onGone };
            default: return null;
        }
    })();

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <View style={[styles.backdrop, { paddingTop: Math.max(20, insets.top), paddingBottom: Math.max(20, insets.bottom) }]}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }, { translateY }] }]}
                >
                    {/* Drag pill */}
                    <View style={styles.pillRow}>
                        <View style={styles.pill} />
                    </View>

                    {/* Info row */}
                    {reservation && (
                        <View style={styles.rowWrapper}>
                            <ReservationRow
                                item={reservation}
                                onPress={() => {}}
                                onEdit={onEdit}
                                onCall={reservation.phoneNumber ? () => Linking.openURL(`tel:${reservation.phoneNumber}`) : undefined}
                                onStatusChange={handleToggleStatusPanel}
                                expandComment
                                truncateTableLabel
                            />
                        </View>
                    )}

                    {/* Status change panel */}
                    {showStatusPanel && (
                        <View style={styles.statusPanel}>
                            <StatusDropdown
                                options={availableStatuses}
                                selected={selectedStatus}
                                onSelect={setSelectedStatus}
                            />
                            <TouchableOpacity
                                style={styles.statusSaveBtn}
                                onPress={() => {
                                    onUpdateStatus(selectedStatus);
                                    setShowStatusPanel(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.statusSaveBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Floor canvas */}
                    <View
                        style={styles.canvasWrapper}
                        onLayout={e => {
                            setContainerW(e.nativeEvent.layout.width);
                            setContainerH(e.nativeEvent.layout.height);
                        }}
                    >
                        {tableFloor && containerW > 0 && containerH > 0 && (
                            <View style={{ width: containerW, height: containerH, overflow: 'hidden', backgroundColor: '#14122a', borderRadius: 12 }}>
                                <View style={{
                                    position: 'absolute',
                                    width: canvasW,
                                    height: canvasH,
                                    left: (containerW - canvasW) / 2,
                                    top: (containerH - canvasH) / 2,
                                    transform: shouldRotate
                                        ? [{ rotate: '90deg' }, { scale }]
                                        : [{ scale }],
                                }}>
                                    <FloorCanvas
                                        objects={tableFloor.objects}
                                        selectedId={reservation?.tables?.[0] ?? null}
                                        width={canvasW}
                                        height={canvasH}
                                        isReadonly
                                        selectOnly
                                        counterRotateLabels={shouldRotate}
                                        tableColorOverrides={tableColorOverrides}
                                        pulsingTableIds={reservation?.tables ?? undefined}
                                        onDeselect={() => {}}
                                        onSelect={() => {}}
                                        onUpdate={() => {}}
                                        onDuplicate={() => {}}
                                    />
                                </View>
                            </View>
                        )}
                        {!tableFloor && (
                            <View style={styles.noFloor}>
                                <Ionicons name="map-outline" size={32} color={themeConfig.text.muted} />
                                <Text style={styles.noFloorText}>No table assigned</Text>
                            </View>
                        )}
                    </View>

                    {/* Action buttons */}
                    {primaryAction && (
                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                                <Ionicons name="close" size={20} color="#ef4444" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.seatBtn} onPress={primaryAction.onPress} activeOpacity={0.7}>
                                {primaryAction.renderIcon()}
                                <Text style={styles.seatBtnText}>{primaryAction.label}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        flex: 1,
        backgroundColor: themeConfig.background.secondary,
        borderRadius: 16,
        overflow: 'hidden',
    },
    rowWrapper: {
        paddingHorizontal: 8,
        paddingTop: 8,
    },
    pillRow: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 4,
    },
    pill: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: themeConfig.border.subtle,
    },
    statusPanel: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 8,
        paddingTop: 6,
        paddingBottom: 4,
    },
    statusSaveBtn: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
        backgroundColor: themeConfig.accent.primary,
        alignSelf: 'flex-start',
    },
    statusSaveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: themeConfig.text.inverse,
    },
    canvasWrapper: {
        flex: 1,
        margin: 8,
    },
    noFloor: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    noFloorText: {
        fontSize: 14,
        color: themeConfig.text.muted,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 8,
        margin: 8,
        marginTop: 0,
    },
    cancelBtn: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    seatBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#15803c',
    },
    seatBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});

const ddStyles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        backgroundColor: themeConfig.background.primary,
    },
    triggerText: {
        fontSize: 14,
        fontWeight: '600',
        color: themeConfig.text.primary,
    },
    option: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: themeConfig.border.subtle,
        backgroundColor: themeConfig.background.primary,
    },
    optionText: {
        fontSize: 14,
        color: themeConfig.text.primary,
    },
});
