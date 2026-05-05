import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import { 
  StyleSheet, View, Text, FlatList, Image, TouchableHighlight, 
  ActivityIndicator, StatusBar, BackHandler, useWindowDimensions,
  Animated
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Tv, ShieldCheck } from 'lucide-react-native';

// IMPORTACIÓN LOCAL (Ahora dentro de la misma carpeta de TV)
import channelsData from './assets/data/cache_channels_v50.json';

const COLORS = {
  bg: '#050810',
  card: '#111622',
  gold: '#FFD700',
  text: '#FFFFFF',
  focus: '#FFFFFF',
};

// COMPONENTE DE TARJETA ADAPTADO PARA TV
const TVChannelCard = memo(({ item, onPress, isSelected }) => {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? 1.15 : 1.0, 
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }], margin: 15 }}>
      <TouchableHighlight
        onPress={() => onPress(item)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        underlayColor="transparent"
        activeOpacity={1}
        style={[styles.card, focused && styles.cardFocused, isSelected && styles.cardSelected]}
      >
        <View style={styles.cardInner}>
          <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.cardOverlay}>
            <Text style={[styles.channelName, focused && {color: '#000'}]} numberOfLines={1}>{item.name}</Text>
          </LinearGradient>
        </View>
      </TouchableHighlight>
    </Animated.View>
  );
});

export default function App() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const backAction = () => {
      if (selectedChannel) {
        setSelectedChannel(null);
        return true; 
      }
      return false; 
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedChannel]);

  const getDirectUrl = (url) => {
    if (!url) return '';
    let clean = url.replace('iframe:', '').trim();
    if (clean.includes('saohgdasregions.fun')) {
      const fileName = clean.split('/').pop().replace('.php', '.html');
      return `https://embed.saohgdasregions.fun/embed2/${fileName}?autoplay=1`;
    }
    return clean;
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <View style={styles.mainLayout}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Tv color={COLORS.gold} size={50} />
            <Text style={styles.headerTitle}>TV LIBRE <Text style={{color: COLORS.gold}}>PRO TV</Text></Text>
          </View>
          <View style={styles.info}>
            <ShieldCheck color={COLORS.gold} size={24} />
            <Text style={styles.infoText}>INTERFAZ LEANBACK ACTIVA</Text>
          </View>
        </View>

        <View style={styles.content}>
          {selectedChannel ? (
            <View style={styles.playerContainer}>
              <WebView
                key={selectedChannel.id}
                source={{ 
                  html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>body,html{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;} iframe{width:100%;height:100%;border:none;}</style>
                  </head><body><iframe src="${getDirectUrl(selectedChannel.proxy)}" allow="autoplay; fullscreen"></iframe></body></html>`,
                  baseUrl: 'https://www.cablevisionhd.com/' 
                }}
                style={{ flex: 1, backgroundColor: '#000' }}
                userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
              />
              {loading && <View style={styles.loader}><ActivityIndicator color={COLORS.gold} size="large" /></View>}
            </View>
          ) : (
            <FlatList 
              data={channelsData} 
              keyExtractor={item => item.id.toString()} 
              renderItem={({ item }) => <TVChannelCard item={item} onPress={setSelectedChannel} isSelected={selectedChannel?.id === item.id} />} 
              numColumns={4} 
              contentContainerStyle={styles.list} 
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  mainLayout: { flex: 1, padding: '5%' }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  brand: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 40, fontWeight: '900', marginLeft: 20 },
  info: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.1)', padding: 15, borderRadius: 15 },
  infoText: { color: COLORS.gold, fontSize: 14, fontWeight: 'bold', marginLeft: 15 },
  content: { flex: 1 },
  list: { paddingBottom: 100 },
  card: { 
    backgroundColor: COLORS.card, 
    borderRadius: 20, 
    width: 260, 
    height: 160, 
    overflow: 'hidden', 
    borderWidth: 4, 
    borderColor: 'transparent' 
  },
  cardFocused: { 
    borderColor: COLORS.focus, 
    backgroundColor: COLORS.gold, 
    elevation: 25,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  cardSelected: { borderColor: COLORS.gold },
  cardInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: '85%', height: '75%' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, padding: 15, justifyContent: 'flex-end' },
  channelName: { color: '#fff', fontWeight: 'bold', fontSize: 20, textAlign: 'center' },
  playerContainer: { flex: 1, backgroundColor: '#000', borderRadius: 20, overflow: 'hidden' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }
});
