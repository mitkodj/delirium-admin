import React, { useState, useEffect } from 'react'
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    Platform,
    ActivityIndicator
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import themeConfig from '../../themes/themeConfig'
import { Switch } from 'react-native-paper'
import DateWidget from './DateWidget'
import DateTimePicker from '@react-native-community/datetimepicker'
import LocationWidget from './LocationWidget'
import LocationSelector from './LocationSelector'
import MapPickerModal from './LocationSelectorModal'
import { createEvent, updateEvent, uploadBanner, setEventsGenres } from '../../utils/service'
import { Club, DGenre } from '../../types/Disco'
import { buildAssetSource } from '../../helpers/utils'
import GenreSelector from './EventGenreSelector'
import { TabletModalWrapper } from '../../helpers/useTabletModalStyle';

type Props = {
    visible: boolean
    event?: any
    onClose: () => void
    onSave: (data: any) => void
}

export default function EventFormModal({
    visible,
    event,
    onClose,
    onSave
}: Props) {

    const isEdit = !!event
    const club: Club = (global as any).myClubs?.[0];

    const [name, setName] = useState('')
    const [entrance, setEntrance] = useState('')
    const [description, setDescription] = useState('')
    const [promotions, setPromotions] = useState('')
    const [banner, setBanner] = useState<string | null>(null)
    const [location, setLocation] = useState<any>({
        ...club?.location,
        address: club?.locationNormalized
    })
    const [date, setDate] = useState<Date>(new Date())
    const [pickerVisible, setPickerVisible] = useState<boolean>(false);
    const [useDefaultLocation, setUseDefaultLocation] = useState<boolean>(true);
    const [mapVisible, setMapVisible] = useState(false);
    const [genres, setGenres] = useState<DGenre[]>([])
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [bannerChanged, setBannerChanged] = useState(false)

    const saveBtnEnabled = name && banner && location && date;

    const accentColor = themeConfig.text.primary;

    const onChange = (_: any, selectedDate?: Date) => {
        if (selectedDate) setDate(selectedDate);
    };

    useEffect(() => {
        if (event) {
            setName(event.name ?? '')
            setEntrance(event.entranceFee ?? '')
            setDescription(event.description ?? '')
            setPromotions(event.promotions ?? '')
            setBanner(event.banner ?? null)
            setBannerChanged(false)
            setLocation(event.location ?? { ...club?.location, address: club?.locationNormalized })
            if (event.date) setDate(new Date(event.date))
            if (event.genres?.length) setGenres(event.genres.map((g: string) => ({ id: g })))
        }
    }, [event])

    const handleSave = async () => {
        try {
            setError(null)
            if (!banner) return
            setUploading(true)

            // 1️⃣ upload banner only if the user picked a new image
            const bannerFileName = bannerChanged
                ? (await uploadBanner(banner) as any).data.fileName
                : banner

            const eventPayload = {
                name,
                promotions,
                banner: bannerFileName,
                discoId: club.id,
                location,
                date,
                locationNormalized: location.address,
                description,
                entranceFee: entrance,
                disco: club.id,
            }

            // 2️⃣ create or update
            let eventId: string
            if (isEdit) {
                await updateEvent(event.id, eventPayload)
                eventId = event.id
            } else {
                const resp = await createEvent({ ...eventPayload, id: '' })
                eventId = resp?.data
            }

            // 3️⃣ sync genres
            await setEventsGenres(eventId, genres.map(g => g.id))

            setUploading(false)
            onSave({})
            onClose()

        } catch (e) {
            console.error(e)
            setUploading(false)
            setError('Something went wrong.')
        }
    }

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8
        })

        if (!result.canceled) {
            const asset = result.assets[0]

            if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                alert('Image must be smaller than 10MB')
                return
            }

            setBanner(asset.uri)
            setBannerChanged(true)
        }
    }

    return (
        <Modal visible={visible} animationType="slide" transparent supportedOrientations={['portrait', 'landscape']}>

            <TabletModalWrapper style={styles.container}>

                <Text style={styles.title}>
                    {isEdit ? event.name : 'New Event'}
                </Text>

                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <ScrollView keyboardDismissMode="on-drag">
                    <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>

                        {banner ? (
                            <>
                                <Image source={{ uri: banner }} style={styles.bannerImage} />

                                {uploading && (
                                    <View style={styles.uploadOverlay}>
                                        <ActivityIndicator size="large" color="#fff" />
                                    </View>
                                )}
                            </>
                        ) : (
                            <Text style={styles.uploadText}>Upload Banner</Text>
                        )}

                    </TouchableOpacity>

                    <View style={{
                        flexDirection: 'row',
                        marginBottom: 10
                    }}>

                        <View
                            style={[styles.squareButton, {
                                borderColor: club?.accentColor
                            }]}
                        >
                            <Image
                                source={buildAssetSource(club?.defaultBanner)}
                                style={styles.squareImage}
                            />
                        </View>

                        <View style={{
                            flex: 1,
                            justifyContent: 'center',
                            marginLeft: 10
                        }}>

                            <TextInput
                                placeholder="Event Name"
                                placeholderTextColor={themeConfig.text.muted}
                                value={name}
                                onChangeText={setName}
                                style={styles.input}
                            />

                            <TextInput
                                placeholder="Entrance"
                                placeholderTextColor={themeConfig.text.muted}
                                value={entrance}
                                onChangeText={setEntrance}
                                style={styles.input}
                            />
                        </View>
                    </View>

                    <View style={{
                        flexDirection: 'row',
                        marginBottom: 10,
                        height: 116
                    }}>
                        <DateWidget
                            style={{
                                maxHeight: 116,
                                aspectRatio: 1
                            }}
                            day={date.getDate()}
                            month={date.toLocaleString('default', { month: 'long' })}
                            accentColor={club?.accentColor ?? accentColor}
                        />

                        <View style={{
                            flex: 2,
                            flexDirection: 'column',
                            justifyContent: 'center',
                            marginLeft: 15,
                            height: 'auto'
                        }}>
                            <TouchableOpacity
                                style={{
                                    padding: 14,
                                    borderRadius: 10,
                                    borderWidth: 2,
                                    backgroundColor: club?.accentColor
                                }}
                                onPress={() => setPickerVisible(true)}
                            >
                                <Text style={styles.selectDateText}>Select date</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{
                        flexDirection: 'row',
                        marginBottom: 10,
                        height: 116
                    }}>
                        <LocationWidget
                            address={location?.address}
                            accentColor={club?.accentColor ?? accentColor}
                            openMaps={() => { }}
                        />

                        <View style={{
                            flex: 2,
                            flexDirection: 'column',
                            justifyContent: 'center',
                            marginLeft: 15,
                            height: 'auto'
                        }}>
                            <View style={styles.toggleContainer}>
                                <Switch
                                    value={useDefaultLocation}
                                    onValueChange={() => { setUseDefaultLocation(!useDefaultLocation); }}
                                    color={club?.accentColor ?? accentColor}
                                />

                                <Text style={styles.label}>
                                    Use default location
                                </Text>
                            </View>
                            <LocationSelector
                                accentColor={club?.accentColor ?? accentColor}
                                disabled={useDefaultLocation}
                                onPress={() => setMapVisible(true)}
                            />
                        </View>
                    </View>

                    <TextInput
                        placeholder="Description"
                        placeholderTextColor={themeConfig.text.muted}
                        value={description}
                        onChangeText={setDescription}
                        maxLength={256}
                        multiline
                        style={styles.textarea}
                    />

                    <TextInput
                        placeholder="Promotions"
                        placeholderTextColor={themeConfig.text.muted}
                        value={promotions}
                        onChangeText={setPromotions}
                        maxLength={256}
                        multiline
                        style={styles.textarea}
                    />

                    <GenreSelector
                        accentColor={club?.accentColor ?? accentColor}
                        value={genres}
                        onChange={setGenres}
                        // genres={preloadedGenres}   ← pass this prop if you already have genre data,
                        //                              otherwise the component will call fetchGenres() itself
                    />

                </ScrollView>

                <View style={styles.actions}>

                    <TouchableOpacity style={styles.cancel} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.save, {
                            backgroundColor: club?.accentColor ?? accentColor
                        }]}
                        disabled={!saveBtnEnabled}
                        onPress={handleSave}
                    >
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>

                </View>

            </TabletModalWrapper>

            <Modal
                transparent
                animationType="slide"
                visible={pickerVisible}
                onRequestClose={() => setPickerVisible(false)}
                supportedOrientations={['portrait', 'landscape']}
            >
                <View style={styles.modalOverlay}>

                    <View style={styles.pickerContainer}>
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            onChange={onChange}
                            themeVariant="dark"
                            style={styles.picker}
                        />
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity
                                style={styles.doneButton}
                                onPress={() => {
                                    setDate(date);
                                    setPickerVisible(false);
                                }}
                            >
                                <Text style={styles.doneText}>Done</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            <MapPickerModal
                visible={mapVisible}
                onClose={() => setMapVisible(false)}
                onSelect={(loc) => setLocation(loc)}
            />

        </Modal>
    )
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        padding: 20,
        paddingTop: 55,
        backgroundColor: themeConfig.background.primary
    },

    title: {
        fontSize: 22,
        fontWeight: '700',
        color: themeConfig.text.primary,
        marginBottom: 20
    },

    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        padding: 12,
        color: themeConfig.text.primary,
        marginBottom: 16
    },

    textarea: {
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        padding: 12,
        color: themeConfig.text.primary,
        marginBottom: 16,
        height: 100,
        textAlignVertical: 'top'
    },

    squareButton: {
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        backgroundColor: themeConfig.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        height: 120
    },

    squareImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        borderWidth: 1,
    },

    imageUpload: {
        height: 160,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },

    bannerImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10
    },

    selectDateText: {
        color: themeConfig.text.inverse,
        fontSize: 16,
        fontWeight: '600',
    },

    uploadText: {
        color: themeConfig.text.muted
    },

    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },

    cancel: {
        padding: 12
    },

    cancelText: {
        color: themeConfig.text.muted
    },

    save: {
        padding: 12,
        backgroundColor: themeConfig.accent.primary,
        borderRadius: 8
    },

    saveText: {
        color: themeConfig.text.inverse,
        fontWeight: '600'
    },

    toggleContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 12,
    },
    label: {
        marginLeft: 10,
        fontSize: 16,
        color: themeConfig.text.primary
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },

    pickerContainer: {
        backgroundColor: '#111',
        paddingTop: 16,
        paddingBottom: 24,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        width: '100%',
        paddingHorizontal: 20
    },

    picker: {
        width: '100%',
    },

    doneButton: {
        marginTop: 12,
        alignSelf: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
    },

    doneText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    uploadOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10
    },

    errorBanner: {
        backgroundColor: '#ff4d4d',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10
    },

    errorText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: '600'
    }

})