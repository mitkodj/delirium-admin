import React, { useEffect, useState } from "react";
import ImageColors from 'react-native-image-colors';

export default function useImageColor(imageUrl: string) {
    const [accentColor, setAccentColor] = useState('#e7c75c');
    useEffect(() => {
        let mounted = true;

        const fetchColors = async () => {
            try {
            const result: any = await ImageColors.getColors(imageUrl, {
                cache: true,
                key: imageUrl,
            });

            if (!mounted) return;

            if (result.platform === 'ios') {
                setAccentColor(result.dominant || result.primary);
            } else if (result.platform === 'android') {
                setAccentColor(result.dominant || result.vibrant);
            } else {
                setAccentColor(result.dominant);
            }
            } catch (e) {
            console.warn('Color extraction failed', e);
            }
        };

        fetchColors();

        return () => {
            mounted = false;
        };
    }, [imageUrl]);
    return accentColor;
}

export const isDark = (hex: string) => {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
};