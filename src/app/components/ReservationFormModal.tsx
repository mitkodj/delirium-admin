import React, { useState, useEffect } from 'react';
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
    Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import { createReservation, updateReservation, CreateReservationPayload } from '../../utils/service';
import { TIME_PRESETS } from '../../utils/constants';
import { useClubData } from '../../providers/ClubDataContext';
import { Reservation, ReservationStatus } from '../../types/Disco';
import TableSelectorModal from './TableSelectorModal';

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

    const phoneValid = phone.length === 0 || PHONE_RE.test(phone);
    const allObjects = floors.flatMap(f => f.objects);
    const numPeople = parseInt(clientsCount, 10);
    const totalCapacity = selectedTables.reduce(
        (sum, t) => sum + (allObjects.find(o => o.id === t.id)?.capacity ?? 0), 0
    );
    const capacityExceeded = selectedTables.length > 0 && !isNaN(numPeople) && numPeople > totalCapacity;
    const saveBtnEnabled = !!(firstName && lastName && phone && phoneValid);

    useEffect(() => {
        if (visible && club?.id) loadLayout(club.id);
    }, [visible]);

    useEffect(() => {
        if (!visible || !reservation) return;
        setFirstName(reservation.firstName);
        setLastName(reservation.lastName);
        setDate(new Date(reservation.reservationDate));
        setClientsCount(String(reservation.clientsCount ?? ''));
        setPhone(reservation.phoneNumber);
        setComment(reservation.comment ?? '');
        setSelectedTables(reservation.tables?.map(id => ({ id, label: id })) ?? []);
        setStatus(reservation.status ?? ReservationStatus.OPEN);
    }, [visible, reservation]);

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

    const handleTableChosen = (tables: SelectedTable[]) => {
        setSelectedTables(tables);
    };

    const handleRemoveTable = (index: number) => {
        setSelectedTables(prev => prev.filter((_, i) => i !== index));
    };

    const performSave = async () => {
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
                await updateReservation(reservation!.id, payload);
                saved = { ...reservation!, ...payload };
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

    const handleSave = () => {
        if (capacityExceeded) {
            Alert.alert(
                'Capacity exceeded',
                `The selected table${selectedTables.length > 1 ? 's have' : ' has'} a total capacity of ${totalCapacity}, but the reservation is for ${numPeople} people. Do you still want to proceed?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Proceed', style: 'destructive', onPress: performSave },
                ]
            );
        } else {
            performSave();
        }
    };

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setDate(new Date());
        setClientsCount('');
        setSelectedTables([]);
        setPhone('');
        setComment('');
        setStatus(ReservationStatus.OPEN);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
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
                        {TIME_PRESETS.map(({ label, hour }, i) => {
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

                    {/* No. of people */}
                    <TextInput
                        style={styles.input}
                        placeholder="No. of people"
                        placeholderTextColor={themeConfig.text.muted}
                        value={clientsCount}
                        onChangeText={setClientsCount}
                        keyboardType="number-pad"
                    />

                    {/* Table selector */}
                    <View style={[styles.tableField, selectedTables.length > 0 && styles.tableFieldFilled]}>
                        {selectedTables.length === 0 ? (
                            <TouchableOpacity style={styles.tableFieldEmpty} onPress={() => setShowTableSelector(true)} activeOpacity={0.7}>
                                <Text style={styles.placeholder}>Select table</Text>
                                <Ionicons name="add-circle-outline" size={16} color={themeConfig.accent.primary} />
                            </TouchableOpacity>
                        ) : (
                            <>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.tablePillsScroll}
                                    contentContainerStyle={styles.tablePillsContent}
                                >
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
                                </ScrollView>
                                <TouchableOpacity onPress={() => setShowTableSelector(true)} activeOpacity={0.7} style={styles.tableAddBtn}>
                                    <Ionicons name="add-circle-outline" size={20} color={themeConfig.accent.primary} />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

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
            {Platform.OS === 'ios' ? (
                <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerContainer}>
                            <DateTimePicker value={date} mode="date" display="inline" onChange={mergeDate} themeVariant="dark" style={styles.picker} />
                            <TouchableOpacity style={styles.pickerDone} onPress={() => setShowDatePicker(false)}>
                                <Text style={styles.pickerDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            ) : showDatePicker ? (
                <DateTimePicker value={date} mode="date" display="default" onChange={mergeDate} />
            ) : null}

            {/* Time picker */}
            {Platform.OS === 'ios' ? (
                <Modal transparent animationType="slide" visible={showTimePicker} onRequestClose={() => setShowTimePicker(false)}>
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerContainer}>
                            <DateTimePicker value={date} mode="time" display="spinner" onChange={mergeTime} themeVariant="dark" style={styles.picker} />
                            <TouchableOpacity style={styles.pickerDone} onPress={() => setShowTimePicker(false)}>
                                <Text style={styles.pickerDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            ) : showTimePicker ? (
                <DateTimePicker value={date} mode="time" display="default" onChange={mergeTime} />
            ) : null}

            {/* Table selector */}
            <TableSelectorModal
                visible={showTableSelector}
                initialSelectedIds={selectedTables.map(t => t.id)}
                clientsCount={isNaN(numPeople) ? undefined : numPeople}
                currentStatusColor={currentStatusColor}
                tableColorOverrides={tableColorOverrides}
                onClose={() => setShowTableSelector(false)}
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
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 14,
        backgroundColor: 'transparent',
        minHeight: 46,
    },
    tableFieldFilled: {
        borderColor: themeConfig.accent.primary,
    },
    tableFieldEmpty: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tablePillsScroll: {
        flex: 1,
    },
    tablePillsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 2,
    },
    tableAddBtn: {
        paddingLeft: 10,
    },
    placeholder: {
        color: themeConfig.text.muted,
        fontSize: 14,
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
