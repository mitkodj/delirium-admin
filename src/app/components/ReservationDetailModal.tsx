import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Modal, Pressable, Animated, PanResponder, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import { Reservation, ReservationStatus } from '../../types/Disco';
import { useClubData } from '../../providers/ClubDataContext';
import FloorCanvas from './floorMap/FloorCanvas';
import { ReservationRow } from './ReservationRow';
import { FloorObject } from '../../types/FloorMap';

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
    onMoveTable?: (fromId: string, toId: string) => void;
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
    onMoveTable,
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
    const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);

    // Drag-to-reassign state
    const [dragCirclePos, setDragCirclePos] = useState<{ x: number; y: number } | null>(null);
    const [draggingFromId, setDraggingFromId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);

    const canvasWrapperRef = useRef<View | null>(null);
    const wrapperPagePos = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragFromIdRef = useRef<string | null>(null);
    const dropTargetIdRef = useRef<string | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Updated each render so PanResponder callbacks see fresh values
    const ownTableIdsRef = useRef<string[]>([]);
    const tableColorOverridesRef = useRef<Record<string, string>>({});
    const tableFloorObjectsRef = useRef<FloorObject[]>([]);
    const scaleRef = useRef(1);
    const containerWRef = useRef(0);
    const containerHRef = useRef(0);
    const canvasWRef = useRef(CANVAS_W);
    const canvasHRef = useRef(CANVAS_H);
    const onMoveTableRef = useRef(onMoveTable);

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

    const tableDragPan = useRef(PanResponder.create({
        // Capture phase: claim touch before FloorItem Pressable when hitting a reservation table
        onStartShouldSetPanResponderCapture: e => {
            const { pageX, pageY } = e.nativeEvent;
            const s = scaleRef.current;
            const cx = (pageX - wrapperPagePos.current.x - containerWRef.current / 2) / s + canvasWRef.current / 2;
            const cy = (pageY - wrapperPagePos.current.y - containerHRef.current / 2) / s + canvasHRef.current / 2;
            const hit = tableFloorObjectsRef.current.find(
                o => cx >= o.x && cx <= o.x + o.width && cy >= o.y && cy <= o.y + o.height,
            );
            return !!(hit && ownTableIdsRef.current.includes(hit.id));
        },
        onPanResponderGrant: e => {
            const { pageX, pageY } = e.nativeEvent;
            const s = scaleRef.current;
            const cx = (pageX - wrapperPagePos.current.x - containerWRef.current / 2) / s + canvasWRef.current / 2;
            const cy = (pageY - wrapperPagePos.current.y - containerHRef.current / 2) / s + canvasHRef.current / 2;
            const hit = tableFloorObjectsRef.current.find(
                o => cx >= o.x && cx <= o.x + o.width && cy >= o.y && cy <= o.y + o.height,
            );
            if (!hit) return;
            dragFromIdRef.current = hit.id;
            longPressTimerRef.current = setTimeout(() => {
                isDraggingRef.current = true;
                setDraggingFromId(hit.id);
                setDragCirclePos({ x: pageX, y: pageY });
            }, 420);
        },
        onPanResponderMove: (e, gs) => {
            if (!isDraggingRef.current) {
                if ((Math.abs(gs.dx) > 8 || Math.abs(gs.dy) > 8) && longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
                return;
            }
            const { pageX, pageY } = e.nativeEvent;
            setDragCirclePos({ x: pageX, y: pageY });
            const s = scaleRef.current;
            const cx = (pageX - wrapperPagePos.current.x - containerWRef.current / 2) / s + canvasWRef.current / 2;
            const cy = (pageY - wrapperPagePos.current.y - containerHRef.current / 2) / s + canvasHRef.current / 2;
            const hit = tableFloorObjectsRef.current.find(
                o => cx >= o.x && cx <= o.x + o.width && cy >= o.y && cy <= o.y + o.height,
            );
            const available = hit &&
                !ownTableIdsRef.current.includes(hit.id) &&
                !tableColorOverridesRef.current[hit.id];
            const newTarget = available ? hit!.id : null;
            if (newTarget !== dropTargetIdRef.current) {
                dropTargetIdRef.current = newTarget;
                setDropTargetId(newTarget);
            }
        },
        onPanResponderRelease: () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            if (isDraggingRef.current && dragFromIdRef.current && dropTargetIdRef.current) {
                onMoveTableRef.current?.(dragFromIdRef.current, dropTargetIdRef.current);
            } else if (!isDraggingRef.current && dragFromIdRef.current) {
                // Short tap on own table: toggle highlight
                setHighlightedTableId(prev => prev === dragFromIdRef.current ? null : dragFromIdRef.current);
            }
            isDraggingRef.current = false;
            dragFromIdRef.current = null;
            dropTargetIdRef.current = null;
            setDragCirclePos(null);
            setDraggingFromId(null);
            setDropTargetId(null);
        },
        onPanResponderTerminate: () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            isDraggingRef.current = false;
            dragFromIdRef.current = null;
            dropTargetIdRef.current = null;
            setDragCirclePos(null);
            setDraggingFromId(null);
            setDropTargetId(null);
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
        setHighlightedTableId(null);
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

    const canvasW = tableFloor?.width ?? CANVAS_W;
    const canvasH = tableFloor?.height ?? CANVAS_H;
    const scale = containerW > 0 && containerH > 0
        ? Math.min(containerW / canvasW, containerH / canvasH)
        : 1;

    const DETAIL_PULSE_COLOR = '#eab308';
    const ownTableIds = reservation?.tables ?? [];
    const isApproved = reservation?.status === ReservationStatus.APPROVED;

    // Keep refs fresh for the stable PanResponder closures
    ownTableIdsRef.current = ownTableIds;
    tableColorOverridesRef.current = tableColorOverrides;
    tableFloorObjectsRef.current = tableFloor?.objects ?? [];
    scaleRef.current = scale;
    containerWRef.current = containerW;
    containerHRef.current = containerH;
    canvasWRef.current = canvasW;
    canvasHRef.current = canvasH;
    onMoveTableRef.current = onMoveTable;

    const detailColorOverrides: Record<string, string> = {
        ...tableColorOverrides,
        ...(isApproved ? Object.fromEntries(ownTableIds.map(id => [id, DETAIL_PULSE_COLOR])) : {}),
        ...(highlightedTableId ? { [highlightedTableId]: DETAIL_PULSE_COLOR } : {}),
        ...(draggingFromId ? { [draggingFromId]: '#7c6ff0' } : {}),
        ...(dropTargetId ? { [dropTargetId]: '#22c55e' } : {}),
    };
    const allPulsingIds = highlightedTableId && !ownTableIds.includes(highlightedTableId)
        ? [...ownTableIds, highlightedTableId]
        : ownTableIds;

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
                    {/* Drag pill + close button */}
                    <View style={styles.pillRow}>
                        <View style={styles.pillSide}>
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={8}>
                                <Ionicons name="close" size={20} color={themeConfig.text.muted} />
                            </TouchableOpacity>
                        </View>
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
                        ref={canvasWrapperRef}
                        style={styles.canvasWrapper}
                        {...tableDragPan.panHandlers}
                        onLayout={e => {
                            setContainerW(e.nativeEvent.layout.width);
                            setContainerH(e.nativeEvent.layout.height);
                            setTimeout(() => {
                                canvasWrapperRef.current?.measure((_, __, ___, ____, px, py) => {
                                    wrapperPagePos.current = { x: px, y: py };
                                });
                            }, 50);
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
                                    transform: [{ scale }],
                                }}>
                                    <FloorCanvas
                                        objects={tableFloor.objects}
                                        selectedId={reservation?.tables?.[0] ?? null}
                                        width={canvasW}
                                        height={canvasH}
                                        isReadonly
                                        selectOnly

                                        tableColorOverrides={detailColorOverrides}
                                        pulsingTableIds={allPulsingIds.length > 0 ? allPulsingIds : undefined}
                                        onDeselect={() => setHighlightedTableId(null)}
                                        onSelect={setHighlightedTableId}
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
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => Alert.alert(
                                    'Cancel reservation',
                                    'Would you really like to cancel this reservation?',
                                    [
                                        { text: 'No', style: 'cancel' },
                                        { text: 'Yes, cancel it', style: 'destructive', onPress: onCancel },
                                    ]
                                )}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.seatBtn} onPress={primaryAction.onPress} activeOpacity={0.7}>
                                {primaryAction.renderIcon()}
                                <Text style={styles.seatBtnText}>{primaryAction.label}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                </Animated.View>

                {/* Drag circle — floats above the card, positioned in screen space */}
                {dragCirclePos && (
                    <View
                        pointerEvents="none"
                        style={[styles.dragCircle, { left: dragCirclePos.x - 18, top: dragCirclePos.y - 18 }]}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    dragCircle: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#eab308',
        opacity: 0.92,
        borderWidth: 2.5,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 16,
        zIndex: 999,
    },
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
    },
    pillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
    },
    pillSide: {
        flex: 1,
        alignItems: 'flex-end',
    },
    pill: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: themeConfig.border.subtle,
    },
    closeBtn: {
        padding: 4,
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
