import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Image, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import MapPickerModal from '../components/LocationSelectorModal';
import ColorPickerModal from '../components/ColorPickerModal';
import { uploadBanner, updateClub } from '../../utils/service';
import { buildAssetSource } from '../../helpers/utils';
import { Club } from '../../types/Disco';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_BITS = [1, 2, 4, 8, 16, 32, 64];

export default function Profile() {
    const club: Club = (globalThis as any).myClubs?.[0];
    const insets = useSafeAreaInsets();

    const [name, setName] = useState(club?.name ?? '');
    const [phone, setPhone] = useState(club?.phone ?? '');
    const [openDays, setOpenDays] = useState(club?.openDays ?? 0);
    const [location, setLocation] = useState<{ address: string; latitude: number; longitude: number } | null>(
        club?.locationNormalized
            ? { address: club.locationNormalized, latitude: club.location?.latitude ?? 0, longitude: club.location?.longitude ?? 0 }
            : null
    );
    const [banner, setBanner] = useState<string | null>(null);
    const [bannerFileName, setBannerFileName] = useState<string>(club?.defaultBanner ?? '');
    const [bannerChanged, setBannerChanged] = useState(false);
    const [accentColor, setAccentColor] = useState(club?.accentColor ?? '#eab308');
    const [dayEnabled, setDayEnabled] = useState(!!(club?.dayTimeStart));
    const [dayTimeStart, setDayTimeStart] = useState(club?.dayTimeStart ?? '');
    const [dayTimeEnd, setDayTimeEnd] = useState(club?.dayTimeEnd ?? '');
    const [nightEnabled, setNightEnabled] = useState(!!(club?.nightTimeStart));
    const [nightTimeStart, setNightTimeStart] = useState(club?.nightTimeStart ?? '');
    const [nightTimeEnd, setNightTimeEnd] = useState(club?.nightTimeEnd ?? '');
    const [defaultStartHour, setDefaultStartHour] = useState(club?.defaultStartHour ?? '');
    const [activeTimePicker, setActiveTimePicker] = useState<'dayStart' | 'dayEnd' | 'nightStart' | 'nightEnd' | 'defaultStart' | null>(null);
    const [mapVisible, setMapVisible] = useState(false);
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const toggleDay = (bit: number) =>
        setOpenDays(prev => (prev & bit) ? (prev & ~bit) : (prev | bit));

    const timeToDate = (t: string): Date => {
        const d = new Date();
        const [h, m] = t.split(':').map(Number);
        d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
        return d;
    };

    const dateToTime = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    const pickerValue = activeTimePicker
        ? timeToDate(
            activeTimePicker === 'dayStart'     ? dayTimeStart :
            activeTimePicker === 'dayEnd'       ? dayTimeEnd :
            activeTimePicker === 'nightStart'   ? nightTimeStart :
            activeTimePicker === 'nightEnd'     ? nightTimeEnd : defaultStartHour
          )
        : new Date();

    const handleTimePick = (_: any, selected?: Date) => {
        if (Platform.OS === 'android') setActiveTimePicker(null);
        if (!selected) return;
        const t = dateToTime(selected);
        if (activeTimePicker === 'dayStart')     setDayTimeStart(t);
        if (activeTimePicker === 'dayEnd')       setDayTimeEnd(t);
        if (activeTimePicker === 'nightStart')   setNightTimeStart(t);
        if (activeTimePicker === 'nightEnd')     setNightTimeEnd(t);
        if (activeTimePicker === 'defaultStart') setDefaultStartHour(t);
    };

    const pickBanner = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                Alert.alert('Image too large', 'Must be smaller than 10 MB');
                return;
            }
            setBanner(asset.uri);
            setBannerChanged(true);
        }
    };

    const handleSave = async () => {
        if (!club?.id) return;
        if (dayEnabled && (!dayTimeStart.trim() || !dayTimeEnd.trim())) {
            setError('Daytime start and end times are required when Daytime is enabled.');
            return;
        }
        if (nightEnabled && (!nightTimeStart.trim() || !nightTimeEnd.trim())) {
            setError('Nighttime start and end times are required when Nighttime is enabled.');
            return;
        }
        if (!defaultStartHour.trim()) {
            setError('Default start hour is required.');
            return;
        }
        try {
            setSaving(true);
            setSaved(false);
            setError(null);

            let finalBanner = bannerFileName;
            if (bannerChanged && banner) {
                finalBanner = (await uploadBanner(banner) as any).data.fileName;
                setBannerFileName(finalBanner);
                setBannerChanged(false);
            }

            await updateClub(club.id, {
                name,
                locationNormalized: location?.address ?? club.locationNormalized,
                phone,
                openDays,
                defaultBanner: finalBanner,
                accentColor,
                dayTimeStart: dayEnabled ? dayTimeStart.trim() : undefined,
                dayTimeEnd: dayEnabled ? dayTimeEnd.trim() : undefined,
                nightTimeStart: nightEnabled ? nightTimeStart.trim() : undefined,
                nightTimeEnd: nightEnabled ? nightTimeEnd.trim() : undefined,
                defaultStartHour: defaultStartHour.trim(),
            });

            (globalThis as any).myClubs[0] = {
                ...club,
                name,
                locationNormalized: location?.address ?? club.locationNormalized,
                phone,
                openDays,
                defaultBanner: finalBanner,
                accentColor,
                dayTimeStart: dayEnabled ? dayTimeStart.trim() : undefined,
                dayTimeEnd: dayEnabled ? dayTimeEnd.trim() : undefined,
                nightTimeStart: nightEnabled ? nightTimeStart.trim() : undefined,
                nightTimeEnd: nightEnabled ? nightTimeEnd.trim() : undefined,
                defaultStartHour: defaultStartHour.trim(),
            };

            setSaved(true);
        } catch {
            setError('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
            {error && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Banner */}
                <TouchableOpacity style={styles.bannerPicker} onPress={pickBanner} activeOpacity={0.85}>
                    {(banner || bannerFileName) ? (
                        <Image source={bannerChanged && banner ? { uri: banner } : buildAssetSource(bannerFileName)} style={styles.bannerImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.bannerPlaceholder}>
                            <Ionicons name="image-outline" size={36} color={themeConfig.text.muted} />
                            <Text style={styles.bannerPlaceholderText}>Tap to set banner</Text>
                        </View>
                    )}
                    <View style={styles.bannerEditBadge}>
                        <Ionicons name="pencil" size={13} color="#fff" />
                    </View>
                </TouchableOpacity>

                {/* Name */}
                <Text style={styles.label}>Club name</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Club name"
                    placeholderTextColor={themeConfig.text.muted}
                />

                {/* Phone */}
                <Text style={styles.label}>Phone</Text>
                <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 555 000 000"
                    placeholderTextColor={themeConfig.text.muted}
                    keyboardType="phone-pad"
                />

                {/* Open days */}
                <Text style={styles.label}>Open days</Text>
                <View style={styles.daysRow}>
                    {DAYS.map((day, i) => {
                        const active = !!(openDays & DAY_BITS[i]);
                        return (
                            <TouchableOpacity
                                key={day}
                                style={[styles.dayBtn, active && styles.dayBtnActive]}
                                onPress={() => toggleDay(DAY_BITS[i])}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Location */}
                <Text style={styles.label}>Location</Text>
                <TouchableOpacity style={styles.locationBtn} onPress={() => setMapVisible(true)} activeOpacity={0.7}>
                    <Ionicons name="location-outline" size={18} color={themeConfig.accent.primary} />
                    <Text style={styles.locationText} numberOfLines={2}>
                        {location?.address ?? 'Tap to select on map'}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={themeConfig.text.muted} />
                </TouchableOpacity>

                {/* Accent color */}
                <Text style={styles.label}>Accent color</Text>
                <TouchableOpacity style={styles.colorRow} onPress={() => setColorPickerVisible(true)} activeOpacity={0.7}>
                    <View style={[styles.colorTile, { backgroundColor: accentColor }]} />
                    <Text style={styles.colorHex}>{accentColor.toUpperCase()}</Text>
                    <Ionicons name="chevron-forward" size={16} color={themeConfig.text.muted} />
                </TouchableOpacity>

                {/* Daytime */}
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setDayEnabled(prev => !prev)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, dayEnabled && styles.checkboxActive]}>
                        {dayEnabled && <Ionicons name="checkmark" size={14} color={themeConfig.text.inverse} />}
                    </View>
                    <Text style={styles.checkboxLabel}>Daytime</Text>
                </TouchableOpacity>
                <View style={styles.timeRow}>
                    <TouchableOpacity
                        style={[styles.timePill, styles.timeInput, !dayEnabled && styles.inputDisabled]}
                        onPress={() => dayEnabled && setActiveTimePicker('dayStart')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="time-outline" size={15} color={dayEnabled ? themeConfig.accent.primary : themeConfig.text.muted} />
                        <Text style={[styles.timePillText, !dayTimeStart && styles.timePillPlaceholder]}>
                            {dayTimeStart || 'Start'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.timePill, styles.timeInput, !dayEnabled && styles.inputDisabled]}
                        onPress={() => dayEnabled && setActiveTimePicker('dayEnd')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="time-outline" size={15} color={dayEnabled ? themeConfig.accent.primary : themeConfig.text.muted} />
                        <Text style={[styles.timePillText, !dayTimeEnd && styles.timePillPlaceholder]}>
                            {dayTimeEnd || 'End'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Nighttime */}
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setNightEnabled(prev => !prev)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, nightEnabled && styles.checkboxActive]}>
                        {nightEnabled && <Ionicons name="checkmark" size={14} color={themeConfig.text.inverse} />}
                    </View>
                    <Text style={styles.checkboxLabel}>Nighttime</Text>
                </TouchableOpacity>
                <View style={styles.timeRow}>
                    <TouchableOpacity
                        style={[styles.timePill, styles.timeInput, !nightEnabled && styles.inputDisabled]}
                        onPress={() => nightEnabled && setActiveTimePicker('nightStart')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="time-outline" size={15} color={nightEnabled ? themeConfig.accent.primary : themeConfig.text.muted} />
                        <Text style={[styles.timePillText, !nightTimeStart && styles.timePillPlaceholder]}>
                            {nightTimeStart || 'Start'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.timePill, styles.timeInput, !nightEnabled && styles.inputDisabled]}
                        onPress={() => nightEnabled && setActiveTimePicker('nightEnd')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="time-outline" size={15} color={nightEnabled ? themeConfig.accent.primary : themeConfig.text.muted} />
                        <Text style={[styles.timePillText, !nightTimeEnd && styles.timePillPlaceholder]}>
                            {nightTimeEnd || 'End'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Default start hour */}
                <Text style={styles.label}>Default start hour <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                    style={styles.timePill}
                    onPress={() => setActiveTimePicker('defaultStart')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="time-outline" size={15} color={themeConfig.accent.primary} />
                    <Text style={[styles.timePillText, !defaultStartHour && styles.timePillPlaceholder]}>
                        {defaultStartHour || 'Select time'}
                    </Text>
                </TouchableOpacity>

            </ScrollView>

            {saved && (
                <View style={styles.savedBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.savedText}>Saved successfully</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
            >
                {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveBtnText}>Save changes</Text>
                }
            </TouchableOpacity>

            <MapPickerModal
                visible={mapVisible}
                onClose={() => setMapVisible(false)}
                onSelect={loc => setLocation(loc)}
            />

            <ColorPickerModal
                visible={colorPickerVisible}
                onClose={() => setColorPickerVisible(false)}
                onSelect={setAccentColor}
            />

            {/* Time picker — iOS modal, Android inline */}
            {Platform.OS === 'ios' ? (
                <Modal
                    transparent
                    animationType="slide"
                    visible={activeTimePicker !== null}
                    onRequestClose={() => setActiveTimePicker(null)}
                    supportedOrientations={['portrait', 'landscape']}
                >
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerContainer}>
                            <DateTimePicker
                                value={pickerValue}
                                mode="time"
                                display="spinner"
                                onChange={handleTimePick}
                                themeVariant="dark"
                                style={{ width: '100%' }}
                            />
                            <TouchableOpacity style={styles.pickerDone} onPress={() => setActiveTimePicker(null)}>
                                <Text style={styles.pickerDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            ) : activeTimePicker !== null ? (
                <DateTimePicker
                    value={pickerValue}
                    mode="time"
                    display="default"
                    onChange={handleTimePick}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
        backgroundColor: themeConfig.background.primary,
    },
    scroll: {
        paddingBottom: 16,
    },
    errorBanner: {
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.4)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    bannerPicker: {
        aspectRatio: 1,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 20,
        backgroundColor: themeConfig.background.secondary,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    bannerPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    bannerPlaceholderText: {
        fontSize: 14,
        color: themeConfig.text.muted,
    },
    bannerEditBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: themeConfig.accent.primary,
        borderRadius: 20,
        padding: 7,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: themeConfig.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 8,
    },
    input: {
        backgroundColor: themeConfig.background.secondary,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        padding: 13,
        fontSize: 15,
        color: themeConfig.text.primary,
        marginBottom: 20,
    },
    daysRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 20,
    },
    dayBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        backgroundColor: themeConfig.background.secondary,
        alignItems: 'center',
    },
    dayBtnActive: {
        backgroundColor: themeConfig.accent.primary,
        borderColor: themeConfig.accent.primary,
    },
    dayBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: themeConfig.text.muted,
    },
    dayBtnTextActive: {
        color: themeConfig.text.inverse,
    },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: themeConfig.background.secondary,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        padding: 13,
        marginBottom: 20,
    },
    locationText: {
        flex: 1,
        fontSize: 14,
        color: themeConfig.text.primary,
    },
    colorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: themeConfig.background.secondary,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
    },
    colorTile: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
    },
    colorHex: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: themeConfig.text.primary,
        fontVariant: ['tabular-nums'],
    },
    savedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    savedText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#22c55e',
    },
    saveBtn: {
        backgroundColor: themeConfig.accent.primary,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: themeConfig.text.inverse,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: themeConfig.border.subtle,
        backgroundColor: themeConfig.background.secondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: themeConfig.accent.primary,
        borderColor: themeConfig.accent.primary,
    },
    checkboxLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: themeConfig.text.primary,
    },
    inputDisabled: {
        opacity: 0.4,
    },
    required: {
        color: '#ef4444',
    },
    timeRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    timeInput: {
        flex: 1,
        marginBottom: 0,
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        paddingVertical: 13,
        paddingHorizontal: 12,
        backgroundColor: themeConfig.background.secondary,
    },
    timePillText: {
        fontSize: 14,
        fontWeight: '600',
        color: themeConfig.accent.primary,
    },
    timePillPlaceholder: {
        color: themeConfig.text.muted,
        fontWeight: '400',
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
