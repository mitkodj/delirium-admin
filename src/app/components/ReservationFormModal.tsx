import React, { useState, useEffect, useRef } from 'react';
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
import { createReservation, updateReservation, fetchContactsByPhone, CreateReservationPayload, ReservationContact } from '../../utils/service';
import { useClubData } from '../../providers/ClubDataContext';
import { Reservation, ReservationStatus } from '../../types/Disco';
import TableSelectorModal from './TableSelectorModal';
import { TabletModalWrapper } from '../../helpers/useTabletModalStyle';

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

type SelectedTable = { id: string; label: string };

type Props = {
    visible: boolean;
    reservation?: Reservation;
    initialTableId?: string | null;
    tableColorOverrides?: Record<string, string>;
    onClose: () => void;
    onSave: (saved: Reservation) => void;
};

export default function ReservationFormModal({ visible, reservation, initialTableId, tableColorOverrides, onClose, onSave }: Props) {
    const isEdit = !!reservation;
    const club = (globalThis as any).myClubs?.[0];

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [date, setDate] = useState(new Date());
    const [clientsCount, setClientsCount] = useState('');
    const [selectedTables, setSelectedTables] = useState<SelectedTable[]>([]);
    const [phone, setPhone] = useState('');
    const [comment, setComment] = useState('');
    const [status, setStatus] = useState<ReservationStatus>(ReservationStatus.APPROVED);

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
    const [contactSuggestions, setContactSuggestions] = useState<ReservationContact[]>([]);
    const [selectedSuggestionPhone, setSelectedSuggestionPhone] = useState<string | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const phoneValid = phone.length === 0 || PHONE_RE.test(phone);
    const allObjects = floors.flatMap(f => f.objects);
    const numPeople = parseInt(clientsCount, 10);
    const totalCapacity = selectedTables.reduce(
        (sum, t) => sum + (allObjects.find(o => o.id === t.id)?.capacity ?? 0), 0
    );
    const capacityExceeded = selectedTables.length > 0 && !isNaN(numPeople) && numPeople > totalCapacity;
    const saveBtnEnabled = !!(firstName && phoneValid);

    useEffect(() => {
        if (visible && club?.id) loadLayout(club.id);
    }, [visible]);

    useEffect(() => {
        if (!visible || reservation) return;
        if (initialTableId) setSelectedTables([{ id: initialTableId, label: initialTableId }]);
        const defaultHour = club?.defaultStartHour;
        if (defaultHour) {
            const [h, m] = defaultHour.split(':').map(Number);
            if (!isNaN(h)) {
                setDate(prev => {
                    const d = new Date(prev);
                    d.setHours(h, isNaN(m) ? 0 : m, 0, 0);
                    return d;
                });
            }
        }
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

    useEffect(() => {
        setContactSuggestions([]);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (!visible || !phone || phone.replace(/\D/g, '').length < 7) return;
        debounceTimer.current = setTimeout(async () => {
            const contacts = await fetchContactsByPhone(club?.id, phone);
            setContactSuggestions(contacts);
        }, 600);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [phone, visible]);

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

    const applyTimePreset = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const merged = new Date(date);
        merged.setHours(h, isNaN(m) ? 0 : m, 0, 0);
        setDate(merged);
    };

    const timePresets: { label: string; time: string | null }[] = [
        { label: 'Daytime',   time: club?.dayTimeStart   ?? null },
        { label: 'Nighttime', time: club?.nightTimeStart ?? null },
    ];

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
                await updateReservation(club?.id, reservation!.id, payload);
                saved = { ...reservation!, ...payload };
            } else {
                const res = await createReservation(club?.id, payload);
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
        setStatus(ReservationStatus.APPROVED);
        setError(null);
        setContactSuggestions([]);
        setSelectedSuggestionPhone(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose} supportedOrientations={['portrait', 'landscape']}>
            <TabletModalWrapper style={styles.container}>

                <Text style={styles.title}>{isEdit ? 'Edit Reservation' : 'New Reservation'}</Text>

                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag">

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
                        {timePresets.map(({ label, time }, i) => {
                            const [ph, pm] = time ? time.split(':').map(Number) : [NaN, NaN];
                            const active = !isNaN(ph) && date.getHours() === ph && date.getMinutes() === (isNaN(pm) ? 0 : pm);
                            const disabled = !time;
                            return (
                                <React.Fragment key={label}>
                                    {i > 0 && <View style={styles.rowGap} />}
                                    <TouchableOpacity
                                        style={[styles.presetBtn, styles.flex1, active && styles.presetBtnActive, disabled && styles.presetBtnDisabled]}
                                        onPress={() => time && applyTimePreset(time)}
                                        activeOpacity={disabled ? 1 : 0.7}
                                        disabled={disabled}
                                    >
                                        <Text style={[styles.presetBtnText, active && styles.presetBtnTextActive, disabled && styles.presetBtnTextDisabled]}>{label}</Text>
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

                    {/* Contact suggestions list */}
                    {contactSuggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            <Text style={styles.suggestionsHeader}>Suggestions based on phone:</Text>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {contactSuggestions.map((c, i) => {
                                    const isSelected = firstName === c.firstName && lastName === c.lastName;
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.suggestionItem, isSelected && styles.suggestionItemSelected]}
                                            onPress={() => {
                                                setFirstName(c.firstName);
                                                setLastName(c.lastName);
                                                setSelectedSuggestionPhone(c.phoneNumber);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.suggestionItemContent}>
                                                <View style={styles.suggestionItemRow}>
                                                    <Ionicons name="person-outline" size={16} color={isSelected ? themeConfig.accent.primary : themeConfig.text.muted} />
                                                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.suggestionItemText, isSelected && styles.suggestionItemTextSelected]}>{c.firstName} {c.lastName}</Text>
                                                    {c.reservationDate && (
                                                        <View style={styles.suggestionDateInline}>
                                                            <Ionicons name="calendar-outline" size={11} color={themeConfig.text.muted} />
                                                            <Text style={styles.suggestionDateText}>
                                                                {new Date(c.reservationDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    {isSelected && (
                                                        <Ionicons name="checkmark-circle" size={18} color={themeConfig.accent.primary} />
                                                    )}
                                                </View>
                                                {c.comment && (
                                                    <View style={styles.suggestionMetaRow}>
                                                        <Ionicons name="chatbubble-outline" size={12} color={themeConfig.text.muted} />
                                                        <Text style={styles.suggestionMetaText} numberOfLines={1}>{c.comment}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

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

            </TabletModalWrapper>

            {/* Date picker */}
            {Platform.OS === 'ios' ? (
                <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)} supportedOrientations={['portrait', 'landscape']}>
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
                <Modal transparent animationType="slide" visible={showTimePicker} onRequestClose={() => setShowTimePicker(false)} supportedOrientations={['portrait', 'landscape']}>
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
    presetBtnDisabled: {
        opacity: 0.35,
    },
    presetBtnTextDisabled: {
        color: themeConfig.text.muted,
    },
    suggestionsContainer: {
        flex: 1,
        borderTopWidth: 1,
        borderTopColor: themeConfig.border.subtle,
        paddingTop: 10,
        marginTop: 4,
    },
    suggestionsHeader: {
        fontSize: 11,
        fontWeight: '600',
        color: themeConfig.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    suggestionItem: {
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 4,
        backgroundColor: themeConfig.background.secondary,
    },
    suggestionItemSelected: {
        borderWidth: 1,
        borderColor: themeConfig.accent.primary,
    },
    suggestionItemContent: {
        flex: 1,
        gap: 4,
    },
    suggestionItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    suggestionItemText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: themeConfig.text.primary,
    },
    suggestionItemTextSelected: {
        color: themeConfig.accent.primary,
    },
    suggestionDateInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginLeft: 'auto',
    },
    suggestionDateText: {
        fontSize: 14,
        fontWeight: '500',
        color: themeConfig.text.muted,
    },
    suggestionMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingTop: 6,
    },
    suggestionMetaText: {
        fontSize: 12,
        color: themeConfig.text.muted,
        flex: 1,
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
        alignItems: 'center',
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
