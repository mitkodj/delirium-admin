import React, { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Pressable
} from 'react-native'
import themeConfig from '../../themes/themeConfig'
import { fetchGenres } from '../../utils/service'
import { DGenre } from '../../types/Disco'

type Props = {
    accentColor: string
    genres?: DGenre[]          // optional pre-loaded data
    value: DGenre[]            // currently selected genres
    onChange: (selected: DGenre[]) => void
}

export default function GenreSelector({ accentColor, genres: propGenres, value, onChange }: Props) {
    const [genres, setGenres] = useState<DGenre[]>(propGenres ?? [])
    const [loading, setLoading] = useState(false)
    const [dropdownVisible, setDropdownVisible] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load genres from API if not provided via props
    useEffect(() => {
        if (propGenres && propGenres.length > 0) {
            setGenres(propGenres)
            return
        }
        const load = async () => {
            try {
                setLoading(true)
                setError(null)
                const resp = await fetchGenres(undefined)
                setGenres((resp as any).data ?? [])
            } catch (e) {
                setError('Failed to load genres.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const isSelected = (genre: DGenre) => value.some(g => g.id === genre.id)

    const toggleGenre = (genre: DGenre) => {
        if (isSelected(genre)) {
            onChange(value.filter(g => g.id !== genre.id))
        } else {
            onChange([...value, genre])
        }
    }

    const removeGenre = (genre: DGenre) => {
        onChange(value.filter(g => g.id !== genre.id))
    }

    return (
        <View style={styles.wrapper}>

            {/* Label row */}
            <Text style={styles.label}>Genres</Text>

            {/* Selected pills */}
            {value.length > 0 && (
                <View style={styles.pillsRow}>
                    {value.map(genre => (
                        <View
                            key={genre.id}
                            style={[styles.pill, { backgroundColor: accentColor + '22', borderColor: accentColor }]}
                        >
                            <Text style={[styles.pillText, { color: accentColor }]}>
                                {genre.name}
                            </Text>
                            <TouchableOpacity
                                onPress={() => removeGenre(genre)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Text style={[styles.pillRemove, { color: accentColor }]}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Dropdown trigger */}
            <TouchableOpacity
                style={[styles.trigger, dropdownVisible && { borderColor: accentColor }]}
                onPress={() => setDropdownVisible(true)}
                activeOpacity={0.7}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={accentColor} />
                ) : (
                    <>
                        <Text style={styles.triggerText}>
                            {value.length === 0 ? 'Select genres…' : `${value.length} selected`}
                        </Text>
                        <Text style={[styles.chevron, dropdownVisible && styles.chevronOpen]}>›</Text>
                    </>
                )}
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Dropdown modal */}
            <Modal
                transparent
                animationType="fade"
                visible={dropdownVisible}
                onRequestClose={() => setDropdownVisible(false)}
            >
                <Pressable style={styles.overlay} onPress={() => setDropdownVisible(false)}>
                    <Pressable style={styles.dropdown} onPress={() => {}}>

                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownTitle}>Select Genres</Text>
                            <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                                <Text style={[styles.doneBtn, { color: accentColor }]}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={genres}
                            keyExtractor={item => item.id}
                            style={styles.list}
                            renderItem={({ item }) => {
                                const selected = isSelected(item)
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.option,
                                            selected && { backgroundColor: accentColor + '18' }
                                        ]}
                                        onPress={() => toggleGenre(item)}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            selected && { color: accentColor, fontWeight: '600' }
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {selected && (
                                            <Text style={[styles.checkmark, { color: accentColor }]}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                )
                            }}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />

                    </Pressable>
                </Pressable>
            </Modal>

        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 16
    },

    label: {
        color: themeConfig.text.muted,
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
        letterSpacing: 0.4
    },

    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10
    },

    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6
    },

    pillText: {
        fontSize: 13,
        fontWeight: '600'
    },

    pillRemove: {
        fontSize: 11,
        fontWeight: '700',
        lineHeight: 14
    },

    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 10,
        padding: 12,
        backgroundColor: themeConfig.background.primary
    },

    triggerText: {
        color: themeConfig.text.muted,
        fontSize: 15
    },

    chevron: {
        color: themeConfig.text.muted,
        fontSize: 20,
        transform: [{ rotate: '90deg' }],
        lineHeight: 22
    },

    chevronOpen: {
        transform: [{ rotate: '-90deg' }]
    },

    errorText: {
        color: '#ff4d4d',
        fontSize: 12,
        marginTop: 4
    },

    // Modal / Dropdown styles
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
    },

    dropdown: {
        backgroundColor: '#111',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '60%',
        paddingBottom: 24
    },

    dropdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: themeConfig.border.subtle
    },

    dropdownTitle: {
        color: themeConfig.text.primary,
        fontSize: 16,
        fontWeight: '700'
    },

    doneBtn: {
        fontSize: 15,
        fontWeight: '600'
    },

    list: {
        paddingHorizontal: 4
    },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8
    },

    optionText: {
        color: themeConfig.text.primary,
        fontSize: 15
    },

    checkmark: {
        fontSize: 16,
        fontWeight: '700'
    },

    separator: {
        height: 1,
        backgroundColor: themeConfig.border.subtle,
        marginHorizontal: 16
    }
})