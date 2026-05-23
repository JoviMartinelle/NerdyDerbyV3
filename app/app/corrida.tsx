import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useWindowDimensions, ImageBackground, Image,
  ScrollView,
} from 'react-native';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LogoNerdyDerby from '../assets/images/Logo_Nerdy_Derby.svg';
import LogoFabLab from '../assets/images/Logo_Fab_LAB_Uni_Facens.svg';

type Carrinho = {
  id: string;
  numero: string;
  nomePiloto: string;
  gifUri: string;
};

export default function Corrida() {
  const { circuitoId } = useLocalSearchParams<{ circuitoId: string }>();
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ 'MinhaFonte': require('../assets/fonts/Gamer.ttf') });

  const [nomeCircuito, setNomeCircuito] = useState('');
  const [corNome, setCorNome]           = useState('#ffffff');
  const [fotoFundo, setFotoFundo]       = useState<string | null>(null);
  const [carrinhos, setCarrinhos]       = useState<Carrinho[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [contagem, setContagem]         = useState<string | null>(null);
  const PISTAS = [1, 2, 3];
  const [assignedLanes, setAssignedLanes] = useState<Record<string, number | null>>({});

  const [tempo, setTempo]       = useState(0); // em milissegundos
  const [rodando, setRodando]   = useState(false);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);
  const contagemIntervalo = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const carregar = async () => {
      const json = await AsyncStorage.getItem('circuitos');
      if (json) {
        const lista = JSON.parse(json);
        const c = lista.find((x: any) => x.id === circuitoId);
        if (c) {
          setNomeCircuito(c.nome);
          setCorNome(c.corNome);
          setFotoFundo(c.fotoFundo);
          setCarrinhos(c.carrinhos ?? []);
        }
      }
    };
    carregar();

    return () => {
      if (intervalo.current) clearInterval(intervalo.current);
      limparContagem();
    };
  }, [circuitoId]);

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      // when selecting, optimistically assign first free lane
      setAssignedLanes(prevLanes => {
        const used = Object.values(prevLanes).filter(Boolean) as number[];
        const free = PISTAS.find(p => !used.includes(p)) ?? null;
        return { ...prevLanes, [id]: free };
      });
      return [...prev, id];
    });
  };

  const assignLane = (id: string, pista: number | null) => {
    setAssignedLanes(prev => {
      // if pista is already used by someone else, ignore
      if (pista !== null) {
        const usedBy = Object.entries(prev).find(([k, v]) => v === pista && k !== id);
        if (usedBy) return prev;
      }
      return { ...prev, [id]: pista };
    });
  };

  const iniciarCronometro = () => {
    setRodando(true);
    intervalo.current = setInterval(() => setTempo(t => t + 10), 10);
  };

  const iniciar = () => {
    if (contagem || rodando) return;

    const passos = ['3', '2', '1', 'GO'];
    let indice = 0;
    setContagem(passos[indice]);

    contagemIntervalo.current = setInterval(() => {
      indice += 1;
      if (indice < passos.length) {
        setContagem(passos[indice]);
      } else {
        if (contagemIntervalo.current) clearInterval(contagemIntervalo.current);
        contagemIntervalo.current = null;
        setContagem(null);
        iniciarCronometro();
      }
    }, 800);
  };

  const pausar = () => {
    setRodando(false);
    if (intervalo.current) clearInterval(intervalo.current);
  };

  const resetar = () => {
    pausar();
    setTempo(0);
  };

  function limparContagem() {
    if (contagemIntervalo.current) clearInterval(contagemIntervalo.current);
    contagemIntervalo.current = null;
    setContagem(null);
  }

  const formatar = (ms: number) => {
    const min  = Math.floor(ms / 60000).toString().padStart(2, '0');
    const seg  = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    const cent = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${min}:${seg}.${cent}`;
  };

  if (!fontsLoaded) return null;

  const logoSize = width * 0.03;
  const fabLabW  = width * 0.10;
  const fabLabH  = fabLabW * 0.3;
  const btnW     = width * 0.15;
  const btnH     = btnW * 0.35;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={fotoFundo ? { uri: fotoFundo } : require('../assets/images/Fundo_Tela.png')}
        style={styles.background}
        resizeMode="stretch"
      >
        <View style={styles.overlay} />

        <View style={styles.logoContainer}>
          <LogoNerdyDerby width={logoSize} height={logoSize} />
        </View>

        <Text style={[styles.nomeCircuito, { color: corNome }]}>#{nomeCircuito}</Text>
        <Text style={styles.labelCorrida}>CORRIDA EM ANDAMENTO</Text>

        <View style={styles.mainContent}>
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>PARTICIPANTES</Text>
            <Text style={styles.sidebarSubtitle}>{selecionados.length}/3 selecionados</Text>
            <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sidebarScrollContent}>
              {carrinhos.length === 0 ? (
                <Text style={styles.sidebarEmpty}>Nenhum carrinho inscrito neste circuito.</Text>
              ) : (
                carrinhos.map((c) => {
                  const ativo = selecionados.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.8}
                      style={[styles.sidebarItem, ativo && styles.sidebarItemSelected]}
                      onPress={() => toggleSelecionado(c.id)}
                    >
                      <View style={styles.sidebarItemTextGroup}>
                        <Text style={styles.sidebarItemTexto}>#{c.numero}</Text>
                        <Text style={styles.sidebarItemSubtexto}>{c.nomePiloto}</Text>
                        {ativo ? (
                          <View style={styles.laneRow}>
                            {PISTAS.map(p => {
                              const usedByOther = Object.entries(assignedLanes).find(([k, v]) => v === p && k !== c.id);
                              const selected = assignedLanes[c.id] === p;
                              return (
                                <TouchableOpacity
                                  key={p}
                                  style={[
                                    styles.laneButton,
                                    selected && styles.laneButtonSelected,
                                    usedByOther && !selected && styles.laneButtonDisabled,
                                  ]}
                                  disabled={!!usedByOther && !selected}
                                  onPress={() => assignLane(c.id, selected ? null : p)}
                                >
                                  <Text style={[styles.laneButtonText, selected && styles.laneButtonTextSelected]}>{p}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.sidebarItemBadge}>{ativo ? (assignedLanes[c.id] ? `L${assignedLanes[c.id]}` : '✓') : '○'}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            {carrinhos.length > 0 ? (
              <Text style={styles.sidebarNote}>
                Toque para selecionar até 3 participantes antes de iniciar a corrida.
              </Text>
            ) : null}
          </View>

          <View style={styles.corridaContent}>
            <View style={styles.cronometroBox}>
              <Text style={styles.cronometroTexto}>{formatar(tempo)}</Text>
            </View>

            {contagem ? (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownText}>{contagem}</Text>
              </View>
            ) : null}

            {rodando && selecionados.length > 0 ? (
              <View style={styles.selectedRow}>
                {selecionados.map(id => {
                  const c = carrinhos.find(x => x.id === id);
                  const lane = assignedLanes[id];
                  return (
                    <View key={id} style={styles.selectedCard}>
                      <Text style={styles.selectedLane}>PISTA {lane ?? '-'}</Text>
                      <Text style={styles.selectedNumero}>#{c?.numero}</Text>
                      <Text style={styles.selectedNome}>{c?.nomePiloto}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.controlesRow}>
              {!rodando ? (
                <TouchableOpacity style={[styles.botaoControle, { backgroundColor: 'rgba(0,180,80,0.85)' }]} onPress={iniciar}>
                  <Text style={styles.botaoControleTexto}>▶ INICIAR</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.botaoControle, { backgroundColor: 'rgba(200,100,0,0.85)' }]} onPress={pausar}>
                  <Text style={styles.botaoControleTexto}>⏸ PAUSAR</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.botaoControle, { backgroundColor: 'rgba(180,0,0,0.85)' }]} onPress={resetar}>
                <Text style={styles.botaoControleTexto}>↺ RESET</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.botaoVoltarContainer}>
          <TouchableOpacity onPress={() => { pausar(); router.back(); }}>
            <Image source={require('../assets/images/Botao__Voltar.png')} style={{ width: btnW, height: btnH }} resizeMode="contain" />
          </TouchableOpacity>
        </View>
        <View style={styles.fabLabContainer}>
          <LogoFabLab width={fabLabW} height={fabLabH} />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  logoContainer: { position: 'absolute', top: 20, zIndex: 10 },
  nomeCircuito: { fontSize: 38, fontFamily: 'MinhaFonte', zIndex: 10, marginTop: -60 },
  labelCorrida: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'MinhaFonte', zIndex: 10, marginBottom: 32 },
  cronometroBox: {
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(42,12,172,1)',
    paddingVertical: 32, paddingHorizontal: 48,
    marginBottom: 40, zIndex: 10,
  },
  cronometroTexto: { color: '#fff', fontSize: 64, fontFamily: 'MinhaFonte', letterSpacing: 4 },
  controlesRow: { flexDirection: 'row', gap: 20, zIndex: 10 },
  mainContent: { width: '100%', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 16, paddingTop: 24, zIndex: 10 },
  sidebar: {
    width: 260, maxWidth: '34%', minWidth: 220,
    backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 16, marginBottom: 24,
  },
  sidebarTitle: { color: '#fff', fontSize: 18, fontFamily: 'MinhaFonte', marginBottom: 6 },
  sidebarSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'MinhaFonte', marginBottom: 10 },
  sidebarScroll: { maxHeight: 320 },
  sidebarScrollContent: { paddingBottom: 8 },
  sidebarEmpty: { color: 'rgba(255,255,255,0.6)', fontFamily: 'MinhaFonte', fontSize: 14 },
  sidebarItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  sidebarItemSelected: {
    backgroundColor: 'rgba(0,140,255,0.22)', borderColor: 'rgba(0,190,255,0.45)',
  },
  sidebarItemTextGroup: { flex: 1, marginRight: 10 },
  sidebarItemTexto: { color: '#fff', fontFamily: 'MinhaFonte', fontSize: 14 },
  sidebarItemSubtexto: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'MinhaFonte', marginTop: 2 },
  sidebarItemBadge: { color: '#8de7ff', fontSize: 18, fontFamily: 'MinhaFonte' },
  sidebarNote: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 6, fontFamily: 'MinhaFonte', textAlign: 'center' },
  corridaContent: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  countdownOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', zIndex: 20,
  },
  countdownText: { color: '#fff', fontSize: 64, fontFamily: 'MinhaFonte', letterSpacing: 6 },
  laneRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  laneButton: {
    minWidth: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)'
  },
  laneButtonSelected: { backgroundColor: 'rgba(0,180,80,0.85)', borderColor: 'rgba(0,255,150,0.6)' },
  laneButtonDisabled: { opacity: 0.35 },
  laneButtonText: { color: 'rgba(255,255,255,0.9)', fontFamily: 'MinhaFonte' },
  laneButtonTextSelected: { color: '#fff' },
  selectedRow: { flexDirection: 'row', gap: 14, marginBottom: 18, alignItems: 'center' },
  selectedCard: {
    minWidth: 120, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: 'rgba(10,10,10,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  selectedLane: { color: '#8fe7ff', fontFamily: 'MinhaFonte', fontSize: 13, marginBottom: 6 },
  selectedNumero: { color: '#fff', fontFamily: 'MinhaFonte', fontSize: 20 },
  selectedNome: { color: 'rgba(255,255,255,0.75)', fontFamily: 'MinhaFonte', fontSize: 12, marginTop: 2 },
  botaoControle: {
    borderRadius: 10, paddingVertical: 16, paddingHorizontal: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  botaoControleTexto: { color: '#fff', fontSize: 20, fontFamily: 'MinhaFonte' },
  fabLabContainer: { position: 'absolute', bottom: 24, right: 24, zIndex: 10 },
  botaoVoltarContainer: { position: 'absolute', bottom: 24, left: 28, zIndex: 10 },
});