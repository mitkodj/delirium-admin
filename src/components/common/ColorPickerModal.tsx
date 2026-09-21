import React, { useRef, useState } from 'react';
import {
    View, Modal, TouchableOpacity, Text, TextInput, StyleSheet, PanResponder, Pressable,
} from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import themeConfig from '../../themes/themeConfig';

const N = 60;
const DISC = 260;
const CX = DISC / 2;
const CY = DISC / 2;
const OR = DISC / 2 - 4;

function slicePath(startDeg: number, endDeg: number): string {
    const rad = (d: number) => (d - 90) * (Math.PI / 180);
    const x1 = CX + OR * Math.cos(rad(startDeg));
    const y1 = CY + OR * Math.sin(rad(startDeg));
    const x2 = CX + OR * Math.cos(rad(endDeg));
    const y2 = CY + OR * Math.sin(rad(endDeg));
    return `M ${CX} ${CY} L ${x1} ${y1} A ${OR} ${OR} 0 0 1 ${x2} ${y2} Z`;
}

function hslToHex(h: number, s: number, l: number): string {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

const SLICES = Array.from({ length: N }, (_, i) => ({
    path: slicePath(i * (360 / N), (i + 1) * (360 / N)),
    color: `hsl(${i * (360 / N)}, 100%, 50%)`,
}));

type Props = {
    visible: boolean;
    onClose: () => void;
    onSelect: (hex: string) => void;
};

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    let r = parseInt(m[1].slice(0, 2), 16) / 255;
    let g = parseInt(m[1].slice(2, 4), 16) / 255;
    let b = parseInt(m[1].slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: l * 100 };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0)
           : max === g ? (b - r) / d + 2
           :             (r - g) / d + 4;
    return { h: (h / 6) * 360, s: s * 100, l: l * 100 };
}

export default function ColorPickerModal({ visible, onClose, onSelect }: Props) {
    const [hue, setHue] = useState(45);
    const [sat, setSat] = useState(100);
    const [light, setLight] = useState(50);
    const [hexDraft, setHexDraft] = useState('');
    const editingHex = useRef(false);

    const currentColor = hslToHex(hue, sat, light);
    const pureHue = hslToHex(hue, 100, 50);

    const handleHexChange = (val: string) => {
        setHexDraft(val);
        const hsl = hexToHsl(val);
        if (hsl) { setHue(hsl.h); setSat(hsl.s); setLight(hsl.l); }
    };

    const updateDisc = (lx: number, ly: number) => {
        const dx = lx - CX;
        const dy = ly - CY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > OR) return;
        const angle = ((Math.atan2(dy, dx) * 180 / Math.PI) + 90 + 360) % 360;
        editingHex.current = false;
        setHue(angle);
        setSat(Math.min(100, (dist / OR) * 100));
        setHexDraft('');
    };

    const discResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => updateDisc(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: e => updateDisc(e.nativeEvent.locationX, e.nativeEvent.locationY),
    })).current;

    const updateSlider = (lx: number) => {
        editingHex.current = false;
        setLight(Math.round(Math.max(0, Math.min(100, (lx / DISC) * 100))));
        setHexDraft('');
    };

    const sliderResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => updateSlider(e.nativeEvent.locationX),
        onPanResponderMove: e => updateSlider(e.nativeEvent.locationX),
    })).current;

    const iAngle = (hue - 90) * (Math.PI / 180);
    const iR = (sat / 100) * OR;
    const iX = CX + iR * Math.cos(iAngle);
    const iY = CY + iR * Math.sin(iAngle);
    const thumbX = Math.max(0, Math.min(DISC - 24, (light / 100) * DISC - 12));

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.card} onPress={() => {}}>

                    {/* Color wheel */}
                    <View {...discResponder.panHandlers} style={{ width: DISC, height: DISC }}>
                        <Svg width={DISC} height={DISC}>
                            <Defs>
                                <RadialGradient id="wg" cx="50%" cy="50%" r="50%">
                                    <Stop offset="0%" stopColor="white" stopOpacity="1" />
                                    <Stop offset="100%" stopColor="white" stopOpacity="0" />
                                </RadialGradient>
                            </Defs>
                            {SLICES.map((s, i) => <Path key={i} d={s.path} fill={s.color} />)}
                            <Circle cx={CX} cy={CY} r={OR} fill="url(#wg)" />
                            <Circle cx={iX} cy={iY} r={9} fill={currentColor} stroke="white" strokeWidth={2.5} />
                        </Svg>
                    </View>

                    {/* Lightness slider */}
                    <View style={styles.sliderWrap} {...sliderResponder.panHandlers}>
                        <LinearGradient
                            colors={['#000000', pureHue, '#ffffff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sliderTrack}
                        />
                        <View style={[styles.sliderThumb, { left: thumbX }]} />
                    </View>

                    {/* Hex input */}
                    <View style={styles.hexRow}>
                        <View style={[styles.hexPreview, { backgroundColor: currentColor }]} />
                        <TextInput
                            style={styles.hexInput}
                            value={hexDraft || currentColor}
                            onChangeText={handleHexChange}
                            onFocus={() => { editingHex.current = true; setHexDraft(currentColor); }}
                            onBlur={() => { editingHex.current = false; setHexDraft(''); }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={7}
                            placeholder="#000000"
                            placeholderTextColor={themeConfig.text.muted}
                        />
                    </View>

                    {/* Preview + confirm */}
                    <View style={styles.bottom}>
                        <TouchableOpacity
                            style={styles.selectBtn}
                            onPress={() => { onSelect(currentColor); onClose(); }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.selectText}>Select</Text>
                        </TouchableOpacity>
                    </View>

                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: themeConfig.background.secondary,
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        gap: 16,
    },
    sliderWrap: {
        width: DISC,
        height: 28,
        justifyContent: 'center',
    },
    sliderTrack: {
        height: 12,
        borderRadius: 6,
    },
    sliderThumb: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    bottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        width: '100%',
    },
    selectBtn: {
        flex: 1,
        backgroundColor: themeConfig.accent.primary,
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
    },
    selectText: {
        color: themeConfig.text.inverse,
        fontWeight: '700',
        fontSize: 15,
    },
    hexRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
    },
    hexPreview: {
        width: 36,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
    },
    hexInput: {
        flex: 1,
        backgroundColor: themeConfig.background.primary,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        fontWeight: '600',
        color: themeConfig.text.primary,
    },
});
