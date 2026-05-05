import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    SectionList, RefreshControl, Modal, Pressable, Animated, PanResponder,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import ReservationFormModal from '../components/ReservationFormModal';
import AddButton from '../components/AddButton';
import SchemaViewerModal from '../components/SchemaViewerModal';
import FloorCanvas from '../components/floorMap/FloorCanvas';
import { Reservation, ReservationStatus } from '../../types/Disco';
import adminStyles from './styles/adminStyles';
import { useSidebar } from '../../providers/SidebarContext';
import { useClubData } from '../../providers/ClubDataContext';
import { getReservations } from '../../utils/service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ReservationsHeader({ navLabel, isSelectedToday, onPrev, onNext, onNew }: {
    navLabel: string;
    isSelectedToday: boolean;
    onPrev: () => void;
    onNext: () => void;
    onNew: () => void;
}) {
    const insets = useSafeAreaInsets();
    const { sidebarOpen, toggleSidebar } = useSidebar();
    return (
        <View style={[headerStyles.container, { paddingTop: insets.top }]}>
            {!sidebarOpen &&
                <View style={[headerStyles.sidePanel]}>
                    <TouchableOpacity style={headerStyles.sidePanelBtn} onPress={toggleSidebar}>
                        <Ionicons name="chevron-forward" size={22} color={themeConfig.text.muted} />
                    </TouchableOpacity>
                </View>
            }
            <View style={headerStyles.center}>
                <TouchableOpacity onPress={onPrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="chevron-back" size={22} color={themeConfig.text.primary} />
                </TouchableOpacity>
                <View style={headerStyles.labelWrap}>
                    <Text style={headerStyles.navText}>{navLabel}</Text>
                    {isSelectedToday && <Text style={headerStyles.todayBadge}>Today</Text>}
                </View>
                <TouchableOpacity onPress={onNext} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="chevron-forward" size={22} color={themeConfig.text.primary} />
                </TouchableOpacity>
                <AddButton onPress={onNew} />
            </View>
        </View>
    );
}

const headerStyles = StyleSheet.create({
    container: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeConfig.background.primary,
    },
    sidePanel: {
        width: 60,
        backgroundColor: themeConfig.background.secondary,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        alignItems: 'center',
        marginBlock: 12
    },
    sidePanelBtn: {
        padding: 12,
        borderRadius: 12,
    },
    center: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingLeft: 16,
    },
    labelWrap: {
        alignItems: 'center',
        gap: 2,
    },
    navText: {
        fontSize: 15,
        fontWeight: '700',
        color: themeConfig.text.primary,
    },
    todayBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: themeConfig.accent.primary,
        letterSpacing: 0.5,
    },
});

// ── Row component ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Partial<Record<ReservationStatus, object>> = {
    [ReservationStatus.OPEN]:      { backgroundColor: 'rgba(234, 179, 8, 0.08)',   borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.4)' },
    [ReservationStatus.APPROVED]:  { backgroundColor: 'rgba(99, 102, 241, 0.08)',  borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.4)' },
    [ReservationStatus.SEATED]:    { backgroundColor: 'rgba(34, 197, 94, 0.08)',   borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)' },
    [ReservationStatus.GONE]:      { backgroundColor: 'rgba(148, 163, 184, 0.08)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)', opacity: 0.6 },
    [ReservationStatus.CANCELLED]: { backgroundColor: 'rgba(239, 68, 68, 0.08)',   borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)', opacity: 0.6 },
};

const SECTION_CONFIG: { status: ReservationStatus; label: string; accent: string; defaultCollapsed: boolean }[] = [
    { status: ReservationStatus.OPEN,      label: 'Open',      accent: '#eab308', defaultCollapsed: false },
    { status: ReservationStatus.APPROVED,  label: 'Approved',  accent: '#6366f1', defaultCollapsed: false },
    { status: ReservationStatus.SEATED,    label: 'Seated',    accent: '#22c55e', defaultCollapsed: false },
    { status: ReservationStatus.GONE,      label: 'Gone',      accent: '#94a3b8', defaultCollapsed: true  },
    { status: ReservationStatus.CANCELLED, label: 'Cancelled', accent: '#ef4444', defaultCollapsed: true  },
];

function SectionHeader({ label, accent, count, collapsed, onToggle }: {
    label: string; accent: string; count: number; collapsed: boolean; onToggle: () => void;
}) {
    return (
        <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
            <View style={[styles.sectionAccentBar, { backgroundColor: accent }]} />
            <Text style={styles.sectionLabel}>{label}</Text>
            <View style={[styles.sectionBadge, { backgroundColor: accent + '28' }]}>
                <Text style={[styles.sectionBadgeText, { color: accent }]}>{count}</Text>
            </View>
            <Ionicons
                name={collapsed ? 'chevron-down' : 'chevron-up'}
                size={16}
                color={themeConfig.text.muted}
                style={styles.sectionChevron}
            />
        </TouchableOpacity>
    );
}

function ReservationRow({ item, onPress, onEdit }: { item: Reservation; onPress: () => void; onEdit?: () => void }) {
    const { floors } = useClubData();
    const tableLabel = item.tables?.[0]
        ? floors.flatMap(f => f.objects).find(o => o.id === item.tables![0])?.label ?? item.tables[0]
        : undefined;

    return (
        <TouchableOpacity
            style={[
                styles.row,
                item.status !== undefined && STATUS_STYLE[item.status],
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Details */}
            <View style={styles.infoCol}>

                <Text style={styles.nameText} numberOfLines={1}>
                    {item.firstName} {item.lastName}
                </Text>

                <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={13} color={themeConfig.text.muted} />
                    <Text style={styles.metaText}>{item.clientsCount}</Text>
                    {item.reservationDate && (
                        <>
                            <View style={styles.metaSpacer} />
                            <MaterialIcons name="table-bar" size={13} color={themeConfig.text.muted} />
                            <Text style={styles.metaText}>{tableLabel}</Text>
                        </>
                    )}
                    <View style={styles.metaSpacer} />
                    <Ionicons name="time" size={13} color={themeConfig.text.muted} />
                    <Text style={styles.metaText}>{formatTime(item.reservationDate)}</Text>
                </View>

                {item.comment ? (
                    <View style={styles.metaRow}>
                        <Ionicons name="chatbubble-outline" size={13} color={themeConfig.text.muted} />
                        <Text style={styles.commentText} numberOfLines={1}>{item.comment}</Text>
                    </View>
                ) : (
                    <View style={styles.metaRow}>
                        <Ionicons name="chatbubble-outline" size={13} color={themeConfig.background.secondary} />
                        <Text style={[styles.commentText, { color: themeConfig.text.muted, opacity: 0.4 }]}>—</Text>
                    </View>
                )}

            </View>

            {onEdit && (
                <TouchableOpacity style={styles.rowEditBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
                    <Ionicons name="pencil" size={18} color={themeConfig.accent.primary} />
                </TouchableOpacity>
            )}

        </TouchableOpacity>
    );
}

// ── Detail modal ─────────────────────────────────────────────────────────────

const DETAIL_CANVAS_W = 900;
const DETAIL_CANVAS_H = 600;

function ReservationDetailModal({
    reservation,
    visible,
    tableColorOverrides,
    onClose,
    onEdit,
}: {
    reservation: Reservation | null;
    visible: boolean;
    tableColorOverrides: Record<string, string>;
    onClose: () => void;
    onEdit: () => void;
}) {
    const { floors } = useClubData();
    const insets = useSafeAreaInsets();
    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const [containerW, setContainerW] = useState(0);
    const [containerH, setContainerH] = useState(0);

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
                    .start(() => { onCloseRef.current(); translateY.setValue(0); });
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

    const tableFloor = reservation?.tables?.[0]
        ? floors.find(f => f.objects.some(o => o.id === reservation.tables![0]))
        : undefined;

    const canvasW = Math.max(tableFloor?.width ?? DETAIL_CANVAS_W, DETAIL_CANVAS_W);
    const canvasH = Math.max(tableFloor?.height ?? DETAIL_CANVAS_H, DETAIL_CANVAS_H);
    const screenIsPortrait = containerH > containerW;
    const shouldRotate = canvasW > canvasH && screenIsPortrait;
    const displayW = shouldRotate ? canvasH : canvasW;
    const displayH = shouldRotate ? canvasW : canvasH;
    const scale = containerW > 0 && containerH > 0
        ? Math.min(containerW / displayW, containerH / displayH)
        : 1;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <View style={[detailStyles.backdrop, { paddingTop: Math.max(20, insets.top), paddingBottom: Math.max(20, insets.bottom) }]}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[detailStyles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }, { translateY }] }]}
                >
                    {/* Drag pill */}
                    <View style={detailStyles.pillRow}>
                        <View style={detailStyles.pill} />
                    </View>

                    {/* Info row — reuse the same list row component */}
                    {reservation && (
                        <View style={detailStyles.rowWrapper}>
                            <ReservationRow item={reservation} onPress={() => {}} onEdit={onEdit} />
                        </View>
                    )}

                    {/* Floor canvas */}
                    <View
                        style={detailStyles.canvasWrapper}
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
                                        pulsingTableId={reservation?.tables?.[0] ?? undefined}
                                        onDeselect={() => {}}
                                        onSelect={() => {}}
                                        onUpdate={() => {}}
                                        onDuplicate={() => {}}
                                    />
                                </View>
                            </View>
                        )}
                        {!tableFloor && (
                            <View style={detailStyles.noFloor}>
                                <Ionicons name="map-outline" size={32} color={themeConfig.text.muted} />
                                <Text style={detailStyles.noFloorText}>No table assigned</Text>
                            </View>
                        )}
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
}

const detailStyles = StyleSheet.create({
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
});

// ── Screen ────────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

export default function Reservations() {
    const { loadLayout, floors } = useClubData();
    const clubId = (globalThis as any).myClubs?.[0]?.id;

    const [modalVisible, setModalVisible] = useState(false);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [detailReservation, setDetailReservation] = useState<Reservation | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [schemaVisible, setSchemaVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
    const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
    const [collapsedSections, setCollapsedSections] = useState<Set<ReservationStatus>>(
        () => new Set([ReservationStatus.GONE, ReservationStatus.CANCELLED])
    );

    const toggleSection = (status: ReservationStatus) =>
        setCollapsedSections(prev => {
            const next = new Set(prev);
            next.has(status) ? next.delete(status) : next.add(status);
            return next;
        });

    const STATUS_COLOR: Partial<Record<ReservationStatus, string>> = {
        [ReservationStatus.OPEN]:     '#eab308',
        [ReservationStatus.APPROVED]: '#94a3b8',
        [ReservationStatus.SEATED]:   '#22c55e',
    };

    const tableColorOverrides = useMemo<Record<string, string>>(() => {
        const overrides: Record<string, string> = {};
        for (const r of filteredReservations) {
            if (!r.tables?.[0] || r.status === undefined) continue;
            const color = STATUS_COLOR[r.status];
            if (color) overrides[r.tables[0]] = color;
        }
        return overrides;
    }, [filteredReservations]);

    const sections = useMemo(() => {
        const grouped = new Map<ReservationStatus, Reservation[]>();
        for (const r of filteredReservations) {
            if (r.status === undefined) continue;
            if (!grouped.has(r.status)) grouped.set(r.status, []);
            grouped.get(r.status)!.push(r);
        }
        return SECTION_CONFIG
            .filter(cfg => grouped.has(cfg.status))
            .map(cfg => ({
                ...cfg,
                key: String(cfg.status),
                data: collapsedSections.has(cfg.status) ? [] : (grouped.get(cfg.status) ?? []),
                count: grouped.get(cfg.status)?.length ?? 0,
            }));
    }, [filteredReservations, collapsedSections]);

    const stats = useMemo(() => {
        const allObjects = floors.flatMap(f => f.objects);
        const tableCapacity = (tableId?: string) =>
            tableId ? (allObjects.find(o => o.id === tableId)?.capacity ?? 0) : 0;

        const active = filteredReservations.filter(r => r.status !== ReservationStatus.CANCELLED);
        const reservationCount = active.length;
        const peopleCount = active.reduce((sum, r) =>
            sum + (r.clientsCount ?? tableCapacity(r.tables?.[0])), 0);
        const seatedCount = filteredReservations
            .filter(r => r.status === ReservationStatus.SEATED || r.status === ReservationStatus.GONE)
            .reduce((sum, r) => sum + (r.clientsCount ?? tableCapacity(r.tables?.[0])), 0);

        return [
            { value: reservationCount, label: 'reserv.' },
            { value: peopleCount,      label: 'people' },
            { value: seatedCount,      label: 'seated' },
        ];
    }, [filteredReservations, floors]);

    useEffect(() => { loadLayout(clubId); }, [clubId]);

    const [refreshing, setRefreshing] = useState(false);

    const fetchReservations = async () => {
        const reservations = await getReservations() as any;
        setFilteredReservations(reservations.data as any);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchReservations();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchReservations();
    }, [selectedDate]);

    const shiftDay = (delta: number) =>
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + delta);
            return d;
        });

    const openDetail = (item: Reservation) => {
        setDetailReservation(item);
        setDetailVisible(true);
    };

    const closeDetail = () => setDetailVisible(false);

    const openEdit = (item: Reservation) => {
        setDetailVisible(false);
        setEditingReservation(item);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setEditingReservation(null);
    };

    const handleSave = (saved: Reservation) => {
        setFilteredReservations(prev =>
            editingReservation
                ? prev.map(r => r.id === saved.id ? saved : r)
                : [...prev, saved]
        );
        setDetailReservation(prev => prev?.id === saved.id ? saved : prev);
        closeModal();
    };

    const todayMidnight = startOfDay(new Date());
    const isSelectedToday = selectedDate.getTime() === todayMidnight.getTime();

    const navLabel = selectedDate.toLocaleDateString('en-US', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
        <View style={[adminStyles.adminPage, styles.container]}>
            <Stack.Screen
                options={{
                    header: () => (
                        <ReservationsHeader
                            navLabel={navLabel}
                            isSelectedToday={isSelectedToday}
                            onPrev={() => shiftDay(-1)}
                            onNext={() => shiftDay(1)}
                            onNew={() => setModalVisible(true)}
                        />
                    ),
                }}
            />

            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <ReservationRow item={item as Reservation} onPress={() => openDetail(item as Reservation)} />}
                renderSectionHeader={({ section }) => (
                    <SectionHeader
                        label={section.label}
                        accent={section.accent}
                        count={section.count}
                        collapsed={collapsedSections.has(section.status)}
                        onToggle={() => toggleSection(section.status)}
                    />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="ticket-outline" size={48} color={themeConfig.text.muted} />
                        <Text style={styles.emptyText}>No reservations for this day</Text>
                    </View>
                }
                ListHeaderComponent={
                    <View style={styles.statsRow}>
                        {stats.map(s => (
                            <View key={s.label} style={styles.statCard}>
                                <Text style={styles.statValue}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                        ))}
                    </View>
                }
                stickySectionHeadersEnabled={false}
                style={styles.list}
                contentContainerStyle={sections.length === 0 ? styles.listEmpty : undefined}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={themeConfig.accent.primary}
                    />
                }
            />

            {/* Open schema button */}
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAbsolute]} onPress={() => setSchemaVisible(true)} activeOpacity={0.85}>
                <Ionicons name="map-outline" size={16} color={themeConfig.text.inverse} />
                <Text style={styles.actionBtnText}>Open schema</Text>
            </TouchableOpacity>

            <ReservationDetailModal
                reservation={detailReservation}
                visible={detailVisible}
                tableColorOverrides={tableColorOverrides}
                onClose={closeDetail}
                onEdit={() => detailReservation && openEdit(detailReservation)}
            />

            <ReservationFormModal
                visible={modalVisible}
                reservation={editingReservation ?? undefined}
                tableColorOverrides={tableColorOverrides}
                onClose={closeModal}
                onSave={handleSave}
            />

            <SchemaViewerModal
                visible={schemaVisible}
                tableColorOverrides={tableColorOverrides}
                onClose={() => setSchemaVisible(false)}
            />

        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        flex: 1,
        marginTop: 12,
    },
    listEmpty: {
        flex: 1,
    },
    separator: {
        height: 4,
        backgroundColor: themeConfig.border.subtle,
        marginHorizontal: 4,
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 8,
        alignItems: 'stretch',
        borderRadius: 12,
    },
    rowSeated: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 1,
        borderColor: '#22c55e',
    },
    rowCancelled: {
        opacity: 0.45,
        backgroundColor: 'rgba(120, 120, 120, 0.12)',
    },
    dateCol: {
        width: 100,
        justifyContent: 'center',
        paddingRight: 12,
    },
    dateText: {
        fontSize: 13,
        fontWeight: '600',
        color: themeConfig.text.primary,
        marginBottom: 4,
    },
    timeText: {
        fontSize: 12,
        color: themeConfig.text.muted,
    },
    divider: {
        width: 1,
        backgroundColor: themeConfig.border.subtle,
        marginRight: 12,
    },
    infoCol: {
        flex: 1,
        justifyContent: 'center',
        gap: 5,
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
        fontWeight: 600,
        flex: 1,
    },
    dateNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginBottom: 4,
    },
    dateNavCenter: {
        alignItems: 'center',
        gap: 4,
    },
    dateNavText: {
        fontSize: 15,
        fontWeight: '700',
        color: themeConfig.text.primary,
    },
    todayBadge: {
        fontSize: 11,
        fontWeight: '600',
        color: themeConfig.accent.primary,
        letterSpacing: 0.5,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        // paddingTop: 60,
    },
    emptyText: {
        fontSize: 15,
        color: themeConfig.text.muted,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: themeConfig.accent.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 36,
    },
    actionBtnRow: {
        // marginHorizontal: 16,
        marginBottom: 12,
    },
    actionBtnAbsolute: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: themeConfig.text.inverse,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginTop: 8,
        marginBottom: 2,
    },
    sectionAccentBar: {
        width: 3,
        height: 16,
        borderRadius: 2,
        marginRight: 8,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: themeConfig.text.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        flex: 1,
    },
    sectionBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: 6,
    },
    sectionBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    sectionChevron: {
        marginLeft: 2,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 4,
        paddingBottom: 12,
    },
    statCard: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: themeConfig.border.subtle,
        backgroundColor: themeConfig.background.secondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: themeConfig.text.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: themeConfig.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
