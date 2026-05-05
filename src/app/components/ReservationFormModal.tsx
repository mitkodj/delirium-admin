import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import { createReservation, updateReservation, CreateReservationPayload } from '../../utils/service';
import { FloorObject } from '../../types/FloorMap';
import { useClubData } from '../../providers/ClubDataContext';
import { Reservation, ReservationStatus } from '../../types/Disco';
import TableSelectorModal from './TableSelectorModal';

const TABLE_TYPES = new Set(['table_circle', 'table_vip_rect']);
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

type SelectedTable = { id: string; label: string };

type Props = {
    visible: boolean;
    reservation?: Reservation;
    tableColorOverrides?: Record<string, string>;
    onClose: () => void;
    onSave: (saved: Reservation) => void;
};

export default function ReservationFormModal({ visible, reservation, tableColorOverrides, onClose, onSave }: Props) {
    const isEdit = !!reservation;
    const club = (globalThis as any).myClubs?.[0];

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [date, setDate] = useState(new Date());
    const [clientsCount, setClientsCount] = useState('');
    const [selectedTables, setSelectedTables] = useState<SelectedTable[]>([]);
    const [isAddingMore, setIsAddingMore] = useState(false);
    const [phone, setPhone] = useState('');
    const [comment, setComment] = useState('');
    const [status, setStatus] = useState<ReservationStatus>(ReservationStatus.OPEN);

    const { floors, loadLayout } = useClubData();

    const STATUS_COLOR: Partial<Record<ReservationStatus, string>> = {
        [ReservationStatus.OPEN]:     '#eab308',
        [ReservationStatus.APPROVED]: '#94a3b8',
        [ReservationStatus.SEATED]:   '#22c55e',
    };
    const currentStatusColor = STATUS_COLOR[status];
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showTableSelector, setShowTableSelector] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [overrideCapacity, setOverrideCapacity] = useState(false);

    const phoneValid = phone.length === 0 || PHONE_RE.test(phone);

    const allObjects = floors.flatMap(f => f.objects);
    const numPeople = parseInt(clientsCount, 10);
    const totalCapacity = selectedTables.reduce((sum, t) => {
        return sum + (allObjects.find(o => o.id === t.id)?.capacity ?? 0);
    }, 0);
    const capacityExceeded = selectedTables.length > 0 && !isNaN(numPeople) && numPeople > totalCapacity;

    const resolvedTableLabels = selectedTables.map(t =>
        allObjects.find(o => o.id === t.id)?.label ?? t.label
    );
    const tableFieldText = selectedTables.length === 0
        ? null
        : selectedTables.length === 1
        ? resolvedTableLabels[0]
        : `${resolvedTableLabels[0]} +${selectedTables.length - 1}`;

    const saveBtnEnabled = !!(firstName && lastName && phone && phoneValid && (!capacityExceeded || overrideCapacity));

    // Ensure layout is loaded when modal opens
    useEffect(() => {
        if (visible && club?.id) loadLayout(club.id);
    }, [visible]);

    // Pre-fill form when opening in edit mode
    useEffect(() => {
        if (!visible || !reservation) return;
        setFirstName(reservation.firstName);
        setLastName(reservation.lastName);
        setDate(new Date(reservation.reservationDate));
        setClientsCount(String(reservation.clientsCount ?? ''));
        setPhone(reservation.phoneNumber);
        setComment(reservation.comment ?? '');
        setSelectedTables(
            reservation.tables?.map(id => ({ id, label: id })) ?? []
        );
        setStatus(reservation.status ?? ReservationStatus.OPEN);
    }, [visible, reservation]);

    // Find best-fit table suggestion whenever people count changes
    const suggestedTable = useMemo<FloorObject | null>(() => {
        const n = parseInt(clientsCount, 10);
        if (isNaN(n) || n <= 0) return null;
        const allObjects = floors.flatMap(f => f.objects);
        return allObjects.find(o =>
            TABLE_TYPES.has(o.type) &&
            o.capacity !== undefined &&
            o.capacity === n
        ) ?? null;
    }, [clientsCount, floors]);

    // Auto-fill table field in create mode only (never override an existing selection in edit mode)
    useEffect(() => {
        if (!isEdit && suggestedTable && selectedTables.length === 0) {
            setSelectedTables([{ id: suggestedTable.id, label: suggestedTable.label ?? suggestedTable.id }]);
        }
    }, [suggestedTable]);

    // Reset capacity-override checkbox whenever tables or people count changes
    useEffect(() => { setOverrideCapacity(false); }, [selectedTables, clientsCount]);

    const formatDate = (d: Date) =>
        d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    const formatTime = (d: Date) =>
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const mergeDate = (_: any, selected?: Date) => {
        if (selected) {
            const merged = new Date(date);
            merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
            setDate(merged);
        }
        if (Platform.OS === 'android') setShowDatePicker(false);
    };

    const applyTimePreset = (hour: number) => {
        const merged = new Date(date);
        merged.setHours(hour, 0, 0, 0);
        setDate(merged);
    };

    const mergeTime = (_: any, selected?: Date) => {
        if (selected) {
            const merged = new Date(date);
            merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            setDate(merged);
        }
        if (Platform.OS === 'android') setShowTimePicker(false);
    };

    const handleTableChosen = (t: SelectedTable) => {
        if (isAddingMore) {
            setSelectedTables(prev => [...prev, t]);
        } else {
            setSelectedTables([t]);
        }
        setIsAddingMore(false);
    };

    const handleRemoveTable = (index: number) => {
        setSelectedTables(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        try {
            setError(null);
            setSaving(true);

            const payload: CreateReservationPayload = {
                discoId: club?.id,
                firstName,
                lastName,
                reservationDate: date.toISOString(),
                tables: selectedTables.length > 0 ? selectedTables.map(t => t.id) : undefined,
                phoneNumber: phone,
                comment: comment || undefined,
                status,
                clientsCount: clientsCount ? parseInt(clientsCount, 10) : 1,
            };

            let saved: Reservation;
            if (isEdit) {
                console.log(payload);
                await updateReservation(reservation!.id, payload);
                saved = {
                    ...reservation!,
                    ...payload
                };
            } else {
                const res = await createReservation(payload);
                saved = res?.data ?? { ...payload, id: String(Date.now()) };
            }

            setSaving(false);
            resetForm();
            onSave(saved);
            onClose();
        } catch (e) {
            console.error(e);
            setSaving(false);
            setError('Something went wrong. Please try again.');
        }
    };

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setDate(new Date());
        setClientsCount('');
        setSelectedTables([]);
        setIsAddingMore(false);
        setPhone('');
        setComment('');
        setStatus(ReservationStatus.OPEN);
        setOverrideCapacity(false);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Highlight already-selected tables on the floor map when adding more
    const selectorColorOverrides: Record<string, string> = {
        ...(tableColorOverrides ?? {}),
        ...Object.fromEntries(
            selectedTables.map(t => [t.id, currentStatusColor ?? themeConfig.accent.primary])
        ),
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
            <View style={styles.container}>

                <Text style={styles.title}>{isEdit ? 'Edit Reservation' : 'New Reservation'}</Text>

                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Name row */}
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.flex1]}
                            placeholder="First name"
                            placeholderTextColor={themeConfig.text.muted}
                            value={firstName}
                            onChangeText={setFirstName}
                        />
                        <View style={styles.rowGap} />
                        <TextInput
                            style={[styles.input, styles.flex1]}
                            placeholder="Last name"
                            placeholderTextColor={themeConfig.text.muted}
                            value={lastName}
                            onChangeText={setLastName}
                        />
                    </View>

                    {/* Time presets */}
                    <View style={styles.row}>
                        {[{ label: 'Daytime', hour: 11 }, { label: 'Nighttime', hour: 23 }].map(({ label, hour }, i) => {
                            const active = date.getHours() === hour && date.getMinutes() === 0;
                            return (
                                <React.Fragment key={label}>
                                    {i > 0 && <View style={styles.rowGap} />}
                                    <TouchableOpacity
                                        style={[styles.presetBtn, styles.flex1, active && styles.presetBtnActive]}
                                        onPress={() => applyTimePreset(hour)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.presetBtnText, active && styles.presetBtnTextActive]}>{label}</Text>
                                    </TouchableOpacity>
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {/* Date + Time row */}
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={[styles.pill, styles.flex1]}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar-outline" size={15} color={themeConfig.accent.primary} />
                            <Text style={styles.pillText}>{formatDate(date)}</Text>
                        </TouchableOpacity>
                        <View style={styles.rowGap} />
                        <TouchableOpacity
                            style={[styles.pill, styles.flex1]}
                            onPress={() => setShowTimePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="time-outline" size={15} color={themeConfig.accent.primary} />
                            <Text style={styles.pillText}>{formatTime(date)}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* People + Table row */}
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.flex1]}
                            placeholder="No. of people"
                            placeholderTextColor={themeConfig.text.muted}
                            value={clientsCount}
                            onChangeText={v => { setClientsCount(v); if (!isEdit) setSelectedTables([]); }}
                            keyboardType="number-pad"
                        />
                        <View style={styles.rowGap} />
                        <TouchableOpacity
                            style={[styles.tableField, styles.flex1, selectedTables.length > 0 && styles.tableFieldFilled, capacityExceeded && styles.tableFieldError]}
                            onPress={() => { setIsAddingMore(false); setShowTableSelector(true); }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tableFieldText, selectedTables.length === 0 && styles.placeholder]} numberOfLines={1}>
                                {tableFieldText ?? 'Select table'}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={themeConfig.text.muted} />
                        </TouchableOpacity>
                    </View>

                    {/* Selected table chips (when multiple) */}
                    {selectedTables.length > 1 && (
                        <View style={styles.chipsRow}>
                            {selectedTables.map((t, i) => (
                                <View key={t.id} style={styles.chip}>
                                    <Text style={styles.chipText} numberOfLines={1}>
                                        {allObjects.find(o => o.id === t.id)?.label ?? t.label}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveTable(i)}
                                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                    >
                                        <Ionicons name="close" size={13} color={themeConfig.text.muted} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Capacity exceeded: add more tables or override */}
                    {capacityExceeded && (
                        <>
                            <TouchableOpacity
                                style={styles.addTableBtn}
                                onPress={() => { setIsAddingMore(true); setShowTableSelector(true); }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add-circle-outline" size={16} color={themeConfig.accent.primary} />
                                <Text style={styles.addTableBtnText}>Add another table</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.checkboxRow} onPress={() => setOverrideCapacity(v => !v)} activeOpacity={0.7}>
                                <View style={[styles.checkbox, overrideCapacity && styles.checkboxChecked]}>
                                    {overrideCapacity && <Ionicons name="checkmark" size={13} color={themeConfig.text.inverse} />}
                                </View>
                                <Text style={styles.checkboxLabel}>
                                    I agree to seat {clientsCount} people on {selectedTables.length > 1 ? `${selectedTables.length} tables` : 'a table'} with total capacity {totalCapacity}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Phone */}
                    <TextInput
                        style={[styles.input, !phoneValid && styles.inputError]}
                        placeholder="Phone number"
                        placeholderTextColor={themeConfig.text.muted}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    {!phoneValid && (
                        <Text style={styles.fieldError}>Enter a valid phone number</Text>
                    )}

                    {/* Comment */}
                    <TextInput
                        style={styles.textarea}
                        placeholder="Comment (optional)"
                        placeholderTextColor={themeConfig.text.muted}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        maxLength={512}
                        textAlignVertical="top"
                    />

                </ScrollView>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: club?.accentColor ?? themeConfig.accent.primary }, !saveBtnEnabled && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={!saveBtnEnabled || saving}
                        activeOpacity={0.8}
                    >
                        {saving
                            ? <ActivityIndicator size="small" color={themeConfig.text.inverse} />
                            : <Text style={styles.saveText}>Save</Text>
                        }
                    </TouchableOpacity>
                </View>

            </View>

            {/* Date picker */}
            <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            onChange={mergeDate}
                            themeVariant="dark"
                            style={styles.picker}
                        />
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity style={styles.pickerDone} onPress={() => setShowDatePicker(false)}>
                                <Text style={styles.pickerDoneText}>Done</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Time picker */}
            <Modal transparent animationType="slide" visible={showTimePicker} onRequestClose={() => setShowTimePicker(false)}>
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <DateTimePicker
                            value={date}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={mergeTime}
                            themeVariant="dark"
                            style={styles.picker}
                        />
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity style={styles.pickerDone} onPress={() => setShowTimePicker(false)}>
                                <Text style={styles.pickerDoneText}>Done</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Table selector */}
            <TableSelectorModal
                visible={showTableSelector}
                suggestedTableId={isAddingMore ? null : (selectedTables[0]?.id ?? suggestedTable?.id ?? null)}
                currentStatusColor={currentStatusColor}
                tableColorOverrides={selectorColorOverrides}
                onClose={() => { setShowTableSelector(false); setIsAddingMore(false); }}
                onChoose={handleTableChosen}
            />

        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: 55,
        backgroundColor: themeConfig.background.primary,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: themeConfig.text.primary,
        marginBottom: 20,
    },
    errorBanner: {
        backgroundColor: '#ff4d4d',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    errorText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
    },
    rowGap: { width: 10 },
    flex1: { flex: 1 },
    input: {
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        padding: 12,
        color: themeConfig.text.primary,
        marginBottom: 14,
        fontSize: 14,
    },
    inputError: {
        borderColor: '#ff4d4d',
        marginBottom: 4,
    },
    fieldError: {
        fontSize: 12,
        color: '#ff4d4d',
        marginBottom: 10,
        marginLeft: 4,
    },
    textarea: {
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        padding: 12,
        color: themeConfig.text.primary,
        marginBottom: 14,
        height: 100,
        fontSize: 14,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderWidth: 1.5,
        borderColor: themeConfig.accent.primary,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 14,
        backgroundColor: themeConfig.background.secondary,
    },
    pillText: {
        color: themeConfig.accent.primary,
        fontWeight: '600',
        fontSize: 13,
    },
    tableField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 14,
        backgroundColor: 'transparent',
    },
    tableFieldFilled: {
        borderColor: themeConfig.accent.primary,
    },
    tableFieldError: {
        borderColor: 'rgba(239,68,68,0.7)',
        backgroundColor: 'rgba(239,68,68,0.06)',
    },
    tableFieldText: {
        flex: 1,
        fontSize: 14,
        color: themeConfig.text.primary,
    },
    placeholder: {
        color: themeConfig.text.muted,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: -8,
        marginBottom: 14,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: themeConfig.accent.primary,
        backgroundColor: themeConfig.background.secondary,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: themeConfig.accent.primary,
        maxWidth: 100,
    },
    addTableBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        paddingVertical: 2,
    },
    addTableBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: themeConfig.accent.primary,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
        paddingHorizontal: 2,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: themeConfig.border.subtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: themeConfig.accent.primary,
        borderColor: themeConfig.accent.primary,
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 12,
        color: themeConfig.text.muted,
        lineHeight: 17,
    },
    presetBtn: {
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        alignItems: 'center',
        marginBottom: 14,
    },
    presetBtnActive: {
        borderColor: themeConfig.accent.primary,
        backgroundColor: themeConfig.background.secondary,
    },
    presetBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: themeConfig.text.muted,
    },
    presetBtnTextActive: {
        color: themeConfig.accent.primary,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: themeConfig.background.secondary,
        alignItems: 'center',
    },
    cancelText: {
        color: themeConfig.text.muted,
        fontWeight: '600',
        fontSize: 14,
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveText: {
        color: themeConfig.text.inverse,
        fontWeight: '700',
        fontSize: 14,
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        backgroundColor: '#111',
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    picker: { width: '100%' },
    pickerDone: {
        marginTop: 12,
        alignSelf: 'center',
        paddingVertical: 10,
        paddingHorizontal: 32,
        borderRadius: 8,
        backgroundColor: themeConfig.background.secondary,
    },
    pickerDoneText: {
        color: themeConfig.accent.primary,
        fontWeight: '700',
        fontSize: 14,
    },
});
