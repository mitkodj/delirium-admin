import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    SectionList, RefreshControl, Platform, Modal, Pressable, Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import ReservationFormModal from '../components/ReservationFormModal';
import ReservationDetailModal from '../components/ReservationDetailModal';
import AddButton from '../components/AddButton';
import SchemaViewerModal from '../components/SchemaViewerModal';
import { Reservation, ReservationStatus, DEvent } from '../../types/Disco';
import adminStyles from './styles/adminStyles';
import { useSidebar } from '../../providers/SidebarContext';
import { useClubData } from '../../providers/ClubDataContext';
import { getReservations, updateReservation, fetchEventsForDate } from '../../utils/service';
import { ReservationRow } from '../components/ReservationRow';
import { buildAssetUrl } from '../../helpers/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function ReservationsHeader({ navLabel, isSelectedToday, onPrev, onNext, onNew, onPickDate }: {
    navLabel: string;
    isSelectedToday: boolean;
    onPrev: () => void;
    onNext: () => void;
    onNew: () => void;
    onPickDate: () => void;
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
                <TouchableOpacity style={headerStyles.labelWrap} onPress={onPickDate} activeOpacity={0.7}>
                    <Text style={headerStyles.navText}>{navLabel}</Text>
                    {isSelectedToday && <Text style={headerStyles.todayBadge}>Today</Text>}
                </TouchableOpacity>
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
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [pendingDate, setPendingDate] = useState(() => startOfDay(new Date()));
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [currentEvent, setCurrentEvent] = useState<DEvent | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredReservations = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return reservations;
        return reservations.filter(r =>
            r.firstName.toLowerCase().includes(q) ||
            r.lastName.toLowerCase().includes(q) ||
            r.comment?.toLowerCase().includes(q)
        );
    }, [reservations, searchQuery]);
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
            if (!r.tables?.length || r.status === undefined) continue;
            const color = STATUS_COLOR[r.status];
            if (color) for (const id of r.tables) overrides[id] = color;
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

    const fetchEvents = async () => {
        const clubId = (globalThis as any).myClubs?.[0]?.id;
        const events = await fetchEventsForDate(selectedDate, clubId) as any;
        setCurrentEvent((events.data as any)[0] ?? null);
    };

    useEffect(() => {
        fetchEvents();
    }, [pendingDate]);

    const [refreshing, setRefreshing] = useState(false);

    const fetchReservations = async () => {
        const clubId = (globalThis as any).myClubs?.[0]?.id;
        const [reservations] = await Promise.all([
            getReservations(selectedDate, clubId) as any,
            
        ]);
        setReservations(reservations.data as any);
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

    const updateStatus = async (item: Reservation, status: ReservationStatus) => {
        const clubId = (globalThis as any).myClubs?.[0]?.id;
        await updateReservation(item.id, {
            discoId: clubId,
            firstName: item.firstName,
            lastName: item.lastName,
            reservationDate: item.reservationDate,
            tables: item.tables ?? undefined,
            phoneNumber: item.phoneNumber,
            comment: item.comment,
            clientsCount: item.clientsCount ?? 1,
            status,
        });
        const updated = { ...item, status };
        setReservations(prev => prev.map(r => r.id === item.id ? updated : r));
        setDetailReservation(prev => prev?.id === item.id ? updated : prev);
    };

    const handleApprove = (item: Reservation) => updateStatus(item, ReservationStatus.APPROVED);
    const handleSeat    = (item: Reservation) => updateStatus(item, ReservationStatus.SEATED);
    const handleGone    = (item: Reservation) => updateStatus(item, ReservationStatus.GONE);

    const handleCancel = async (item: Reservation) => {
        const clubId = (globalThis as any).myClubs?.[0]?.id;
        await updateReservation(item.id, {
            discoId: clubId,
            firstName: item.firstName,
            lastName: item.lastName,
            reservationDate: item.reservationDate,
            tables: item.tables ?? undefined,
            phoneNumber: item.phoneNumber,
            comment: item.comment,
            clientsCount: item.clientsCount ?? 1,
            status: ReservationStatus.CANCELLED,
        });
        const cancelled = { ...item, status: ReservationStatus.CANCELLED };
        setReservations(prev => prev.map(r => r.id === item.id ? cancelled : r));
        setDetailReservation(prev => prev?.id === item.id ? cancelled : prev);
    };

    const handleSave = (saved: Reservation) => {
        setReservations(prev =>
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

    console.log(currentEvent?.banner, buildAssetUrl(currentEvent?.banner as string));
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
                            onPickDate={() => { setPendingDate(selectedDate); setDatePickerVisible(true); }}
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
                    <>
                        <View style={styles.statsRow}>
                            {stats.map(s => (
                                <View key={s.label} style={styles.statCard}>
                                    <Text style={styles.statValue}>{s.value}</Text>
                                    <Text style={styles.statLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.searchRow}>
                            <Ionicons name="search-outline" size={16} color={themeConfig.text.muted} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name or comment..."
                                placeholderTextColor={themeConfig.text.muted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                returnKeyType="search"
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </>
                }
                stickySectionHeadersEnabled={false}
                ListFooterComponent={<View style={styles.listFooter} />}
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
                onApprove={() => detailReservation && handleApprove(detailReservation)}
                onSeat={() => detailReservation && handleSeat(detailReservation)}
                onGone={() => detailReservation && handleGone(detailReservation)}
                onCancel={() => detailReservation && handleCancel(detailReservation)}
                onUpdateStatus={(status) => detailReservation && updateStatus(detailReservation, status)}
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
                reservations={reservations}
                onClose={() => setSchemaVisible(false)}
                onPressReservation={(r) => {
                    setSchemaVisible(false);
                    openDetail(r);
                }}
            />

            <Modal transparent visible={datePickerVisible} animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
                <Pressable style={styles.datePickerBackdrop} onPress={() => setDatePickerVisible(false)}>
                    <View style={styles.datePickerCard}>
                        {currentEvent?.banner ? (
                            <View style={styles.eventBannerWrap}>
                                <Image source={{ uri: buildAssetUrl(currentEvent.banner) }} style={styles.eventBanner} resizeMode="cover" />
                            </View>
                        ) : null}
                        <DateTimePicker
                            value={pendingDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                            themeVariant="dark"
                            accentColor="#eab308"
                            onChange={(_, date) => {
                                if (date) setPendingDate(startOfDay(date));
                            }}
                        />
                        <TouchableOpacity
                            style={styles.datePickerSelectBtn}
                            onPress={() => { setSelectedDate(pendingDate); setDatePickerVisible(false); }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.datePickerSelectBtnText}>Select</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

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
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeConfig.background.secondary,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        marginHorizontal: 4,
        marginBottom: 4,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
        color: themeConfig.text.primary,
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
    listFooter: {
        height: 88,
    },
    datePickerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    datePickerCard: {
        backgroundColor: themeConfig.background.secondary,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        padding: 8,
        paddingBottom: 24,
        alignItems: 'center',
    },
    eventBannerWrap: {
        marginHorizontal: 4,
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        height: 160,
        alignSelf: 'stretch',
    },
    eventBanner: {
        width: '100%',
        height: '100%',
    },
    eventBannerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    eventBannerName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    datePickerSelectBtn: {
        marginTop: 8,
        marginHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: themeConfig.accent.primary,
        alignItems: 'center',
        width: '80%',
    },
    datePickerSelectBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: themeConfig.text.inverse,
    },
});
