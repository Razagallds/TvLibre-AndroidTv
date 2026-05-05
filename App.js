import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react';
import { 
  StyleSheet, View, Text, FlatList, Image, TouchableHighlight, 
  ActivityIndicator, StatusBar, BackHandler, Animated, TextInput,
  Dimensions, TouchableOpacity, ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Tv, ShieldCheck, Search, X, ChevronUp, ChevronDown } from 'lucide-react-native';

import channelsData from './assets/data/cache_channels_v50.json';

const COLORS = {
  bg: '#050810',
  card: '#111622',
  gold: '#FFD700',
  text: '#FFFFFF',
  focus: '#FFFFFF',
  error: '#FF4444',
};

const PERUVIAN_CHANNELS = ['peru', 'peruvian', 'atv', 'america', 'latina', 'panamericana', 'tv peru', 'canal n', 'rex', 'tvperu', '卫视'];

const isPeruvianChannel = (name) => {
  const lower = name.toLowerCase();
  return PERUVIAN_CHANNELS.some(p => lower.includes(p));
};

const sortChannels = (data) => {
  const peruvian = [];
  const others = [];
  data.forEach(ch => {
    if (isPeruvianChannel(ch.name)) {
      peruvian.push(ch);
    } else {
      others.push(ch);
    }
  });
  return [...peruvian, ...others];
};

const TVChannelCard = memo(({ item, onPress, isSelected, onFocus }) => {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const cardRef = useRef(null);

  useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? 1.1 : 1.0, 
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    onFocus && onFocus(item);
  }, [onFocus, item]);

  return (
    <Animated.View ref={cardRef} style={{ transform: [{ scale }], margin: 10 }}>
      <TouchableHighlight
        onPress={() => onPress(item)}
        onFocus={handleFocus}
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

const SearchBar = memo(({ value, onChange, onClear, onFocus }) => (
  <View style={styles.searchContainer}>
    <View style={styles.searchBox}>
      <Search color={COLORS.gold} size={24} />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar canales..."
        placeholderTextColor="#888"
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear}>
          <X color="#888" size={24} />
        </TouchableOpacity>
      )}
    </View>
  </View>
));

const ChannelInput = memo(({ onSubmit, onClose }) => {
  const [channelNum, setChannelNum] = useState('');

  const handleSubmit = () => {
    if (channelNum.trim()) {
      onSubmit(parseInt(channelNum, 10));
      setChannelNum('');
    }
  };

  return (
    <View style={styles.channelInputContainer}>
      <View style={styles.channelInputBox}>
        <Text style={styles.channelInputTitle}>CAMBIAR CANAL</Text>
        <TextInput
          style={styles.channelInput}
          placeholder="Número de canal"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          value={channelNum}
          onChangeText={setChannelNum}
          onSubmitEditing={handleSubmit}
          autoFocus
        />
        <View style={styles.channelInputButtons}>
          <TouchableOpacity style={styles.channelInputBtn} onPress={handleSubmit}>
            <Text style={styles.channelInputBtnText}>ACEPTAR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.channelInputBtn} onPress={onClose}>
            <Text style={styles.channelInputBtnText}>CERRAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default function App() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showChannelInput, setShowChannelInput] = useState(false);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  const flatListRef = useRef(null);

  const sortedChannels = useMemo(() => sortChannels(channelsData), []);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return sortedChannels;
    const query = searchQuery.toLowerCase();
    return sortedChannels.filter(ch => ch.name.toLowerCase().includes(query));
  }, [searchQuery, sortedChannels]);

  useEffect(() => {
    const backAction = () => {
      if (showChannelInput) {
        setShowChannelInput(false);
        return true;
      }
      if (selectedChannel) {
        setSelectedChannel(null);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedChannel, showChannelInput]);

  const handleChannelChange = useCallback((channelNum) => {
    const channel = sortedChannels[channelNum - 1];
    if (channel) {
      setSelectedChannel(channel);
      setShowChannelInput(false);
    } else {
      setError('Canal no encontrado');
      setTimeout(() => setError(null), 2000);
    }
  }, []);

  const handleSearchFocus = useCallback(() => {
    setShowSearch(true);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  const getDirectUrl = (url) => {
    if (!url) return '';
    let clean = url.replace('iframe:', '').trim();
    if (clean.includes('saohgdasregions.fun')) {
      const fileName = clean.split('/').pop().replace('.php', '.html');
      return `https://embed.saohgdasregions.fun/embed2/${fileName}?autoplay=1`;
    }
    return clean;
  };

  const handleError = (syntheticEvent) => {
    setError('Error al cargar el canal');
    setLoading(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleChannelFocus = useCallback((item) => {
    const index = filteredChannels.findIndex(ch => ch.id === item.id);
    if (index >= 0) {
      setCurrentFocusIndex(index);
    }
  }, [filteredChannels]);

  const handleUpFromSearch = () => {
    if (searchQuery.length > 0) {
      setSearchQuery('');
      setShowSearch(false);
    }
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

        {showSearch && (
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery}
            onClear={handleSearchClear}
            onFocus={handleSearchFocus}
          />
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.content}>
          {selectedChannel ? (
            <View style={styles.playerContainer}>
              <View style={styles.playerHeader}>
                <Text style={styles.playerChannelName}>{selectedChannel.name}</Text>
                <TouchableOpacity 
                  style={styles.changeChannelBtn}
                  onPress={() => setShowChannelInput(true)}
                >
                  <Text style={styles.changeChannelBtnText}>Cambiar Canal</Text>
                </TouchableOpacity>
              </View>
              <WebView
                key={selectedChannel.id}
                source={{ 
                  html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>body,html{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;} iframe{width:100%;height:100%;border:none;}</style>
                  </head><body><iframe src="${getDirectUrl(selectedChannel.proxy)}" allow="autoplay; fullscreen; fullscreen"></iframe></body></html>`,
                  baseUrl: 'https://www.cablevisionhd.com/' 
                }}
                style={{ flex: 1, backgroundColor: '#000' }}
                userAgent="Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                onLoadStart={() => { setLoading(true); setError(null); }}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
              {loading && <View style={styles.loader}><ActivityIndicator color={COLORS.gold} size="large" /></View>}
              
              {showChannelInput && (
                <ChannelInput 
                  onSubmit={handleChannelChange}
                  onClose={() => setShowChannelInput(false)}
                />
              )}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {!showSearch && (
                <TouchableOpacity 
                  style={styles.searchTrigger}
                  onPress={() => setShowSearch(true)}
                >
                  <ChevronUp color={COLORS.gold} size={30} />
                  <Text style={styles.searchTriggerText}>Buscar canales</Text>
                </TouchableOpacity>
              )}
              <FlatList 
                ref={flatListRef}
                data={filteredChannels} 
                keyExtractor={item => item.id.toString()} 
                renderItem={({ item, index }) => (
                  <TVChannelCard 
                    item={item} 
                    onPress={setSelectedChannel} 
                    isSelected={selectedChannel?.id === item.id}
                    onFocus={handleChannelFocus}
                  />
                )} 
                numColumns={4} 
                contentContainerStyle={styles.list}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
                removeClippedSubviews={true}
                onScrollToIndexFailed={() => {}}
              />
              <TouchableOpacity 
                style={styles.searchTriggerBottom}
                onPress={() => setShowSearch(true)}
              >
                <Text style={styles.searchTriggerText}>Buscar canales</Text>
                <ChevronDown color={COLORS.gold} size={30} />
              </TouchableOpacity>
            </View>
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
  listContainer: { flex: 1 },
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
  playerHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    padding: 15 
  },
  playerChannelName: { color: COLORS.gold, fontSize: 24, fontWeight: 'bold' },
  changeChannelBtn: { 
    backgroundColor: COLORS.gold, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 10 
  },
  changeChannelBtnText: { color: '#000', fontWeight: 'bold' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  errorContainer: { 
    backgroundColor: COLORS.error, 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20 
  },
  errorText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  searchContainer: { marginBottom: 20 },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    borderRadius: 15, 
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: COLORS.gold
  },
  searchInput: { 
    flex: 1, 
    color: '#fff', 
    fontSize: 20, 
    marginLeft: 15 
  },
  searchTrigger: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 15,
    backgroundColor: COLORS.card,
    marginBottom: 10,
    borderRadius: 10
  },
  searchTriggerBottom: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 15,
    backgroundColor: COLORS.card,
    marginTop: 10,
    borderRadius: 10
  },
  searchTriggerText: { color: COLORS.gold, fontSize: 18, marginHorizontal: 10 },
  channelInputContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  channelInputBox: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 30,
    width: '60%',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.gold
  },
  channelInputTitle: { color: COLORS.gold, fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  channelInput: {
    width: '100%',
    backgroundColor: '#222',
    color: '#fff',
    fontSize: 32,
    textAlign: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20
  },
  channelInputButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  channelInputBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10
  },
  channelInputBtnText: { color: '#000', fontWeight: 'bold', fontSize: 18 }
});
