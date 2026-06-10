import React, { useState } from 'react'
import {
    View,
    Image,
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { buildAssetSource } from '../helpers/utils'
import { editDiscoImages, uploadBanner } from '../utils/service'
import GalleryLightbox from './GalleryLightbox'

type DiscoImage = {
    id: string
    imageName: string
}

type NewImage = {
    uri: string
    isNew: true
}

type GalleryItem = DiscoImage | NewImage

const isNew = (item: GalleryItem): item is NewImage =>
    (item as NewImage).isNew === true

function getDisplayUri(item: GalleryItem): { uri: string } | { uri: string; headers: Record<string, string> } {
    if (isNew(item)) return { uri: item.uri }
    return buildAssetSource((item as DiscoImage).imageName)
}

type Props = {
    images: DiscoImage[]
    isEditable?: boolean
    accentColor?: string
    clubId?: string
    onSaved?: (updated: DiscoImage[]) => void
    imageStyle?: object
    containerStyle?: object
}

export default function Gallery({
    images,
    isEditable = false,
    clubId,
    accentColor = '#fff',
    onSaved,
    imageStyle,
    containerStyle,
}: Props) {
    const [items, setItems] = useState<GalleryItem[]>(images)
    const [removedIds, setRemovedIds] = useState<string[]>([])
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ─── Remove ───────────────────────────────────────────────────────────────
    const handleRemove = (index: number) => {
        const item = items[index]
        if (!isNew(item)) {
            setRemovedIds(prev => [...prev, (item as DiscoImage).id])
        }
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    // ─── Upload ───────────────────────────────────────────────────────────────
    const handleUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        })

        if (result.canceled) return

        const oversized = result.assets.some(
            a => a.fileSize && a.fileSize > 10 * 1024 * 1024
        )
        if (oversized) {
            setError('Each image must be smaller than 10 MB.')
            return
        }

        const newItems: NewImage[] = result.assets.map(a => ({
            uri: a.uri,
            isNew: true,
        }))

        setItems(prev => [...newItems, ...prev])
    }

    // ─── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        try {
            setSaving(true)
            setError(null)

            const existingToKeep = items.filter(i => !isNew(i)) as DiscoImage[]
            const newUris = items.filter(isNew) as NewImage[]

            const newImages = await Promise.all(newUris.map(url => uploadBanner(url.uri)))

            const finalCollection = newImages.map(resp => ({
                imageName: (resp as any).data.fileName
            })).concat(existingToKeep);

            await editDiscoImages(clubId as string, finalCollection)

            onSaved?.(existingToKeep)
            setRemovedIds([])
        } catch (e) {
            console.error(e)
            setError('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }


    if (!items || items.length === 0 && !isEditable) return null

    return (
        <View style={containerStyle}>

            {/* ── Error banner ─────────────────────────────────────────── */}
            {error && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* ── Grid ─────────────────────────────────────────────────── */}
            <View style={styles.grid}>

                {/* Upload tile — edit mode only, always first */}
                {isEditable && (
                    <TouchableOpacity
                        style={[styles.thumb, styles.uploadTile, imageStyle]}
                        onPress={handleUpload}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={42} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.uploadTileText}>Upload</Text>
                    </TouchableOpacity>
                )}

                {items.map((item, index) => (
                    <View key={isNew(item) ? item.uri : (item as DiscoImage).id} style={styles.thumbWrapper}>

                        <TouchableOpacity
                            activeOpacity={isEditable ? 1 : 0.7}
                            onPress={() => {
                                if (!isEditable) setActiveIndex(index)
                            }}
                        >
                            <Image
                                source={getDisplayUri(item)}
                                style={[styles.thumb, imageStyle]}
                            />
                        </TouchableOpacity>

                        {/* New badge */}
                        {isEditable && isNew(item) && (
                            <View style={[styles.newBadge, { backgroundColor: accentColor }]}>
                                <Text style={styles.newBadgeText}>New</Text>
                            </View>
                        )}

                        {/* Remove button */}
                        {isEditable && (
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => handleRemove(index)}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            >
                                <Ionicons name="close-circle" size={22} color="#fff" />
                            </TouchableOpacity>
                        )}

                    </View>
                ))}
            </View>

            {/* ── Save button — edit mode only ─────────────────────────── */}
            {isEditable && (
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: accentColor }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#000" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save photos</Text>
                    )}
                </TouchableOpacity>
            )}

            {/* ── Lightbox — view mode only ─────────────────────────────── */}
            {!isEditable && activeIndex !== null && (
                <GalleryLightbox
                    images={items as DiscoImage[]}
                    index={activeIndex}
                    onClose={() => setActiveIndex(null)}
                />
            )}

        </View>
    )
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },

    thumbWrapper: {
        position: 'relative',
    },

    thumb: {
        width: 100,
        height: 100,
        backgroundColor: '#1a1a1a',
    },

    uploadTile: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },

    uploadTileText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 18,
        marginTop: 4,
        fontWeight: '500',
    },

    removeBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: 'rgba(220,53,53,0.9)',
        borderRadius: 11,
        zIndex: 10,
    },

    newBadge: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },

    newBadgeText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    saveBtn: {
        marginTop: 24,
        paddingVertical: 11,
        paddingHorizontal: 24,
        borderRadius: 10,
        alignItems: 'center',
        alignSelf: 'stretch',
        minWidth: 130,
        width: '100%'
    },

    saveBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 14,
    },

    errorBanner: {
        backgroundColor: '#ff4d4d',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },

    errorText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 13,
    },
})
