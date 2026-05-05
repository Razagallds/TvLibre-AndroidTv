import { registerRootComponent } from 'expo';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, View, Text, Image, TouchableHighlight, 
  ActivityIndicator, StatusBar, BackHandler, useWindowDimensions,
  TextInput, ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Tv } from 'lucide-react-native';

// DATOS
const channelsData = require('./assets/data/cache_channels_v50.json');
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function MainApp() {
  const { width } = useWindowDimensions();
  const [canal, setCanal] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [isBooting, setIsBooting] = useState(true);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const hideTimer = useRef(null);

  // AJUSTE DE GRILLA PARA 4 COLUMNAS
  const cardWidth = width > 0 ? (width - 250) / 4 : 250; 

  useEffect(() => {
    setTimeout(() => setIsBooting(false), 2000);
  }, []);

  useEffect(() => {
    const handleBack = () => {
      if (canal) { setCanal(null); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => backHandler.remove();
  }, [canal]);

  // Temporizador de 4 segundos que se reinicia al interactuar
  const triggerOptions = () => {
    setShowOptions(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowOptions(false), 4000);
  };

  const canalesFiltrados = useMemo(() => {
    if (!Array.isArray(channelsData)) return [];
    return channelsData.filter(c => c && c.name && c.name.toLowerCase().includes(busqueda.toLowerCase()));
  }, [busqueda]);

  if (isBooting) {
    return (
      <View style={styles.boot}>
        <StatusBar hidden />
        <Tv color="gold" size={80} style={{marginBottom:20}} />
        <Text style={{color:'white', fontSize:60, fontWeight:'bold'}}>TV LIBRE PRO</Text>
        <Text style={{color:'gold', fontSize:18, marginTop:5}}>by dev-line.net</Text>
        <ActivityIndicator color="gold" size="large" style={{marginTop:30}} />
      </View>
    );
  }

  if (canal) {
    const slug = String(canal.name || "canal").toLowerCase().replace(/\s+/g, '');
    const videoUrl = `https://embed.saohgdasregions.fun/embed2/${slug}.html`;
    
    // Script agresivo para activar el audio y play al detectar "fullscreen"
    const autoPlayScript = `
      (function() {
        const forceAudio = () => {
          const v = document.querySelector('video');
          if (v) {
            v.muted = false;
            v.volume = 1;
            v.play();
          }
          // Simular el click de agrandar que activa el sonido
          const btns = document.querySelectorAll('button');
          btns.forEach(b => {
            const t = b.innerText.toLowerCase();
            if (t.includes('play') || t.includes('unmute') || t.includes('fullscreen')) {
              b.click();
            }
          });
        };
        setInterval(forceAudio, 1000);
      })();
    `;

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar hidden />
        <WebView
          key={videoUrl}
          source={{ 
            html: `<html><body style="margin:0;background:#000;overflow:hidden;"><iframe src="${videoUrl}" style="width:100vw;height:100vh;border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe></body></html>`,
            baseUrl: 'https://www.cablevisionhd.com/' 
          }}
          userAgent={DESKTOP_UA}
          style={{ flex: 1 }}
          injectedJavaScript={autoPlayScript}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
        />
        
        <TouchableHighlight 
            hasTVPreferredFocus={!showOptions}
            onPress={triggerOptions}
            style={StyleSheet.absoluteFill}
            underlayColor="transparent"
        >
            <View style={{flex:1}} />
        </TouchableHighlight>

        {showOptions && (
            <View style={styles.overlay}>
                <View style={styles.miniGuia}>
                    <Text style={{color:'gold', fontWeight:'bold', marginBottom:15, fontSize:22}}>CANAL: {canal.name}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {channelsData.slice(0, 50).map((item, idx) => (
                            <TouchableHighlight 
                                key={idx} 
                                hasTVPreferredFocus={idx === 0}
                                onFocus={triggerOptions}
                                onPress={() => { setCanal(item); triggerOptions(); }}
                                style={styles.guiaItem}
                                underlayColor="gold"
                            >
                                <Image source={{ uri: item.logo }} style={styles.guiaLogo} resizeMode="contain" />
                            </TouchableHighlight>
                        ))}
                    </ScrollView>
                </View>
                <TouchableHighlight onPress={() => setCanal(null)} onFocus={triggerOptions} style={styles.btnBackVideo} underlayColor="white">
                    <Text style={{fontWeight:'bold', color:'black', fontSize:20}}>VOLVER AL MENÚ ▲</Text>
                </TouchableHighlight>
            </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.main}>
      <StatusBar hidden />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TV LIBRE PRO</Text>
          <Text style={{color:'gold', fontSize:14, marginLeft:5}}>by dev-line.net</Text>
        </View>
        <View style={styles.searchBox}>
          <TextInput placeholder="Buscar..." placeholderTextColor="gray" style={{color:'white', fontSize:22}} value={busqueda} onChangeText={setBusqueda} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          {canalesFiltrados.map((item, index) => {
            const isFocused = (focusedIdx === index);
            return (
              <TouchableHighlight 
                key={index}
                onPress={() => setCanal(item)}
                onFocus={() => setFocusedIdx(index)}
                style={[styles.card, {width: cardWidth}, isFocused && styles.cardFocused]}
                underlayColor="gold"
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardNum}>{index + 1}</Text>
                  <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" />
                  <Text style={[styles.name, isFocused && {color:'black'}]} numberOfLines={1}>{item.name}</Text>
                </View>
              </TouchableHighlight>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  main: { flex: 1, backgroundColor: '#010206' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 50, alignItems: 'center' },
  title: { color: 'white', fontSize: 55, fontWeight: '900' },
  searchBox: { backgroundColor: '#111', width: 350, height: 65, borderRadius: 20, justifyContent: 'center', paddingHorizontal: 25 },
  scroll: { paddingHorizontal: 40, paddingBottom: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: { backgroundColor: '#0d1117', height: 200, margin: 15, borderRadius: 30, borderWidth: 3, borderColor: '#222' },
  cardFocused: { backgroundColor: 'gold', borderColor: 'gold', transform: [{scale: 1.05}] },
  cardContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  cardNum: { position: 'absolute', top: 15, left: 20, color: 'gold', fontWeight: 'bold', fontSize: 22 },
  logo: { width: '85%', height: '60%' },
  name: { color: 'white', marginTop: 12, fontSize: 18, fontWeight: 'bold' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 40 },
  miniGuia: { backgroundColor: 'rgba(0,0,0,0.92)', padding: 25, borderRadius: 25, borderBottomWidth: 4, borderBottomColor: 'gold', marginBottom: 25 },
  guiaItem: { width: 150, height: 95, backgroundColor: '#111', marginHorizontal: 12, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#333' },
  guiaLogo: { width: '85%', height: '85%' },
  btnBackVideo: { alignSelf: 'center', backgroundColor: 'gold', paddingHorizontal: 60, paddingVertical: 20, borderRadius: 20 }
});

registerRootComponent(MainApp);
